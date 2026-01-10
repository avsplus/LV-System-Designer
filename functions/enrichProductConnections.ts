import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import { generateConnectionsFromSpec } from './ruleEngine.js';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Device type mapping from category to device_type
        const deviceTypeMap = {
            'televisions': 'television',
            'projectors': 'projector',
            'av_receivers': 'av_receiver',
            'speakers': 'speaker',
            'soundbars': 'soundbar',
            'subwoofers': 'subwoofer',
            'network_switches': 'network_switch',
            'routers': 'router',
            'access_points': 'access_point',
            'matrix_switchers': 'matrix_switcher',
            'audio_streamers': 'audio_streamer',
            'media_streamers': 'media_streamer'
        };

        // Valid categories from the AVProduct entity schema
        const validCategories = [
            "televisions", "projectors", "projector_screens", "video_distribution", 
            "matrix_switchers", "audio_streamers", "media_streamers", "speakers", 
            "soundbars", "subwoofers", "stereo_amps", "multizone_amps", 
            "surround_processors", "av_receivers", "network_switches", "routers",
            "control_processors", "hdmi_extenders", "access_points", "patch_panels", "data_jacks",
            "telephones", "phone_jacks", "intercoms", "nvrs", "ip_cameras"
        ];

        // Get filter from request body
        let categoryFilter = null;
        let searchBrand = null;
        let searchModel = null;
        let searchMode = 'category';
        try {
            const body = await req.json();
            searchMode = body.mode || 'category';
            categoryFilter = body.category || null;
            searchBrand = body.brand || null;
            searchModel = body.model || null;
        } catch (e) {
            // No body or invalid JSON, proceed without filter
        }

        // Normalize category function
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
                "routers": "routers",
                "access_points": "access_points",
                "accesspoints": "access_points",
                "patch_panels": "patch_panels",
                "patchpanels": "patch_panels",
                "data_jacks": "data_jacks",
                "datajacks": "data_jacks",
                "telephones": "telephones",
                "phone_jacks": "phone_jacks",
                "phonejacks": "phone_jacks",
                "intercoms": "intercoms",
                "nvrs": "nvrs",
                "nvr": "nvrs",
                "ip_cameras": "ip_cameras",
                "ipcameras": "ip_cameras",
                "ipcams": "ip_cameras"
            };
            
            return categoryMapping[normalized] || normalized;
        };

        // Get products from database, filtered by category or brand/model
        let products;
        if (searchMode === 'search' && searchBrand) {
            // Filter by brand (and optionally model)
            const allProducts = await base44.asServiceRole.entities.AVProduct.list();
            products = allProducts.filter(p => {
                const brandMatch = p.brand?.toLowerCase().includes(searchBrand.toLowerCase());
                if (!searchModel) return brandMatch;
                const modelMatch = p.model?.toLowerCase().includes(searchModel.toLowerCase());
                return brandMatch && modelMatch;
            });
        } else if (categoryFilter && validCategories.includes(categoryFilter)) {
            products = await base44.asServiceRole.entities.AVProduct.filter({ category: categoryFilter });
        } else {
            products = await base44.asServiceRole.entities.AVProduct.list();
        }

        let enriched = 0;
        let failed = 0;
        let categoryFixed = 0;

        // First pass: fix any products with invalid categories
        for (const product of products) {
            const normalizedCat = normalizeCategory(product.category);
            if (normalizedCat !== product.category && validCategories.includes(normalizedCat)) {
                try {
                    await base44.asServiceRole.entities.AVProduct.update(product.id, { category: normalizedCat });
                    product.category = normalizedCat; // Update local copy
                    categoryFixed++;
                } catch (e) {
                    console.error(`Failed to fix category for ${product.brand} ${product.model}:`, e);
                }
            }
        }

        // Process products in batches
        for (let i = 0; i < products.length; i += 5) {
            const batch = products.slice(i, i + 5);
            
            await Promise.all(batch.map(async (product) => {
                try {
                    // Step 1: Extract specs from LLM
                    const deviceType = deviceTypeMap[product.category] || product.category;
                    console.log(`[${product.brand} ${product.model}] Starting enrichment with deviceType: ${deviceType}`);
                    
                    console.log(`[${product.brand} ${product.model}] Calling LLM to extract specs...`);
                    const specResponse = await base44.integrations.Core.InvokeLLM({
                        prompt: `Extract detailed specifications from the ${product.brand} ${product.model} (${product.category}).

                    Return ONLY factual specifications found in official datasheets, NOT assumptions.
                    If you cannot find a specific spec, set it to null.
                    Be precise with port counts and types.

                    For each specification:
                    - Set to actual number/value if found
                    - Set to null if not found or if unsure (confidence < 0.7)
                    - Never guess port counts

                    Common attributes by device type:
                    - network_switch: ethernet_ports (count), ethernet_speed (1G/10G/25G), sfp_ports, managed, poe
                    - av_receiver: hdmi_inputs, hdmi_outputs, analog_audio_inputs, analog_audio_outputs, channels, speaker_outputs, subwoofer_output, has_ip_control, has_rs232_control
                    - speaker: type (passive/active/powered), impedance, frequency_response
                    - soundbar: has_subwoofer_output, hdmi_inputs, hdmi_outputs, audio_inputs`,
                        add_context_from_internet: true,
                        response_json_schema: {
                            type: "object",
                            properties: {
                                attributes: {
                                    type: "object",
                                    description: "Device attributes (specs only)"
                                },
                                confidence_scores: {
                                    type: "object",
                                    description: "Confidence for each attribute (0-1)"
                                },
                                source: {
                                    type: "string",
                                    enum: ["manufacturer_page", "datasheet", "manual", "web_search"],
                                    description: "Source of specs"
                                },
                                overall_confidence: {
                                    type: "number",
                                    description: "Overall confidence (0-1)"
                                }
                            },
                            required: ["attributes"]
                        }
                    });
                    console.log(`[${product.brand} ${product.model}] LLM response:`, JSON.stringify(specResponse));

                    // Step 2: Create DeviceSpec record
                    const spec = {
                        product_id: product.id,
                        device_type: deviceType,
                        brand: product.brand,
                        model: product.model,
                        attributes: specResponse.attributes || {},
                        confidence_scores: specResponse.confidence_scores || {},
                        source: specResponse.source || 'web_search',
                        overall_confidence: specResponse.overall_confidence || 0.5,
                        status: 'pending_review',
                        organization_id: user.organization_id
                    };

                    console.log(`[${product.brand} ${product.model}] Spec extracted, creating DeviceSpec record...`);
                    const createdSpec = await base44.asServiceRole.entities.DeviceSpec.create(spec);
                    console.log(`[${product.brand} ${product.model}] DeviceSpec created with attributes:`, JSON.stringify(spec.attributes));

                    // Step 3: Apply connection rules to generate connections
                    const rules = await base44.asServiceRole.entities.ConnectionRule.filter({
                        organization_id: user.organization_id,
                        is_active: true
                    });

                    const { inputs, outputs } = generateConnectionsFromSpec(createdSpec, rules);

                    // Step 4: Update product with generated connections and mark spec approved
                    if (inputs.length > 0 || outputs.length > 0) {
                        await base44.asServiceRole.entities.AVProduct.update(product.id, {
                            input_connections: inputs.map(p => ({
                                type: p.type,
                                ports: [p.label]
                            })),
                            output_connections: outputs.map(p => ({
                                type: p.type,
                                ports: [p.label]
                            }))
                        });

                        await base44.asServiceRole.entities.DeviceSpec.update(createdSpec.id, {
                            status: 'approved'
                        });

                        enriched++;
                    }

                } catch (error) {
                    console.error(`[${product.brand} ${product.model}] Error:`, error.message || error);
                    console.error(`Stack:`, error.stack);
                    failed++;
                }
            }));
        }

        return Response.json({ 
            success: true,
            total: products.length,
            enriched,
            failed,
            categoryFixed,
            categoryFilter: categoryFilter || 'all',
            message: `Enriched ${enriched} products with connection data${categoryFixed > 0 ? `, fixed ${categoryFixed} category names` : ''}${categoryFilter ? ` (category: ${categoryFilter})` : ''}`
        });

    } catch (error) {
        console.error('Enrichment error:', error);
        return Response.json({ 
            error: error.message,
            details: 'Failed to enrich products with connection data'
        }, { status: 500 });
    }
});