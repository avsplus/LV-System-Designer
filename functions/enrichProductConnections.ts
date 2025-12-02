import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Valid categories from the AVProduct entity schema
        const validCategories = [
            "televisions", "projectors", "projector_screens", "video_distribution", 
            "matrix_switchers", "audio_streamers", "media_streamers", "speakers", 
            "soundbars", "subwoofers", "stereo_amps", "multizone_amps", 
            "surround_processors", "av_receivers", "network_switches", "control_processors",
            "hdmi_extenders"
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
                "hdmiextenders": "hdmi_extenders"
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

        // Process products in batches of 5 to avoid rate limits
        for (let i = 0; i < products.length; i += 5) {
            const batch = products.slice(i, i + 5);
            
            await Promise.all(batch.map(async (product) => {
                try {
                    // Skip if already has connections
                    if (product.input_connections && product.input_connections.length > 0) {
                        return;
                    }

                    // Build manufacturer-specific search query
                    const manufacturerUrls = {
                        "Sony": "sony.com",
                        "Samsung": "samsung.com",
                        "LG": "lg.com",
                        "Epson": "epson.com",
                        "JVC": "jvc.com",
                        "Denon": "denon.com",
                        "Marantz": "marantz.com",
                        "Yamaha": "yamaha.com",
                        "KEF": "kef.com",
                        "Klipsch": "klipsch.com",
                        "SVS": "svsound.com",
                        "Sonos": "sonos.com",
                        "Crestron": "crestron.com",
                        "Control4": "control4.com",
                        "Savant": "savant.com",
                        "RTI": "rticorp.com",
                        "Ubiquiti": "ui.com",
                        "Araknis": "araknisnetworks.com",
                        "Luxul": "luxul.com",
                        "AVPro Edge": "avproedge.com",
                        "Atlona": "atlona.com",
                        "Just Add Power": "justaddpower.com",
                        "Binary": "snapav.com/binary",
                        "Bowers & Wilkins": "bowerswilkins.com",
                        "Bose": "bose.com",
                        "Anthem": "anthemav.com",
                        "NAD": "nadelectronics.com",
                        "Bluesound": "bluesound.com",
                        "Screen Innovations": "screeninnovations.com"
                    };
                    
                    const manufacturerSite = manufacturerUrls[product.brand] || `${product.brand.toLowerCase().replace(/\s+/g, '')}.com`;

                    const response = await base44.integrations.Core.InvokeLLM({
                        prompt: `Find the EXACT specifications for: ${product.brand} ${product.model}

SEARCH PRIORITY (in order):
1. Official manufacturer specs page: site:${manufacturerSite} "${product.model}" specifications
2. Product manual/datasheet PDF from ${product.brand}
3. Professional AV retailer specs (Crutchfield, World Wide Stereo, Audio Advice)

PRODUCT INFO:
Brand: ${product.brand}
Model: ${product.model}
Category: ${product.category}

REQUIRED - Find the EXACT rear panel connections as listed by the manufacturer:

FOR INPUTS - Physical ports that RECEIVE signals:
- HDMI inputs (list each: "HDMI 1", "HDMI 2 (eARC)", etc.)
- Audio inputs: Optical/TOSLINK, Coaxial Digital, RCA (Analog), XLR, 3.5mm
- Network: Ethernet/LAN port
- USB ports
- Legacy: Component, Composite, VGA
- Control: RS-232, IR In

FOR OUTPUTS - Physical ports that SEND signals:
- HDMI outputs (e.g., "HDMI Out 1", "HDMI Out 2")
- Audio outputs: Speaker terminals, Preamp/Line Out, Subwoofer Out, Zone 2 Out
- Optical Out, Headphone jack
- Control: IR Out, 12V Trigger

CONTROL CAPABILITIES:
- IP/Network control (yes/no)
- RS-232 control (yes/no)
- IR control (yes/no)
- 12V Trigger (yes/no)
- Supported protocols: Control4 SDDP, Crestron Connected, IP commands, etc.

IMPORTANT:
- Use EXACT port labels from the manufacturer's specification sheet
- For speaker outputs, list each terminal pair (Front L/R, Center, Surround L/R, etc.)
- Include port counts accurately (e.g., if it has 7 HDMI inputs, list all 7)
- Do NOT guess - only include verified specifications from official sources`,
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

                    // Build update object safely, matching AVProduct schema
                    const updateData = {};

                    // Port name patterns for each connection type
                    const connectionTypePatterns = {
                        'HDMI': /hdmi|arc|earc/i,
                        'HDBaseT': /hdbaset|hdb/i,
                        'Optical': /optical|toslink|spdif/i,
                        'Coaxial': /coax/i,
                        'RCA': /rca|analog|aux|cd|phono|zone|pre.?out|line/i,
                        'XLR': /xlr/i,
                        'Speaker Wire': /speaker|front|center|surround|rear|sub|lfe|height|atmos|zone/i,
                        'Subwoofer': /sub|lfe|sw/i,
                        'Ethernet': /lan|ethernet|network|rj.?45/i,
                        'USB': /usb/i,
                        'RS232': /rs.?232|serial/i,
                        'IR': /ir|infra/i,
                        'Control': /trigger|control|12v/i,
                        'Component': /component|ypbpr/i,
                        'Composite': /composite|cvbs|video/i,
                        'VGA': /vga|d.?sub/i,
                        '3.5mm Jack': /3\.5|headphone|aux|mini/i
                    };

                    // Validate that ports match their connection type
                    const validateConnection = (conn) => {
                        if (!conn.type || !conn.ports || !Array.isArray(conn.ports)) return null;
                        
                        const pattern = connectionTypePatterns[conn.type];
                        if (!pattern) return conn; // Unknown type, keep as-is
                        
                        // Filter ports to only those matching the connection type
                        const validPorts = conn.ports.filter(port => {
                            if (!port || typeof port !== 'string') return false;
                            // Port should match its type OR be a generic numbered port
                            const isGenericNumbered = /^(in|out|input|output)?\s*\d+$/i.test(port.trim());
                            return pattern.test(port) || isGenericNumbered;
                        });
                        
                        if (validPorts.length === 0) return null;
                        return { ...conn, ports: validPorts };
                    };

                    // Always update connections if we got valid data
                    if (response.inputs || response.outputs) {
                        let inputs = Array.isArray(response.inputs) ? response.inputs : [];
                        let outputs = Array.isArray(response.outputs) ? response.outputs : [];
                        
                        // Validate and filter connections
                        inputs = inputs.map(validateConnection).filter(c => c !== null);
                        outputs = outputs.map(validateConnection).filter(c => c !== null);
                        
                        // Validation: Media streamers should not have HDMI inputs
                        if (product.category === 'media_streamers') {
                            inputs = inputs.filter(input => input.type !== 'HDMI');
                        }
                        
                        updateData.input_connections = inputs;
                        updateData.output_connections = outputs;
                    }

                    // Add control capabilities if provided and valid
                    if (response.control && typeof response.control === 'object') {
                        updateData.control = {
                            ip: Boolean(response.control.ip),
                            rs232: Boolean(response.control.rs232),
                            ir: Boolean(response.control.ir),
                            trigger: Boolean(response.control.trigger),
                            protocols: Array.isArray(response.control.protocols) ? response.control.protocols : []
                        };
                    }

                    // Add specs if provided (merge with existing, only update non-empty values)
                    if (response.specs && typeof response.specs === 'object') {
                        const existingSpecs = product.specs || {};
                        const newSpecs = {};
                        
                        // Only include non-empty spec values
                        for (const [key, value] of Object.entries(response.specs)) {
                            if (value && typeof value === 'string' && value.trim()) {
                                newSpecs[key] = value.trim();
                            }
                        }
                        
                        // Merge with existing specs
                        if (Object.keys(newSpecs).length > 0) {
                            updateData.specs = { ...existingSpecs, ...newSpecs };
                        }
                    }

                    // Only update if we have data to update
                    if (Object.keys(updateData).length > 0) {
                        await base44.asServiceRole.entities.AVProduct.update(product.id, updateData);
                        enriched++;
                    }

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