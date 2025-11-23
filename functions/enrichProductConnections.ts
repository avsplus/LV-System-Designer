import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Get all products from database
        const products = await base44.asServiceRole.entities.AVProduct.list();

        let enriched = 0;
        let failed = 0;

        // Process products in batches of 5 to avoid rate limits
        for (let i = 0; i < products.length; i += 5) {
            const batch = products.slice(i, i + 5);
            
            await Promise.all(batch.map(async (product) => {
                try {
                    // Skip if already has connections
                    if (product.connections && product.connections.inputs) {
                        return;
                    }

                    const response = await base44.integrations.Core.InvokeLLM({
                        prompt: `Find the exact connection ports and specifications for this specific AV product:
Brand: ${product.brand}
Model: ${product.model}
Category: ${product.category}

Search the web for the official specifications and provide:
1. All INPUT connection types and their specific port labels (e.g., "HDMI-1", "HDMI-2", "RCA-L", "RCA-R")
2. All OUTPUT connection types and their specific port labels

Be specific about port counts and labels. If it's a receiver with 6 HDMI inputs, list them as HDMI-1 through HDMI-6.

Connection types can include: HDMI, Optical, RCA, XLR, Speaker Wire, Ethernet, USB, Coaxial, 3.5mm Jack, and others.`,
                        add_context_from_internet: true,
                        response_json_schema: {
                            type: "object",
                            properties: {
                                inputs: {
                                    type: "array",
                                    items: {
                                        type: "object",
                                        properties: {
                                            type: { type: "string" },
                                            ports: {
                                                type: "array",
                                                items: { type: "string" }
                                            }
                                        },
                                        required: ["type", "ports"]
                                    }
                                },
                                outputs: {
                                    type: "array",
                                    items: {
                                        type: "object",
                                        properties: {
                                            type: { type: "string" },
                                            ports: {
                                                type: "array",
                                                items: { type: "string" }
                                            }
                                        },
                                        required: ["type", "ports"]
                                    }
                                }
                            },
                            required: ["inputs", "outputs"]
                        }
                    });

                    // Update product with connection info
                    await base44.asServiceRole.entities.AVProduct.update(product.id, {
                        connections: {
                            inputs: response.inputs || [],
                            outputs: response.outputs || []
                        }
                    });

                    enriched++;
                } catch (error) {
                    console.error(`Failed to enrich ${product.brand} ${product.model}:`, error);
                    failed++;
                }
            }));
        }

        return Response.json({ 
            success: true,
            total: products.length,
            enriched,
            failed,
            message: `Enriched ${enriched} products with connection data`
        });

    } catch (error) {
        console.error('Enrichment error:', error);
        return Response.json({ 
            error: error.message,
            details: 'Failed to enrich products with connection data'
        }, { status: 500 });
    }
});