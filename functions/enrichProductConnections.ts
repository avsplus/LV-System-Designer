import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import { generateConnectionsFromSpec } from './ruleEngine.js';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Parse request
        const body = await req.json();
        const categoryFilter = body.category || null;

        // Get products
        let products = [];
        if (categoryFilter) {
            products = await base44.asServiceRole.entities.AVProduct.filter({ category: categoryFilter });
        } else {
            products = await base44.asServiceRole.entities.AVProduct.list();
        }

        let enriched = 0;
        let failed = 0;
        const errors = [];

        // Process each product sequentially
        for (let i = 0; i < products.length; i++) {
            const product = products[i];
            try {
                const deviceType = product.category;

                // Call LLM
                const specResponse = await base44.integrations.Core.InvokeLLM({
                    prompt: `Extract detailed specifications from ${product.brand} ${product.model}. Return specs as JSON.`,
                    add_context_from_internet: true,
                    response_json_schema: {
                        type: "object",
                        properties: {
                            attributes: { type: "object" }
                        },
                        required: ["attributes"]
                    }
                });

                // Create spec
                const spec = {
                    product_id: product.id,
                    device_type: deviceType,
                    brand: product.brand,
                    model: product.model,
                    attributes: specResponse.attributes || {},
                    confidence_scores: {},
                    source: 'web_search',
                    overall_confidence: 0.5,
                    status: 'pending_review',
                    organization_id: user.organization_id
                };

                const createdSpec = await base44.asServiceRole.entities.DeviceSpec.create(spec);

                // Get rules and generate connections
                const rules = await base44.asServiceRole.entities.ConnectionRule.filter({
                    organization_id: user.organization_id,
                    is_active: true
                });

                const { inputs, outputs } = generateConnectionsFromSpec(createdSpec, rules);

                // Update if have connections
                if (inputs.length > 0 || outputs.length > 0) {
                    await base44.asServiceRole.entities.AVProduct.update(product.id, {
                        input_connections: inputs.map(p => ({ type: p.type, ports: [p.label] })),
                        output_connections: outputs.map(p => ({ type: p.type, ports: [p.label] }))
                    });

                    await base44.asServiceRole.entities.DeviceSpec.update(createdSpec.id, {
                        status: 'approved'
                    });

                    enriched++;
                }
            } catch (error) {
                failed++;
                errors.push(`${product.brand} ${product.model}: ${error.message}`);
            }
        }

        return Response.json({
            success: true,
            total: products.length,
            enriched,
            failed,
            message: `Enriched ${enriched}/${products.length} products`,
            errors: errors.slice(0, 3)
        });

    } catch (error) {
        return Response.json({ 
            error: error.message || String(error)
        }, { status: 500 });
    }
});