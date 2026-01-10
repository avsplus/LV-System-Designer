/**
 * Rule Engine - Interprets ConnectionRules and generates ports from DeviceSpecs
 * This is a generic, data-driven interpreter that never needs code changes
 */

/**
 * Check if a value matches a MongoDB-style query condition
 */
function matchesCondition(value, condition) {
  if (condition === null || condition === undefined) {
    return value === null || value === undefined;
  }

  if (typeof condition === 'object' && !Array.isArray(condition)) {
    // MongoDB operators
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
    // Nested object match
    return false;
  }

  return value === condition;
}

/**
 * Get value from object using dot notation path (e.g., 'attributes.ethernet_ports')
 */
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

/**
 * Check if spec matches the 'if' condition of a rule
 */
function ruleMatches(spec, ifCondition) {
  if (!ifCondition || typeof ifCondition !== 'object') {
    return true;
  }

  for (const [key, condition] of Object.entries(ifCondition)) {
    // Look for the path either in spec directly or in spec.attributes
    let value = getValueByPath(spec, key);
    if (value === undefined && key.startsWith('attributes.')) {
      const attrKey = key.substring('attributes.'.length);
      value = spec.attributes ? spec.attributes[attrKey] : undefined;
    }
    
    if (!matchesCondition(value, condition)) {
      return false;
    }
  }

  return true;
}

/**
 * Generate ports from a single rule and spec
 */
function generatePortsFromRule(spec, rule) {
  const ports = [];

  // Check if rule condition matches
  if (!ruleMatches(spec, rule.if)) {
    return ports;
  }

  const { then: action } = rule;
  
  // Determine port count
  let portCount = 0;
  if (action.fixed_count !== undefined && action.fixed_count !== null) {
    portCount = action.fixed_count;
  } else if (action.count_from) {
    portCount = getValueByPath(spec, action.count_from) || 0;
  }

  if (portCount <= 0) {
    return ports;
  }

  // Generate ports
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

/**
 * Apply all matching rules to a spec
 */
export function applyRulesToSpec(spec, rules) {
  if (!rules || !Array.isArray(rules)) {
    return { inputs: [], outputs: [] };
  }

  const allPorts = [];

  // Sort rules by priority (higher first)
  const sortedRules = [...rules].sort((a, b) => (b.priority || 0) - (a.priority || 0));

  for (const rule of sortedRules) {
    if (!rule.is_active) continue;
    
    const ports = generatePortsFromRule(spec, rule);
    allPorts.push(...ports);
  }

  // Separate into inputs and outputs
  const inputs = allPorts.filter(p => p.direction === 'input' || p.direction === 'bidirectional');
  const outputs = allPorts.filter(p => p.direction === 'output' || p.direction === 'bidirectional');

  return { inputs, outputs };
}

/**
 * Apply all matching connection rules from organization to a device spec
 */
export function generateConnectionsFromSpec(spec, allRules) {
  if (!spec || !allRules) {
    return { inputs: [], outputs: [] };
  }

  const deviceType = spec.device_type;

  // Find rules that apply to this device type
  const applicableRules = allRules.filter(ruleSet => {
    if (!ruleSet.applies_to) return false;
    
    const { device_type } = ruleSet.applies_to;
    
    if (Array.isArray(device_type)) {
      return device_type.includes(deviceType);
    }
    
    return device_type === deviceType;
  });

  // Flatten all rules from applicable rule sets
  const allRulesFlat = applicableRules.flatMap(ruleSet => ruleSet.rules);

  return applyRulesToSpec(spec, allRulesFlat);
}

export default {
  applyRulesToSpec,
  generateConnectionsFromSpec,
  getValueByPath,
  matchesCondition
};