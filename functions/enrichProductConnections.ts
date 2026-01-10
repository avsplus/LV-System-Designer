import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import { generateConnectionsFromSpec } from './ruleEngine.js';

const initMsg = 'ENRICH_FUNCTION_LOADED_AT_' + new Date().toISOString();
console.log(initMsg);

Deno.serve(async (req) => {
    const logs = [];
    logs.push('ENRICH_REQUEST_RECEIVED');
    
    try {
        logs.push('enrichProductConnections called');
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            await Deno.writeTextFile('/tmp/enrich.log', logs.join('\n'));
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }
        logs.push('User authenticated: ' + user.email);

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
            console.log('Request body parsed:', { searchMode, categoryFilter, searchBrand, searchModel });
        } catch (e) {
            // No body or invalid JSON, proceed without filter
            console.log('No request body or parse error:', e.message);
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
         console.log('About to fetch products...');
         let products;
         if (searchMode === 'search' && searchBrand) {
            // Filter by brand (and optionally model)
            console.log(`Search mode: brand="${searchBrand}", model="${searchModel}"`);
            const allProducts = await base44.asServiceRole.entities.AVProduct.list();
            console.log(`Total products in DB: ${allProducts.length}`);
            products = allProducts.filter(p => {
                const brandMatch = p.brand?.toLowerCase().includes(searchBrand.toLowerCase());
                if (!searchModel) return brandMatch;
                const modelMatch = p.model?.toLowerCase().includes(searchModel.toLowerCase());
                return brandMatch && modelMatch;
            });
            console.log(`Found ${products.length} matching products`);
        } else if (categoryFilter && validCategories.includes(categoryFilter)) {
            console.log(`Fetching products for category: ${categoryFilter}`);
            products = await base44.asServiceRole.entities.AVProduct.filter({ category: categoryFilter });
            console.log(`Fetched ${products.length} products for category`);
        } else {
            console.log('Fetching all products');
            products = await base44.asServiceRole.entities.AVProduct.list();
            console.log(`Fetched ${products.length} total products`);
        }

        console.log(`Total products to process: ${products.length}`);
        let enriched = 0;
        let failed = 0;
        let categoryFixed = 0;

        // Write debug info to file
        const debugLog = `Products to process: ${products.length}\n`;
        await Deno.writeTextFile('/tmp/enrichment_debug.log', debugLog, { append: true });

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

        // Process products sequentially to avoid timeouts
        console.log(`Starting enrichment of ${products.length} products`);

        // Log to file
        const loopDebug = `Starting loop with ${products.length} products\n`;
        await Deno.writeTextFile('/tmp/enrichment_debug.log', loopDebug, { append: true });

        for (let idx = 0; idx < products.length; idx++) {
            const product = products[idx];
            const msg = `[${idx+1}/${products.length}] Processing: ${product.brand} ${product.model}`;
            console.log(msg);
            await Deno.writeTextFile('/tmp/enrichment_debug.log', msg + '\n', { append: true });

            try {
                const deviceType = deviceTypeMap[product.category] || product.category;
                console.log(`  Device type: ${deviceType}`);

                // Step 1: Extract specs from LLM
                console.log(`  Calling LLM...`);
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
                 console.log(`LLM response received with attributes:`, Object.keys(specResponse.attributes || {}));

                 // Step 2: Create DeviceSpec record
                 console.log(`Creating DeviceSpec...`);
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

                 const createdSpec = await base44.asServiceRole.entities.DeviceSpec.create(spec);
                 console.log(`DeviceSpec created: ${createdSpec.id}`);

                 // Step 3: Apply connection rules
                 console.log(`Applying connection rules...`);
                 const rules = await base44.asServiceRole.entities.ConnectionRule.filter({
                     organization_id: user.organization_id,
                     is_active: true
                 });
                 console.log(`Found ${rules.length} active rules`);

                 const { inputs, outputs } = generateConnectionsFromSpec(createdSpec, rules);
                 console.log(`Generated ${inputs.length} inputs, ${outputs.length} outputs`);

                 // Step 4: Update product
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
                     console.log(`✓ Enriched: ${product.brand} ${product.model}`);
                 } else {
                     console.log(`⊘ No connections generated for ${product.brand} ${product.model}`);
                 }

             } catch (error) {
                 console.error(`✗ Failed: ${product.brand} ${product.model} - ${error.message}`);
                 failed++;
             }
         }
         console.log(`\nEnrichment complete: ${enriched} enriched, ${failed} failed`);

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