import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Parse request body for search params
        let selectedCategory = null;
        let searchBrand = null;
        let searchModel = null;
        let searchMode = 'category';
        try {
            const body = await req.json();
            searchMode = body.mode || 'category';
            selectedCategory = body.category || null;
            searchBrand = body.brand || null;
            searchModel = body.model || null;
        } catch (e) {
            // No body or invalid JSON, import all categories
        }

        // Fetch existing products to avoid duplicates
        const existingProducts = await base44.asServiceRole.entities.AVProduct.list();
        const existingKeys = new Set(existingProducts.map(p => `${p.brand.toLowerCase()}-${p.model.toLowerCase()}`));

        // All valid categories
        const allCategories = ["televisions", "projectors", "projector_screens", "video_distribution", "matrix_switchers", "audio_streamers", "media_streamers", "speakers", "soundbars", "subwoofers", "stereo_amps", "multizone_amps", "surround_processors", "av_receivers", "network_switches", "control_processors", "hdmi_extenders", "access_points", "patch_panels", "data_jacks", "telephones", "phone_jacks", "intercoms", "nvrs", "ip_cameras"];
        
        // Determine which categories to import
        const categoriesToImport = selectedCategory && selectedCategory !== 'all' 
            ? [selectedCategory] 
            : allCategories;

        // Handle brand/model search mode
        if (searchMode === 'search' && searchBrand) {
            const searchQuery = searchModel 
                ? `${searchBrand} ${searchModel}`
                : `${searchBrand} AV products`;
            
            const productCount = searchModel ? 1 : 10;

            const response = await base44.integrations.Core.InvokeLLM({
                prompt: `Find ${productCount} ${searchQuery} product(s). Search the web for official specifications.

${searchModel ? `Find the EXACT product: ${searchBrand} ${searchModel}` : `Find popular ${searchBrand} AV products from these categories: televisions, projectors, AV receivers, speakers, soundbars, control processors, etc.`}

For each product provide:
- brand: exact brand name
- model: exact model number
- category: one of [televisions, projectors, projector_screens, video_distribution, matrix_switchers, audio_streamers, media_streamers, speakers, soundbars, subwoofers, stereo_amps, multizone_amps, surround_processors, av_receivers, network_switches, control_processors, hdmi_extenders]
- description: brief product description
- price: estimated USD price
- installation_manual_url: URL to official installation PDF (if found)
- user_manual_url: URL to official user manual PDF (if found)

CATEGORY RULES:
- AV Receivers have built-in amplification (Denon AVR, Yamaha RX = av_receivers)
- Surround Processors have NO amplification (Marantz AV10 = surround_processors)
- Control Processors are automation systems (Crestron, Control4, RTI, Savant = control_processors)
- Media Streamers are video devices (Apple TV, Roku = media_streamers)
- Audio Streamers are audio-only (Sonos Port = audio_streamers)`,
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
                                    price: { type: "number" },
                                    installation_manual_url: { type: "string" },
                                    user_manual_url: { type: "string" }
                                },
                                required: ["brand", "model", "category"]
                            }
                        }
                    },
                    required: ["products"]
                }
            });

            const products = response.products || [];
            
            // Filter and normalize
            const normalizeCategory = (cat) => {
                if (!cat) return null;
                let normalized = cat.toLowerCase().trim().replace(/[\s-]+/g, '_').replace(/[^a-z_]/g, '');
                const mapping = {
                    "av_receivers": "av_receivers", "avreceivers": "av_receivers",
                    "matrix_switchers": "matrix_switchers", "matrixswitchers": "matrix_switchers",
                    "media_streamers": "media_streamers", "mediastreamers": "media_streamers",
                    "multizone_amps": "multizone_amps", "multizoneamps": "multizone_amps",
                    "network_switches": "network_switches", "networkswitches": "network_switches",
                    "projector_screens": "projector_screens", "projectorscreens": "projector_screens",
                    "video_distribution": "video_distribution", "videodistribution": "video_distribution",
                    "audio_streamers": "audio_streamers", "audiostreamers": "audio_streamers",
                    "stereo_amps": "stereo_amps", "stereoamps": "stereo_amps",
                    "surround_processors": "surround_processors", "surroundprocessors": "surround_processors",
                    "control_processors": "control_processors", "controlprocessors": "control_processors",
                    "hdmi_extenders": "hdmi_extenders", "hdmiextenders": "hdmi_extenders"
                };
                return mapping[normalized] || normalized;
            };

            const normalizedProducts = products.map(p => ({
                ...p,
                category: normalizeCategory(p.category),
                organization_id: user.organization_id
            })).filter(p => allCategories.includes(p.category));

            const newProducts = normalizedProducts.filter(p => {
                const key = `${p.brand.toLowerCase()}-${p.model.toLowerCase()}`;
                return !existingKeys.has(key);
            });

            if (newProducts.length > 0) {
                await base44.asServiceRole.entities.AVProduct.bulkCreate(newProducts);
            }

            return Response.json({ 
                success: true, 
                productsFound: newProducts.length,
                skippedDuplicates: products.length - newProducts.length,
                searchQuery,
                products: newProducts 
            });
        }

        const categoryList = categoriesToImport.join(', ');
        const productCount = selectedCategory && selectedCategory !== 'all' ? 10 : 34;

        // Category definitions with examples to help LLM classify correctly
        const categoryDefinitions = {
            televisions: "TVs, displays, monitors - devices that DISPLAY video (Samsung QN85, LG C3, Sony Bravia)",
            projectors: "Video projectors only - devices that PROJECT an image (Epson, JVC, Sony VPL)",
            projector_screens: "Motorized/fixed screens for projectors (Screen Innovations, Da-Lite, Stewart)",
            video_distribution: "HDMI splitters, distribution amplifiers - splits ONE source to MULTIPLE displays (Binary, Atlona)",
            matrix_switchers: "Video matrices - routes MULTIPLE sources to MULTIPLE displays (Crestron DM, AVPro MXNet)",
            audio_streamers: "Network audio players, streaming DACs - receives audio over network (Sonos Port, Bluesound Node)",
            media_streamers: "Streaming video devices - Apple TV, Roku, NVIDIA Shield, Amazon Fire TV",
            speakers: "Passive or active loudspeakers - requires amplification or self-powered (KEF, Klipsch, Bowers)",
            soundbars: "All-in-one speaker bars with built-in amplification (Sonos Arc, Samsung HW, Bose)",
            subwoofers: "Low frequency speakers only - dedicated bass (SVS, REL, Klipsch)",
            stereo_amps: "2-channel amplifiers only (Marantz, McIntosh, NAD)",
            multizone_amps: "Multi-room/multi-zone amplifiers with 4+ channels (Sonance, Origin, HTD)",
            surround_processors: "Preamp/processors WITHOUT built-in amplification (Marantz AV10, Anthem AVM)",
            av_receivers: "Receivers WITH built-in amplification - all-in-one surround (Denon AVR, Yamaha RX, Marantz)",
            network_switches: "Ethernet switches, managed switches (Ubiquiti, Araknis, Luxul, Cisco)",
            control_processors: "Home automation processors (Crestron, Control4, RTI, Savant)",
            hdmi_extenders: "HDMI over Cat6/HDBaseT extenders, AVoIP encoders/decoders (AVPro Edge, Atlona, Just Add Power)"
        };

        const categoryExamples = categoriesToImport.map(cat => `${cat}: ${categoryDefinitions[cat]}`).join('\n');

        // Use LLM with web search to get current AV products
        const response = await base44.integrations.Core.InvokeLLM({
            prompt: `Find ${productCount} popular professional AV products. You MUST categorize each product EXACTLY according to these definitions:

CATEGORY DEFINITIONS (use ONLY these exact category names):
${categoryExamples}

CRITICAL CLASSIFICATION RULES:
- AV Receivers have BUILT-IN amplification (Denon AVR-X3800H = av_receivers)
- Surround Processors have NO amplification, just processing (Marantz AV10 = surround_processors)
- Media Streamers are VIDEO streaming devices (Apple TV, Roku = media_streamers)
- Audio Streamers are AUDIO-ONLY network players (Sonos Port = audio_streamers)
- Video Distribution SPLITS one source to many displays
- Matrix Switchers ROUTE multiple sources to multiple displays
- Speakers are loudspeakers (NOT soundbars, NOT subwoofers)
- Control Processors are automation systems (Crestron, Control4)

Brands to include: Sony, Samsung, LG, Epson, JVC, RTI, Crestron, Control4, Savant, Sonos, Denon, Marantz, Yamaha, KEF, Klipsch, SVS, Ubiquiti, Araknis, Luxul, AVPro Edge, Atlona, Just Add Power, Binary, Screen Innovations.

For each product provide: brand, model, category (EXACT name from list above), description (brief), price in USD.

ALSO for each product, search for official PDF manuals:
- installation_manual_url: Direct URL to the official installation/quick start guide PDF from the manufacturer
- user_manual_url: Direct URL to the official user/owner's manual PDF from the manufacturer

Search patterns to find manuals:
- site:brand.com "model" filetype:pdf installation
- site:brand.com "model" filetype:pdf manual
- Only include URLs that end in .pdf and are from official manufacturer sites`,
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
                                price: { type: "number" },
                                installation_manual_url: { type: "string" },
                                user_manual_url: { type: "string" }
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