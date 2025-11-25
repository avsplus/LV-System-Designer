import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Fetch existing products to avoid duplicates
        const existingProducts = await base44.asServiceRole.entities.AVProduct.list();
        const existingKeys = new Set(existingProducts.map(p => `${p.brand.toLowerCase()}-${p.model.toLowerCase()}`));

        // Use LLM with web search to get current AV products
        const response = await base44.integrations.Core.InvokeLLM({
            prompt: `Find 30 popular professional AV (audio/visual) products across these categories: televisions, projectors, projector_screens, video_distribution, matrix_switchers, audio_streamers, media_streamers, speakers, soundbars, subwoofers, stereo_amps, multizone_amps, surround_processors, av_receivers, and network_switches. 

Include products from brands like: Sony, Samsung, LG, Epson, JVC, Crestron, Control4, Savant, RTI, Sonos, Denon, Marantz, Yamaha, KEF, Bowers & Wilkins, Klipsch, SVS, Cisco, Netgear, Ubiquiti, TP-Link, and other popular AV brands.

For network_switches, include managed switches suitable for AV installations with PoE support.

For each product, provide accurate current information including brand, model number, category, description, approximate price in USD, and any available product image URLs.

IMPORTANT: The category field MUST be one of these exact values (use underscores, not spaces):
- televisions
- projectors
- projector_screens
- video_distribution
- matrix_switchers
- audio_streamers
- media_streamers
- speakers
- soundbars
- subwoofers
- stereo_amps
- multizone_amps
- surround_processors
- av_receivers
- network_switches

Return a diverse mix across all categories including at least 2-3 network switches.`,
            add_context_from_internet: true,
            response_json_schema: {
                type: "object",
                properties: {
                    products: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                brand: { type: "string" },
                                model: { type: "string" },
                                category: { 
                                    type: "string",
                                    enum: ["televisions", "projectors", "projector_screens", "video_distribution", "matrix_switchers", "audio_streamers", "media_streamers", "speakers", "soundbars", "subwoofers", "stereo_amps", "multizone_amps", "surround_processors", "av_receivers", "network_switches"]
                                },
                                description: { type: "string" },
                                price: { type: "number" },
                                image_url: { type: "string" },
                                input_connections: {
                                    type: "array",
                                    items: {
                                        type: "object",
                                        properties: {
                                            type: { type: "string" },
                                            ports: { type: "array", items: { type: "string" } }
                                        },
                                        required: ["type", "ports"]
                                    }
                                },
                                output_connections: {
                                    type: "array",
                                    items: {
                                        type: "object",
                                        properties: {
                                            type: { type: "string" },
                                            ports: { type: "array", items: { type: "string" } }
                                        },
                                        required: ["type", "ports"]
                                    }
                                }
                            },
                            required: ["brand", "model", "category"]
                        }
                    }
                },
                required: ["products"]
            }
        });

        const products = response.products || [];

        // Filter out duplicates based on brand + model
        const newProducts = products.filter(p => {
            const key = `${p.brand.toLowerCase()}-${p.model.toLowerCase()}`;
            return !existingKeys.has(key);
        });

        // Store products in database
        if (newProducts.length > 0) {
            await base44.asServiceRole.entities.AVProduct.bulkCreate(newProducts);
        }

        return Response.json({ 
            success: true, 
            productsFound: newProducts.length,
            skippedDuplicates: products.length - newProducts.length,
            products: newProducts 
        });

    } catch (error) {
        console.error('Scrape error:', error);
        return Response.json({ 
            error: error.message,
            stack: error.stack,
            details: 'Failed to scrape Portal.io. Please check your credentials or the site structure may have changed.'
        }, { status: 500 });
    }
});