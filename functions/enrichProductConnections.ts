import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import { generateConnectionsFromSpec } from './ruleEngine.js';

Deno.serve(async (req) => {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
        return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const categoryFilter = body.category;

    console.log('[DEBUG] enrichProductConnections v3 - Request received with category:', categoryFilter);

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

    console.log(`[DEBUG] Found ${products.length} products to process`);
    debugLogs.push(`Starting enrichment with ${products.length} products`);

    for (const product of products) {
        try {
            debugLogs.push(`\n=== Processing ${product.brand} ${product.model} ===`);
            console.log(`[DEBUG] Processing product: ${product.brand} ${product.model}`);
            
            // Call LLM to extract specs
            console.log('[DEBUG] Calling LLM for specs extraction...');
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

            console.log('[DEBUG] LLM response:', llmResponse);

            if (!llmResponse || !llmResponse.attributes) {
                const msg = `${product.brand} ${product.model}: No specs extracted`;
                console.log('[DEBUG]', msg);
                debugLogs.push(msg);
                failedProducts.push(msg);
                continue;
            }
            
            debugLogs.push(`Got attributes: ${JSON.stringify(llmResponse.attributes)}`);
            console.log('[DEBUG] LLM attributes:', llmResponse.attributes);

            // Create DeviceSpec
            console.log('[DEBUG] Creating DeviceSpec...');
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
            
            console.log('[DEBUG] DeviceSpec created with ID:', deviceSpec.id);
            debugLogs.push(`Created DeviceSpec: ${deviceSpec.id}`);

            // Get all active rules
            console.log('[DEBUG] Fetching ConnectionRules...');
            const allRules = await base44.asServiceRole.entities.ConnectionRule.list();
            console.log(`[DEBUG] Got ${allRules.length} total rules`);
            debugLogs.push(`Found ${allRules.length} total rules`);
            
            const activeRules = allRules.filter(r => r.is_active);
            console.log(`[DEBUG] Filtered to ${activeRules.length} active rules`);
            debugLogs.push(`Filtered to ${activeRules.length} active rules`);

            // Generate connections
            console.log('[DEBUG] Generating connections from rules...');
            const { inputs, outputs } = generateConnectionsFromSpec(deviceSpec, activeRules);
            console.log(`[DEBUG] Generated ${inputs.length} inputs, ${outputs.length} outputs`);
            debugLogs.push(`Generated ${inputs.length} inputs, ${outputs.length} outputs`);

            if (inputs.length > 0 || outputs.length > 0) {
                console.log('[DEBUG] Enriching product with connections...');
                debugLogs.push(`Enriching ${product.brand} ${product.model}`);
                
                // Update product
                await base44.asServiceRole.entities.AVProduct.update(product.id, {
                    input_connections: inputs.map(p => ({ type: p.type, ports: [p.label] })),
                    output_connections: outputs.map(p => ({ type: p.type, ports: [p.label] }))
                });
                
                console.log('[DEBUG] Product updated');

                // Mark spec as approved
                await base44.asServiceRole.entities.DeviceSpec.update(deviceSpec.id, {
                    status: 'approved'
                });
                
                console.log('[DEBUG] DeviceSpec marked as approved');

                enriched++;
                debugLogs.push(`✓ Successfully enriched`);
            } else {
                debugLogs.push(`⚠ No connections generated (no rules matched)`);
            }
        } catch (error) {
            console.error('[ERROR]', error.message, error.stack);
            failedProducts.push(`${product.brand} ${product.model}: ${error.message}`);
            debugLogs.push(`✗ Error: ${error.message}`);
        }
    }

    console.log(`[DEBUG] Enrichment complete: ${enriched} products enriched, ${failedProducts.length} failed`);

    return Response.json({
        success: true,
        total: products.length,
        enriched,
        failed: failedProducts.length,
        failedProducts: failedProducts.slice(0, 5),
        debug: debugLogs
    });
});