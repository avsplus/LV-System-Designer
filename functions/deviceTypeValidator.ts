/**
 * Validates and corrects device types based on product name/model patterns
 * Catches common miscategorizations from LLM
 */
export function correctDeviceType(detectedType, brand, model) {
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