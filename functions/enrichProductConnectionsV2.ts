import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

// Device type validation function - comprehensive categorization correction
function correctDeviceType(detectedType, brand, model) {
  const productNameLower = `${brand} ${model}`.toLowerCase();
  
  // === TV / Display Detection ===
  const tvIndicators = [
    '4k uhd led',
    'led-backlit lcd',
    'oled tv',
    'qled',
    'mini-led',
    'inch tv',
    'inch display',
    'inch monitor',
    'bravia',
    'qn85',
    'qn90',
    'c3 oled',
    'a95l',
    'fw-'
  ];
  if (tvIndicators.some(ind => productNameLower.includes(ind))) {
    return 'televisions';
  }

  // === Touch Panel / Control Processor Detection ===
  const touchPanelIndicators = [
    'touch panel',
    'touch screen',
    'in-wall touch',
    '-inch in-wall',
    'kx7',
    'kx10',
    't4 ',
    't7 ',
    'tc-',
    'touch display'
  ];
  if (touchPanelIndicators.some(ind => productNameLower.includes(ind))) {
    return 'control_processors';
  }

  // === Router Detection ===
  const routerIndicators = [
    'dream machine',
    'edge router',
    'core router',
    'unified router',
    'gateway',
    'security gateway',
    'firewall router'
  ];
  if (routerIndicators.some(ind => productNameLower.includes(ind))) {
    return 'routers';
  }

  // === Network Switch Detection ===
  const switchIndicators = [
    'ethernet switch',
    'managed switch',
    'poe switch',
    'gigabit switch',
    'network switch',
    'switch -',
    'switch (',
    '-port switch',
    '-port gigabit'
  ];
  if (switchIndicators.some(ind => productNameLower.includes(ind))) {
    return 'network_switches';
  }

  // === Access Point Detection ===
  const accessPointIndicators = [
    'access point',
    'wireless access',
    'wifi access',
    'ap-',
    ' ap ',
    '-ap-',
    ' ap)',
    'wireless ap',
    'wap',
    'access-point',
    'unifi ap',
    'dream machine pro'
  ];
  if (accessPointIndicators.some(ind => productNameLower.includes(ind))) {
    return 'access_points';
  }

  // === Projector Detection ===
  const projectorIndicators = [
    '4k projector',
    'laser projector',
    'dlp projector',
    '3lcd projector',
    'projector ',
    'vpl-',
    'epson eb-',
    'jvc dla-'
  ];
  if (projectorIndicators.some(ind => productNameLower.includes(ind))) {
    return 'projectors';
  }

  // === AV Receiver Detection (has amplification) ===
  const avReceiverIndicators = [
    'avr-',
    'rx-',
    'av receiver',
    'audio receiver',
    'home theater receiver',
    'surround receiver'
  ];
  if (avReceiverIndicators.some(ind => productNameLower.includes(ind))) {
    return 'av_receivers';
  }

  // === Surround Processor Detection (no amplification) ===
  const processorIndicators = [
    'surround processor',
    'preamp processor',
    'av processor',
    'processor no amp'
  ];
  if (processorIndicators.some(ind => productNameLower.includes(ind))) {
    return 'surround_processors';
  }

  // === Speaker Detection ===
  const speakerIndicators = [
    'passive speaker',
    'active speaker',
    'bookshelf speaker',
    'floor speaker',
    'tower speaker'
  ];
  if (speakerIndicators.some(ind => productNameLower.includes(ind))) {
    return 'speakers';
  }

  // === Soundbar Detection ===
  const soundbarIndicators = [
    'soundbar',
    'sound bar',
    'hw-',
    'arc'
  ];
  if (soundbarIndicators.some(ind => productNameLower.includes(ind))) {
    return 'soundbars';
  }

  // === Subwoofer Detection ===
  const subwooferIndicators = [
    'subwoofer',
    'sub-',
    'bass',
    'low frequency'
  ];
  if (subwooferIndicators.some(ind => productNameLower.includes(ind))) {
    return 'subwoofers';
  }

  return detectedType;
}

// === INLINE RULE ENGINE ===
function matchesCondition(value, condition) {
  if (condition === null || condition === undefined) {
    return value === null || value === undefined;
  }

  if (typeof condition === 'object' && !Array.isArray(condition)) {
    if ('$gt' in condition) return value > condition.$gt;
    if ('$gte' in condition) return value >= condition.$gte;
    if ('$lt' in condition) return value < condition.$lt;
    if ('$lte' in condition) return value <= condition.$lte;
    if ('$eq' in condition) return value === condition.$eq;
    if ('$ne' in condition) return value !== condition.$ne;
    if ('$in' in condition) return condition.$in.includes(value);
    if ('$nin' in condition) return !condition.$nin.includes(value);
    if ('$exists' in condition) {
      const exists = value !== null && value !== undefined;
      return condition.$exists ? exists : !exists;
    }
    return false;
  }

  return value === condition;
}

function getValueByPath(obj, path) {
  if (!path) return undefined;
  const keys = path.split('.');
  let value = obj;
  for (const key of keys) {
    if (value && typeof value === 'object') {
      value = value[key];
    } else {
      return undefined;
    }
  }
  return value;
}

function ruleMatches(spec, ifCondition) {
  if (!ifCondition || typeof ifCondition !== 'object') {
    return true;
  }

  for (const [key, condition] of Object.entries(ifCondition)) {
    let value = getValueByPath(spec, key);
    if (value === undefined && key.startsWith('attributes.')) {
      const attrKey = key.substring('attributes.'.length);
      value = spec.attributes ? spec.attributes[attrKey] : undefined;
    }
    
    const matches = matchesCondition(value, condition);
    console.log(`[DEBUG-RULE] Checking ${key}: value=${value}, condition=${JSON.stringify(condition)}, matches=${matches}`);
    
    if (!matches) {
      return false;
    }
  }

  return true;
}

function generatePortsFromRule(spec, rule) {
  const ports = [];

  console.log(`[DEBUG-GEN] Testing rule: ${JSON.stringify(rule.if)}`);
  if (!ruleMatches(spec, rule.if)) {
    console.log(`[DEBUG-GEN] Rule did not match`);
    return ports;
  }
  console.log(`[DEBUG-GEN] Rule matched!`);

  const { then: action } = rule;
  
  let portCount = 0;
  if (action.fixed_count !== undefined && action.fixed_count !== null) {
    portCount = action.fixed_count;
  } else if (action.count_from) {
    portCount = getValueByPath(spec, action.count_from) || 0;
  }

  if (portCount <= 0) {
    return ports;
  }

  // Get capacity if specified
  let capacity = 1; // Default: 1-to-1
  if (action.capacity_from) {
    capacity = getValueByPath(spec, action.capacity_from) || 1;
  }

  for (let i = 1; i <= portCount; i++) {
    const label = action.label_format.replace('{n}', i);
    // Generate stable ID from type and index
    const id = action.id_format 
      ? action.id_format.replace('{n}', i)
      : `${action.type.toLowerCase().replace(/\s+/g, '-')}-${i}`;
    
    ports.push({
      id,
      label,
      type: action.type,
      direction: action.direction || 'bidirectional',
      category: action.port_category || 'general',
      source: 'rule_engine',
      capacity,
      auto_generated: true
    });
  }

  return ports;
}

function mergeConnectionsByType(existing, generated, debugLogs = []) {
  // Create map of existing connections by type
  const byType = new Map();
  
  (existing || []).forEach(conn => {
    byType.set(conn.type, {
      ...conn,
      ports: conn.ports || [],
      port_data: conn.port_data || []
    });
  });

  // Merge generated ports into existing by type
  (generated || []).forEach(genConn => {
    if (byType.has(genConn.type)) {
      // Type exists - merge ports by ID using port_data
      const existing = byType.get(genConn.type);
      const existingPortsById = new Map(
        (existing.port_data || [])
          .map(p => [p.id, p])
      );

      // Add/update auto-generated ports, preserve user-modified ports
      (genConn.port_data || []).forEach(genPort => {
        if (genPort.auto_generated) {
          // Always update auto-generated ports
          existingPortsById.set(genPort.id, genPort);
        } else if (!existingPortsById.has(genPort.id)) {
          // Add new non-auto-generated ports
          existingPortsById.set(genPort.id, genPort);
        }
      });

      const mergedPorts = Array.from(existingPortsById.values());
      byType.set(genConn.type, {
        type: genConn.type,
        ports: mergedPorts.map(p => p.label), // Store labels as strings
        port_data: mergedPorts,
        capacity: genConn.capacity || existing.capacity
      });
      
      debugLogs.push(`  Merged ${genConn.type}: ${mergedPorts.length} total ports`);
    } else {
      // New type - add it
      byType.set(genConn.type, genConn);
      debugLogs.push(`  Added new type ${genConn.type}: ${(genConn.ports || []).length} ports`);
    }
  });

  // Remove port_data before returning (not saved to entity)
  return Array.from(byType.values()).map(conn => ({
    type: conn.type,
    ports: conn.ports,
    capacity: conn.capacity
  }));
}

function generateConnectionsFromSpec(spec, allRules) {
  if (!spec || !allRules) {
    return { inputs: [], outputs: [], ruleLogs: [] };
  }

  const deviceType = spec.device_type;
  const ruleLogs = [];
  ruleLogs.push(`Device type: ${deviceType}, Total rules: ${allRules.length}`);

  const applicableRules = allRules.filter(ruleSet => {
    if (!ruleSet.applies_to) {
      ruleLogs.push(`Rule "${ruleSet.name}" has no applies_to`);
      return false;
    }
    
    const { device_type } = ruleSet.applies_to;
    ruleLogs.push(`Rule "${ruleSet.name}" applies_to: ${JSON.stringify(device_type)}`);
    
    if (Array.isArray(device_type)) {
      const matches = device_type.includes(deviceType);
      ruleLogs.push(`  → Array check for ${deviceType}: ${matches}`);
      return matches;
    }
    
    const matches = device_type === deviceType;
    ruleLogs.push(`  → String check ${device_type} === ${deviceType}: ${matches}`);
    return matches;
  });

  ruleLogs.push(`Found ${applicableRules.length} applicable rules`);

  const allRulesFlat = applicableRules.flatMap(ruleSet => ruleSet.rules || []);

  const allPorts = [];
  const sortedRules = [...allRulesFlat].sort((a, b) => (b.priority || 0) - (a.priority || 0));

  ruleLogs.push(`Total individual rules to check: ${sortedRules.length}`);
  for (const rule of sortedRules) {
    if (!rule.is_active) {
      ruleLogs.push(`  Rule skipped (not active): ${JSON.stringify(rule.if)}`);
      continue;
    }
    
    ruleLogs.push(`  Checking rule: ${JSON.stringify(rule.if)}`);
    const ports = generatePortsFromRule(spec, rule);
    ruleLogs.push(`    Generated ${ports.length} ports`);
    allPorts.push(...ports);
  }

  // For bidirectional ports, only add to inputs (to avoid duplicate dots on canvas)
  const inputs = allPorts.filter(p => p.direction === 'input' || p.direction === 'bidirectional');
  const outputs = allPorts.filter(p => p.direction === 'output');

  return { inputs, outputs, ruleLogs };
}
// === END INLINE RULE ENGINE ===

Deno.serve(async (req) => {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
        return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { mode, category, brand, model } = body;

    console.log('[DEBUG] enrichProductConnectionsV2 - Request received:', { mode, category, brand, model });

    // Fetch products based on mode
    let products = [];
    if (mode === 'search') {
        // Search by brand/model
        const filter = {};
        if (brand) {
            filter.brand = { $regex: brand, $options: 'i' };
        }
        if (model) {
            filter.model = { $regex: model, $options: 'i' };
        }
        console.log('[DEBUG] Searching with filter:', filter);
        products = await base44.asServiceRole.entities.AVProduct.filter(filter);
    } else if (mode === 'category') {
        // Filter by category
        if (category) {
            products = await base44.asServiceRole.entities.AVProduct.filter({ category });
        } else {
            products = await base44.asServiceRole.entities.AVProduct.list();
        }
    } else {
        // Legacy: just category filter
        if (body.category) {
            products = await base44.asServiceRole.entities.AVProduct.filter({ category: body.category });
        } else {
            products = await base44.asServiceRole.entities.AVProduct.list();
        }
    }

    let enriched = 0;
    const failedProducts = [];
    const debugLogs = [];

    console.log(`[DEBUG] Found ${products.length} products to process`);
    debugLogs.push(`Starting enrichment with ${products.length} products`);

    for (const product of products) {
        try {
            debugLogs.push(`\n=== Processing ${product.brand} ${product.model} ===`);
            console.log(`[DEBUG] Processing product: ${product.brand} ${product.model}`);
            
            // Call LLM to extract specs AND device type
            console.log('[DEBUG] Calling LLM for specs extraction...');
            const llmResponse = await base44.integrations.Core.InvokeLLM({
                prompt: `Extract detailed technical specifications and device type for: ${product.brand} ${product.model}. 

            IMPORTANT: Determine the CORRECT device_type:
            - "access_point": Wireless access point, Wi-Fi access point (standalone), NOT a switch
            - "network_switch": Ethernet switch for wired connections with Ethernet ports
            - Check if product name/description contains: "wireless", "wifi", "access point", "AP" → device_type should be "access_point"
            - Check if product is primarily for wired Ethernet connections → device_type should be "network_switch"

            Include ethernet_ports, sfp_ports, hdmi_inputs, hdmi_outputs, and device_type as applicable.`,
                add_context_from_internet: true,
                response_json_schema: {
                    type: "object",
                    properties: {
                        device_type: { 
                            type: "string",
                            enum: ["access_point", "network_switch", "router", "other"]
                        },
                        attributes: {
                            type: "object",
                            properties: {
                                ethernet_ports: { type: "integer" },
                                sfp_ports: { type: "integer" },
                                hdmi_inputs: { type: "integer" },
                                hdmi_outputs: { type: "integer" }
                            }
                        }
                    },
                    required: ["attributes"]
                }
            });

            console.log('[DEBUG] LLM response:', llmResponse);

            if (!llmResponse || !llmResponse.attributes) {
                const msg = `${product.brand} ${product.model}: No specs extracted`;
                console.log('[DEBUG]', msg);
                debugLogs.push(msg);
                failedProducts.push(msg);
                continue;
            }

            // Use LLM-detected device type if available, otherwise use product category
            let detectedDeviceType = llmResponse.device_type || product.category;

            // Validate and correct device type using the validation function
            const correctedDeviceType = correctDeviceType(detectedDeviceType, product.brand, product.model);
            if (correctedDeviceType !== detectedDeviceType) {
              console.log(`[DEBUG] Correcting device_type from ${detectedDeviceType} to ${correctedDeviceType}`);
              debugLogs.push(`⚠ Corrected device_type from ${detectedDeviceType} to ${correctedDeviceType}`);
              detectedDeviceType = correctedDeviceType;
            }

            debugLogs.push(`Got attributes: ${JSON.stringify(llmResponse.attributes)}`);
            debugLogs.push(`Device type: ${detectedDeviceType}`);
            console.log('[DEBUG] LLM attributes:', llmResponse.attributes);

            // Create DeviceSpec
            console.log('[DEBUG] Creating DeviceSpec...');
            const deviceSpec = await base44.asServiceRole.entities.DeviceSpec.create({
                product_id: product.id,
                device_type: detectedDeviceType,
                brand: product.brand,
                model: product.model,
                attributes: llmResponse.attributes,
                confidence_scores: {},
                source: 'web_search',
                overall_confidence: 0.7,
                status: 'pending_review',
                organization_id: user.organization_id
            });
            
            console.log('[DEBUG] DeviceSpec created with ID:', deviceSpec.id);
            debugLogs.push(`Created DeviceSpec: ${deviceSpec.id}`);

            // Get all active rules
            console.log('[DEBUG] Fetching ConnectionRules...');
            const allRules = await base44.asServiceRole.entities.ConnectionRule.list();
            console.log(`[DEBUG] Got ${allRules.length} total rules`);
            debugLogs.push(`Found ${allRules.length} total rules`);
            
            const activeRules = allRules.filter(r => r.is_active);
            console.log(`[DEBUG] Filtered to ${activeRules.length} active rules`);
            debugLogs.push(`Filtered to ${activeRules.length} active rules`);

            // Generate connections
                        console.log('[DEBUG] Generating connections from rules...');
                        const genResult = generateConnectionsFromSpec(deviceSpec, activeRules);
                        const { inputs, outputs } = genResult;
                        console.log(`[DEBUG] Generated ${inputs.length} inputs, ${outputs.length} outputs`);
                        debugLogs.push(`Generated ${inputs.length} inputs, ${outputs.length} outputs`);
                        if (genResult.ruleLogs) {
                          genResult.ruleLogs.forEach(log => debugLogs.push(`  ${log}`));
                        }

            if (inputs.length > 0 || outputs.length > 0) {
                console.log('[DEBUG] Enriching product with connections...');
                debugLogs.push(`Enriching ${product.brand} ${product.model}`);
                
                // Validate inputs and outputs have matching types
                const inputTypes = new Set(inputs.map(p => p.type));
                const outputTypes = new Set(outputs.map(p => p.type));
                const invalidInputs = inputs.filter(p => !p.type || !p.label || !p.id);
                const invalidOutputs = outputs.filter(p => !p.type || !p.label || !p.id);
                
                if (invalidInputs.length > 0 || invalidOutputs.length > 0) {
                    const msg = `Validation failed: Invalid ports detected (missing type, label, or id)`;
                    console.log('[DEBUG]', msg);
                    debugLogs.push(`⚠ ${msg}`);
                    failedProducts.push(`${product.brand} ${product.model}: ${msg}`);
                    continue;
                }
                
                // Group ports by type (store labels as strings for entity schema, preserve IDs internally)
                const groupedInputs = inputs.reduce((acc, p) => {
                    const existing = acc.find(c => c.type === p.type);
                    if (existing) {
                        existing.ports.push(p.label);
                        existing.port_data = existing.port_data || [];
                        existing.port_data.push(p);
                    } else {
                        acc.push({ 
                          type: p.type, 
                          ports: [p.label], 
                          port_data: [p],
                          capacity: p.capacity 
                        });
                    }
                    return acc;
                }, []);
                
                const groupedOutputs = outputs.reduce((acc, p) => {
                    const existing = acc.find(c => c.type === p.type);
                    if (existing) {
                        existing.ports.push(p.label);
                        existing.port_data = existing.port_data || [];
                        existing.port_data.push(p);
                    } else {
                        acc.push({ 
                          type: p.type, 
                          ports: [p.label],
                          port_data: [p],
                          capacity: p.capacity 
                        });
                    }
                    return acc;
                }, []);
                
                debugLogs.push(`Grouped connections: ${groupedInputs.length} input types, ${groupedOutputs.length} output types`);
                
                // Merge with existing connections instead of replacing (idempotent enrichment)
                const mergedInputs = mergeConnectionsByType(product.input_connections || [], groupedInputs, debugLogs);
                const mergedOutputs = mergeConnectionsByType(product.output_connections || [], groupedOutputs, debugLogs);
                
                debugLogs.push(`After merge: ${mergedInputs.length} input types, ${mergedOutputs.length} output types`);
                
                // Update product with merged connections
                await base44.asServiceRole.entities.AVProduct.update(product.id, {
                    input_connections: mergedInputs,
                    output_connections: mergedOutputs
                });
                
                console.log('[DEBUG] Product updated');

                // Mark spec as approved
                await base44.asServiceRole.entities.DeviceSpec.update(deviceSpec.id, {
                    status: 'approved'
                });
                
                console.log('[DEBUG] DeviceSpec marked as approved');

                enriched++;
                debugLogs.push(`✓ Successfully enriched`);
            } else {
                debugLogs.push(`⚠ No connections generated (no rules matched)`);
            }
        } catch (error) {
            console.error('[ERROR]', error.message, error.stack);
            failedProducts.push(`${product.brand} ${product.model}: ${error.message}`);
            debugLogs.push(`✗ Error: ${error.message}`);
        }
    }
    

    console.log(`[DEBUG] Enrichment complete: ${enriched} products enriched, ${failedProducts.length} failed`);

    return Response.json({
        success: true,
        total: products.length,
        enriched,
        failed: failedProducts.length,
        failedProducts: failedProducts.slice(0, 5),
        debug: debugLogs
    });
});