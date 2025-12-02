import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Port name patterns for each connection type
        const connectionTypePatterns = {
            'HDMI': /hdmi|arc|earc/i,
            'HDBaseT': /hdbaset|hdb/i,
            'Optical': /optical|toslink|spdif/i,
            'Coaxial': /coax/i,
            'RCA': /rca|analog|aux|cd|phono|zone|pre.?out|line/i,
            'XLR': /xlr/i,
            'Speaker Wire': /speaker|front|center|surround|rear|sub|lfe|height|atmos|terminal/i,
            'Subwoofer': /sub|lfe|sw/i,
            'Ethernet': /lan|ethernet|network|rj.?45/i,
            'USB': /usb/i,
            'RS232': /rs.?232|serial/i,
            'IR': /ir|infra/i,
            'Control': /trigger|control|12v/i,
            'Component': /component|ypbpr/i,
            'Composite': /composite|cvbs/i,
            'VGA': /vga|d.?sub/i,
            '3.5mm Jack': /3\.5|headphone|mini.?jack/i
        };

        // Detect correct type for a port name
        const detectPortType = (portName) => {
            if (!portName || typeof portName !== 'string') return null;
            const port = portName.toLowerCase();
            
            // Check each type pattern
            for (const [type, pattern] of Object.entries(connectionTypePatterns)) {
                if (pattern.test(port)) {
                    return type;
                }
            }
            return null;
        };

        // Reorganize connections - group ports by their correct type
        const reorganizeConnections = (connections) => {
            if (!connections || !Array.isArray(connections)) return [];
            
            const typeMap = new Map();
            
            for (const conn of connections) {
                if (!conn.type || !conn.ports || !Array.isArray(conn.ports)) continue;
                
                for (const port of conn.ports) {
                    // Detect what type this port should actually be
                    const correctType = detectPortType(port);
                    const actualType = correctType || conn.type;
                    
                    // Check if port matches its declared type
                    const declaredPattern = connectionTypePatterns[conn.type];
                    const matchesDeclared = declaredPattern && declaredPattern.test(port);
                    const isGenericNumbered = /^(in|out|input|output)?\s*\d+$/i.test(port.trim());
                    
                    // Use declared type if it matches, otherwise use detected type
                    const finalType = (matchesDeclared || isGenericNumbered) ? conn.type : actualType;
                    
                    if (!typeMap.has(finalType)) {
                        typeMap.set(finalType, []);
                    }
                    if (!typeMap.get(finalType).includes(port)) {
                        typeMap.get(finalType).push(port);
                    }
                }
            }
            
            // Convert back to array format
            return Array.from(typeMap.entries()).map(([type, ports]) => ({
                type,
                ports
            }));
        };

        // Get all products
        const products = await base44.asServiceRole.entities.AVProduct.list();
        
        let fixed = 0;
        let checked = 0;

        for (const product of products) {
            checked++;
            let needsUpdate = false;
            const updateData = {};

            // Check and fix input connections
            if (product.input_connections && product.input_connections.length > 0) {
                const reorganized = reorganizeConnections(product.input_connections);
                const originalJson = JSON.stringify(product.input_connections);
                const newJson = JSON.stringify(reorganized);
                
                if (originalJson !== newJson) {
                    updateData.input_connections = reorganized;
                    needsUpdate = true;
                }
            }

            // Check and fix output connections
            if (product.output_connections && product.output_connections.length > 0) {
                const reorganized = reorganizeConnections(product.output_connections);
                const originalJson = JSON.stringify(product.output_connections);
                const newJson = JSON.stringify(reorganized);
                
                if (originalJson !== newJson) {
                    updateData.output_connections = reorganized;
                    needsUpdate = true;
                }
            }

            if (needsUpdate) {
                await base44.asServiceRole.entities.AVProduct.update(product.id, updateData);
                fixed++;
            }
        }

        return Response.json({ 
            success: true,
            checked,
            fixed,
            message: `Cleaned up ${fixed} products with mismatched connections`
        });

    } catch (error) {
        console.error('Cleanup error:', error);
        return Response.json({ 
            error: error.message,
            details: 'Failed to cleanup connections'
        }, { status: 500 });
    }
});