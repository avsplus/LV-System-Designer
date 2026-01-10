import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import { generateConnectionsFromSpec } from './ruleEngine.js';

Deno.serve(async (req) => {
    // Force cache bust: version 2.1 - added detailed logging
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
        return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const categoryFilter = body.category;

    console.log('[DEBUG] Request received with category:', categoryFilter);

    // Fetch products
    let products = [];
    if (categoryFilter) {
        products = await base44.asServiceRole.entities.AVProduct.filter({ category: categoryFilter });
    } else {
        products = await base44.asServiceRole.entities.AVProduct.list();
    }

    let enriched = 0;
    const failedProducts = [];
    const debugLogs = [];

    console.log(`[DEBUG] Found ${products.length} products`);
    debugLogs.push(`Starting with ${products.length} products`);

    for (const product of products) {
        try {
            debugLogs.push(`Processing ${product.brand} ${product.model}`);
            // Call LLM to extract specs
            const llmResponse = await base44.integrations.Core.InvokeLLM({
                prompt: `Extract detailed technical specifications for: ${product.brand} ${product.model}. Include ethernet_ports, sfp_ports, hdmi_inputs, hdmi_outputs, etc. as applicable.`,
                add_context_from_internet: true,
                response_json_schema: {
                    type: "object",
                    properties: {
                        attributes: {
                            type: "object",
                            properties: {
                                ethernet_ports: { type: "integer" },
                                sfp_ports: { type: "integer" },
                                hdmi_inputs: { type: "integer" },
                                hdmi_outputs: { type: "integer" }
                            }
                        }
                    },
                    required: ["attributes"]
                }
            });

            if (!llmResponse || !llmResponse.attributes) {
                const msg = `${product.brand} ${product.model}: No specs extracted`;
                debugLogs.push(msg);
                failedProducts.push(msg);
                continue;
            }
            
            debugLogs.push(`Got attributes: ${JSON.stringify(llmResponse.attributes)}`);

            // Create DeviceSpec
            const deviceSpec = await base44.asServiceRole.entities.DeviceSpec.create({
                product_id: product.id,
                device_type: product.category,
                brand: product.brand,
                model: product.model,
                attributes: llmResponse.attributes,
                confidence_scores: {},
                source: 'web_search',
                overall_confidence: 0.7,
                status: 'pending_review',
                organization_id: user.organization_id
            });

            // Get all active rules
            const allRules = await base44.asServiceRole.entities.ConnectionRule.list();
            console.log(`[DEBUG] Got ${allRules.length} total rules`);
            const activeRules = allRules.filter(r => r.is_active);
            console.log(`[DEBUG] Filtered to ${activeRules.length} active rules`);

            // Generate connections
            const { inputs, outputs } = generateConnectionsFromSpec(deviceSpec, activeRules);
            console.log(`[DEBUG] Generated connections: ${inputs.length} inputs, ${outputs.length} outputs`);
            
            debugLogs.push(`Generated ${inputs.length} inputs, ${outputs.length} outputs`);

            if (inputs.length > 0 || outputs.length > 0) {
                debugLogs.push(`Enriching ${product.brand} ${product.model}`);
                // Update product
                await base44.asServiceRole.entities.AVProduct.update(product.id, {
                    input_connections: inputs.map(p => ({ type: p.type, ports: [p.label] })),
                    output_connections: outputs.map(p => ({ type: p.type, ports: [p.label] }))
                });

                // Mark spec as approved
                await base44.asServiceRole.entities.DeviceSpec.update(deviceSpec.id, {
                    status: 'approved'
                });

                enriched++;
            }
        } catch (error) {
            failedProducts.push(`${product.brand} ${product.model}: ${error.message}`);
        }
    }

    return Response.json({
        success: true,
        total: products.length,
        enriched,
        failed: failedProducts.length,
        failedProducts: failedProducts.slice(0, 3),
        debug: debugLogs
    });
});