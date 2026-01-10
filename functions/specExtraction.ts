/**
 * Spec Extraction Function
 * Extracts structured specs only (no connection generation)
 * LLM outputs facts, not logic
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const { product_id, brand, model, category } = body;

        if (!product_id || !brand || !model || !category) {
            return Response.json({ 
                error: 'Missing required fields: product_id, brand, model, category' 
            }, { status: 400 });
        }

        // Map category to device_type
        const deviceTypeMap = {
            'network_switches': 'network_switch',
            'routers': 'router',
            'access_points': 'access_point',
            'av_receivers': 'av_receiver',
            'speakers': 'speaker',
            'soundbars': 'soundbar',
            'subwoofers': 'subwoofer',
            'televisions': 'television',
            'projectors': 'projector',
            'matrix_switchers': 'matrix_switcher',
            'audio_streamers': 'audio_streamer',
            'media_streamers': 'media_streamer'
        };

        const deviceType = deviceTypeMap[category] || category;

        // Use LLM to extract ONLY specs, not logic
        const extractionPrompt = `Extract detailed specifications from the ${brand} ${model} (${category}). 

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
- soundbar: has_subwoofer_output, hdmi_inputs, hdmi_outputs, audio_inputs`;

        const response = await base44.integrations.Core.InvokeLLM({
            prompt: extractionPrompt,
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

        // Create DeviceSpec record
        const spec = {
            product_id,
            device_type: deviceType,
            brand,
            model,
            attributes: response.attributes || {},
            confidence_scores: response.confidence_scores || {},
            source: response.source || 'web_search',
            overall_confidence: response.overall_confidence || 0.5,
            status: 'pending_review',
            organization_id: user.organization_id
        };

        const createdSpec = await base44.asServiceRole.entities.DeviceSpec.create(spec);

        return Response.json({
            success: true,
            spec: createdSpec
        });

    } catch (error) {
        console.error('Spec extraction error:', error);
        return Response.json({
            error: error.message,
            details: 'Failed to extract specs'
        }, { status: 500 });
    }
});