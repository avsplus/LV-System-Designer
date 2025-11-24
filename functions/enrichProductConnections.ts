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
                        prompt: `You are an expert AV systems integrator. Find the EXACT connection ports, technical specifications, and control capabilities for this specific AV product by cross-referencing multiple authoritative sources:

Brand: ${product.brand}
Model: ${product.model}
Category: ${product.category}

CRITICAL INSTRUCTIONS:
1. Search for the official manufacturer's specification sheet, user manual, and datasheet
2. Cross-reference with at least 2-3 authoritative sources (manufacturer site, professional AV retailers like Crutchfield, authorized dealer specs)
3. Verify information consistency across sources before reporting
4. If sources conflict, use the manufacturer's official documentation

Provide COMPLETE and ACCURATE information:

CONNECTION PORTS:
- List ALL physical input/output ports with their EXACT labels as shown on the device
- Include all connection types: HDMI, Optical/TOSLINK, RCA, XLR, Speaker Wire, Ethernet, USB, Coaxial, 3.5mm Jack, Component, Composite, VGA, RS232, HDBaseT, IR, etc.
- Be precise: "HDMI 1 (ARC)", "Optical In 1", "USB-A Front Panel", etc.

CONTROL CAPABILITIES:
- IP Control (network controllable via Ethernet)
- RS232 Control
- IR Control
- 12V Trigger ports
- List specific control protocols if mentioned (e.g., "Control4 certified", "Crestron compatible", "IP control via telnet port 23")

TECHNICAL SPECS:
- Power consumption
- Impedance (for audio equipment)
- Frequency response
- Dimensions and weight
- Any other relevant technical specifications

Only include verified information. If you cannot verify a specification from multiple sources, omit it.`,
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
                                },
                                control: {
                                    type: "object",
                                    properties: {
                                        ip: { type: "boolean" },
                                        rs232: { type: "boolean" },
                                        ir: { type: "boolean" },
                                        trigger: { type: "boolean" },
                                        protocols: {
                                            type: "array",
                                            items: { type: "string" }
                                        }
                                    }
                                },
                                specs: {
                                    type: "object",
                                    properties: {
                                        power: { type: "string" },
                                        impedance: { type: "string" },
                                        frequency_response: { type: "string" },
                                        connectivity: { type: "string" },
                                        dimensions: { type: "string" },
                                        weight: { type: "string" }
                                    }
                                }
                            },
                            required: ["inputs", "outputs"]
                        }
                    });

                    // Update product with enriched connection info, control capabilities, and specs
                    const updateData = {
                        connections: {
                            inputs: response.inputs || [],
                            outputs: response.outputs || []
                        }
                    };

                    // Add control capabilities if provided
                    if (response.control) {
                        updateData.control = response.control;
                    }

                    // Add specs if provided (merge with existing)
                    if (response.specs) {
                        updateData.specs = {
                            ...(product.specs || {}),
                            ...response.specs
                        };
                    }

                    await base44.asServiceRole.entities.AVProduct.update(product.id, updateData);

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