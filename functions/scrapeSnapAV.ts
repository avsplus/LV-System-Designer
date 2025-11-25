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
            prompt: `Find 45 popular professional AV (audio/visual) products with 3 products per category across these 16 categories: televisions,control_processors, projectors, projector_screens, video_distribution, matrix_switchers, audio_streamers, media_streamers, speakers, soundbars, subwoofers, stereo_amps, multizone_amps, surround_processors, av_receivers, and network_switches. 

Include products from brands like: Sony, Samsung, LG, Epson, JVC, RTI, Crestron, Control4, Savant, Sonos, Denon, Marantz, Yamaha, KEF, Klipsch, SVS, Ubiquiti, Araknis, Luxul, and other popular AV brands.

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
                                    enum: ["televisions",control_processors, "projectors", "projector_screens", "video_distribution", "matrix_switchers", "audio_streamers", "media_streamers", "speakers", "soundbars", "subwoofers", "stereo_amps", "multizone_amps", "surround_processors", "av_receivers", "network_switches"]
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
        const validCategories = ["televisions", "projectors", "projector_screens", "video_distribution", "matrix_switchers", "audio_streamers", "media_streamers", "speakers", "soundbars", "subwoofers", "stereo_amps", "multizone_amps", "surround_processors", "av_receivers", "network_switches", "control_processors"];
        
        // Normalize any category format to snake_case
        const normalizeCategory = (cat) => {
            if (!cat) return null;
            // Convert to lowercase, replace spaces/hyphens with underscores, remove extra chars
            let normalized = cat.toLowerCase().trim()
                .replace(/[\s-]+/g, '_')  // spaces and hyphens to underscores
                .replace(/[^a-z_]/g, ''); // remove non-alpha chars except underscore
            
            // Handle specific mappings
            const categoryMapping = {
                "av_receivers": "av_receivers",
                "avreceivers": "av_receivers",
                "matrix_switchers": "matrix_switchers",
                "matrixswitchers": "matrix_switchers",
                "matrix_switches": "matrix_switchers",
                "matrixswitches": "matrix_switchers",
                "media_streamers": "media_streamers",
                "mediastreamers": "media_streamers",
                "multizone_amps": "multizone_amps",
                "multizoneamps": "multizone_amps",
                "multi_zone_amps": "multizone_amps",
                "network_switches": "network_switches",
                "networkswitches": "network_switches",
                "projector_screens": "projector_screens",
                "projectorscreens": "projector_screens",
                "video_distribution": "video_distribution",
                "videodistribution": "video_distribution",
                "audio_streamers": "audio_streamers",
                "audiostreamers": "audio_streamers",
                "stereo_amps": "stereo_amps",
                "stereoamps": "stereo_amps",
                "surround_processors": "surround_processors",
                "surroundprocessors": "surround_processors",
                "control_processors": "control_processors",
                "controlprocessors": "control_processors"
            };
            
            return categoryMapping[normalized] || normalized;
        };

        const normalizedProducts = products.map(p => {
            let category = normalizeCategory(p.category);
            if (!validCategories.includes(category)) {
                console.log(`Invalid category "${p.category}" -> "${category}", skipping product`);
                return null; // Skip products with invalid categories instead of defaulting
            }
            return { ...p, category };
        }).filter(p => p !== null);

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