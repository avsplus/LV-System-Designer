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
            prompt: `Find 45 popular professional AV (audio/visual) products with 3 products per category across these 15 categories: televisions, projectors, projector_screens, video_distribution, matrix_switchers, audio_streamers, media_streamers, speakers, soundbars, subwoofers, stereo_amps, multizone_amps, surround_processors, av_receivers, and network_switches. 

Include products from brands like: Sony, Samsung, LG, Epson, JVC, Crestron, Control4, Savant, Sonos, Denon, Marantz, Yamaha, KEF, Klipsch, SVS, Ubiquiti, Araknis, Luxul, and other popular AV brands.

For each product provide: brand, model number, category, brief description, approximate price in USD.

CRITICAL: The category field MUST be one of these EXACT values (lowercase with underscores):
televisions, projectors, projector_screens, video_distribution, matrix_switchers, audio_streamers, media_streamers, speakers, soundbars, subwoofers, stereo_amps, multizone_amps, surround_processors, av_receivers, network_switches`,
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

        // Normalize category names and filter out duplicates
        const validCategories = ["televisions", "projectors", "projector_screens", "video_distribution", "matrix_switchers", "audio_streamers", "media_streamers", "speakers", "soundbars", "subwoofers", "stereo_amps", "multizone_amps", "surround_processors", "av_receivers", "network_switches"];
        
        const categoryMapping = {
            "av receivers": "av_receivers",
            "av_receivers": "av_receivers",
            "matrix switchers": "matrix_switchers",
            "matrix switches": "matrix_switchers",
            "matrix_switchers": "matrix_switchers",
            "media streamers": "media_streamers",
            "media_streamers": "media_streamers",
            "multi-zone amps": "multizone_amps",
            "multi zone amps": "multizone_amps",
            "multizone amps": "multizone_amps",
            "multizone_amps": "multizone_amps",
            "network switches": "network_switches",
            "network_switches": "network_switches",
            "projector screens": "projector_screens",
            "projector_screens": "projector_screens",
            "video distribution": "video_distribution",
            "video_distribution": "video_distribution",
            "audio streamers": "audio_streamers",
            "audio_streamers": "audio_streamers",
            "stereo amps": "stereo_amps",
            "stereo_amps": "stereo_amps",
            "surround processors": "surround_processors",
            "surround_processors": "surround_processors"
        };

        const normalizedProducts = products.map(p => {
            let category = p.category.toLowerCase().trim();
            category = categoryMapping[category] || category;
            if (!validCategories.includes(category)) {
                category = "av_receivers"; // fallback
            }
            return { ...p, category };
        });

        const newProducts = normalizedProducts.filter(p => {
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