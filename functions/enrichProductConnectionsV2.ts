import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

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

  for (let i = 1; i <= portCount; i++) {
    const label = action.label_format.replace('{n}', i);
    ports.push({
      type: action.type,
      direction: action.direction || 'bidirectional',
      label,
      category: action.port_category || 'general',
      source: 'rule_engine'
    });
  }

  return ports;
}

function generateConnectionsFromSpec(spec, allRules) {
  if (!spec || !allRules) {
    return { inputs: [], outputs: [] };
  }

  const deviceType = spec.device_type;
  console.log(`[DEBUG-SPEC] Device type: ${deviceType}, Total rules: ${allRules.length}`);

  const applicableRules = allRules.filter(ruleSet => {
    if (!ruleSet.applies_to) {
      console.log(`[DEBUG-SPEC] Rule has no applies_to`);
      return false;
    }
    
    const { device_type } = ruleSet.applies_to;
    console.log(`[DEBUG-SPEC] Checking rule applies_to: ${JSON.stringify(device_type)} against ${deviceType}`);
    
    if (Array.isArray(device_type)) {
      const matches = device_type.includes(deviceType);
      console.log(`[DEBUG-SPEC] Array check: ${matches}`);
      return matches;
    }
    
    const matches = device_type === deviceType;
    console.log(`[DEBUG-SPEC] String check: ${matches}`);
    return matches;
  });

  console.log(`[DEBUG-SPEC] Found ${applicableRules.length} applicable rules`);

  const allRulesFlat = applicableRules.flatMap(ruleSet => ruleSet.rules || []);

  const allPorts = [];
  const sortedRules = [...allRulesFlat].sort((a, b) => (b.priority || 0) - (a.priority || 0));

  for (const rule of sortedRules) {
    if (!rule.is_active) continue;
    
    const ports = generatePortsFromRule(spec, rule);
    allPorts.push(...ports);
  }

  const inputs = allPorts.filter(p => p.direction === 'input' || p.direction === 'bidirectional');
  const outputs = allPorts.filter(p => p.direction === 'output' || p.direction === 'bidirectional');

  return { inputs, outputs };
}
// === END INLINE RULE ENGINE ===

Deno.serve(async (req) => {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
        return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const categoryFilter = body.category;

    console.log('[DEBUG] enrichProductConnectionsV2 - Request received with category:', categoryFilter);

    // Fetch products
    let products = [];
    if (categoryFilter) {
        products = await base44.asServiceRole.entities.AVProduct.filter({ category: categoryFilter });
    } else {
        products = await base44.asServiceRole.entities.AVProduct.list();
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
            
            // Call LLM to extract specs
            console.log('[DEBUG] Calling LLM for specs extraction...');
            const llmResponse = await base44.integrations.Core.InvokeLLM({
                prompt: `Extract detailed technical specifications for: ${product.brand} ${product.model}. Include ethernet_ports, sfp_ports, hdmi_inputs, hdmi_outputs, etc. as applicable.`,
                add_context_from_internet: true,
                response_json_schema: {
                    type: "object",
                    properties: {
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
            
            debugLogs.push(`Got attributes: ${JSON.stringify(llmResponse.attributes)}`);
            console.log('[DEBUG] LLM attributes:', llmResponse.attributes);

            // Create DeviceSpec
            console.log('[DEBUG] Creating DeviceSpec...');
            const deviceSpec = await base44.asServiceRole.entities.DeviceSpec.create({
                product_id: product.id,
                device_type: product.category,
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
                
                // Update product
                await base44.asServiceRole.entities.AVProduct.update(product.id, {
                    input_connections: inputs.map(p => ({ type: p.type, ports: [p.label] })),
                    output_connections: outputs.map(p => ({ type: p.type, ports: [p.label] }))
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