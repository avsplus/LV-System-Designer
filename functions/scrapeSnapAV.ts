import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Parse request body for category filter
        let selectedCategory = null;
        try {
            const body = await req.json();
            selectedCategory = body.category || null;
        } catch (e) {
            // No body or invalid JSON, import all categories
        }

        // Fetch existing products to avoid duplicates
        const existingProducts = await base44.asServiceRole.entities.AVProduct.list();
        const existingKeys = new Set(existingProducts.map(p => `${p.brand.toLowerCase()}-${p.model.toLowerCase()}`));

        // All valid categories
        const allCategories = ["televisions", "projectors", "projector_screens", "video_distribution", "matrix_switchers", "audio_streamers", "media_streamers", "speakers", "soundbars", "subwoofers", "stereo_amps", "multizone_amps", "surround_processors", "av_receivers", "network_switches", "control_processors", "hdmi_extenders"];
        
        // Determine which categories to import
        const categoriesToImport = selectedCategory && selectedCategory !== 'all' 
            ? [selectedCategory] 
            : allCategories;

        const categoryList = categoriesToImport.join(', ');
        const productCount = selectedCategory && selectedCategory !== 'all' ? 10 : 34;

        // Use LLM with web search to get current AV products
        const response = await base44.integrations.Core.InvokeLLM({
            prompt: `Find ${productCount} popular professional AV products across these categories: ${categoryList}.

Brands: Sony, Samsung, LG, Epson, JVC, RTI, Crestron, Control4, Savant, Sonos, Denon, Marantz, Yamaha, KEF, Klipsch, SVS, Ubiquiti, Araknis, Luxul, AVPro Edge, Atlona, Just Add Power, Binary.

For hdmi_extenders category: include HDBaseT extender kits, AVoIP encoders/decoders, HDMI over Cat6 kits.

For each: brand, model, category (use exact category name from the list), description (short), price in USD.`,
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
                                category: { type: "string" },
                                description: { type: "string" },
                                price: { type: "number" }
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
        const validCategories = allCategories;
        
        // Normalize any category format to snake_case
        const normalizeCategory = (cat) => {
            if (!cat) return null;
            let normalized = cat.toLowerCase().trim()
                .replace(/[\s-]+/g, '_')
                .replace(/[^a-z_]/g, '');
            
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
                "controlprocessors": "control_processors",
                "hdmi_extenders": "hdmi_extenders",
                "hdmiextenders": "hdmi_extenders",
                "hdmi_extender": "hdmi_extenders",
                "hdbasetext": "hdmi_extenders",
                "hdbaset_extenders": "hdmi_extenders",
                "avoip": "hdmi_extenders"
            };
            
            return categoryMapping[normalized] || normalized;
        };

        const normalizedProducts = products.map(p => {
            let category = normalizeCategory(p.category);
            if (!validCategories.includes(category)) {
                console.log(`Invalid category "${p.category}" -> "${category}", skipping product`);
                return null;
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
            details: 'Failed to import products.'
        }, { status: 500 });
    }
});