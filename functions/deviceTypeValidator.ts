/**
 * Validates and corrects device types based on product name/model patterns
 * Prevents access points from being misidentified as network switches
 */
export function correctDeviceType(detectedType, brand, model) {
  const productNameLower = `${brand} ${model}`.toLowerCase();
  
  // If detected as network_switch, check if it's actually an access point
  if (detectedType === 'network_switch') {
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
      'access-point'
    ];
    
    if (accessPointIndicators.some(indicator => productNameLower.includes(indicator))) {
      return 'access_point';
    }
  }
  
  // If detected as access_point but name suggests it's a switch
  if (detectedType === 'access_point') {
    const switchIndicators = [
      'ethernet switch',
      'managed switch',
      'poe switch',
      'gigabit switch',
      'network switch',
      'switch -',
      'switch ('
    ];
    
    if (switchIndicators.some(indicator => productNameLower.includes(indicator))) {
      return 'network_switch';
    }
  }
  
  return detectedType;
}