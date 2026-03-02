/**
 * Generate Connections From Rules
 * Takes an approved DeviceSpec and applies matching ConnectionRules
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { generateConnectionsFromSpec } from './ruleEngine.js';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const { spec_id, product_id } = body;

        if (!spec_id || !product_id) {
            return Response.json({
                error: 'Missing required fields: spec_id, product_id'
            }, { status: 400 });
        }

        // Get the spec
        const spec = await base44.asServiceRole.entities.DeviceSpec.filter({
            id: spec_id,
            organization_id: user.organization_id
        });

        if (!spec || spec.length === 0) {
            return Response.json({ error: 'Spec not found' }, { status: 404 });
        }

        const deviceSpec = spec[0];

        // Get all active rules for this organization
        const rules = await base44.asServiceRole.entities.ConnectionRule.filter({
            organization_id: user.organization_id,
            is_active: true
        });

        // Apply rules to generate connections
        const { inputs, outputs } = generateConnectionsFromSpec(deviceSpec, rules);

        // Get the product to update
        const product = await base44.asServiceRole.entities.AVProduct.filter({
            id: product_id,
            organization_id: user.organization_id
        });

        if (!product || product.length === 0) {
            return Response.json({ error: 'Product not found' }, { status: 404 });
        }

        // Update product with generated connections
        await base44.asServiceRole.entities.AVProduct.update(product[0].id, {
            input_connections: inputs.map(p => ({
                type: p.type,
                ports: [p.label]
            })),
            output_connections: outputs.map(p => ({
                type: p.type,
                ports: [p.label]
            }))
        });

        // Mark spec as approved
        await base44.asServiceRole.entities.DeviceSpec.update(spec_id, {
            status: 'approved'
        });

        return Response.json({
            success: true,
            inputs,
            outputs,
            message: `Generated ${inputs.length} input and ${outputs.length} output connections`
        });

    } catch (error) {
        console.error('Connection generation error:', error);
        return Response.json({
            error: error.message,
            details: 'Failed to generate connections'
        }, { status: 500 });
    }
});