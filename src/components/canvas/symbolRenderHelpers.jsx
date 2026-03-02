import { getSymbolSchema } from './symbolSchemas';

/**
 * Render a symbol with its specifications visualized
 * This generates the visual representation based on symbol specs
 */
export function renderSymbolWithSpecs(symbolId, specs = {}, installation = {}, scale = 1) {
  const schema = getSymbolSchema(symbolId);
  if (!schema) return null;

  switch (symbolId) {
    case 'data_outlet':
      return renderDataOutlet(specs, installation, scale);
    case 'touch_panel':
      return renderTouchPanel(specs, installation, scale);
    case 'speaker':
      return renderSpeaker(specs, installation, scale);
    case 'projector':
      return renderProjector(specs, installation, scale);
    case 'tv_display':
      return renderTVDisplay(specs, installation, scale);
    case 'av_receiver':
      return renderAVReceiver(specs, installation, scale);
    case 'microphone':
      return renderMicrophone(specs, installation, scale);
    default:
      return null;
  }
}

/**
 * Generate inline label text for canvas display
 */
export function getSymbolLabel(symbolId, specs = {}, installation = {}) {
  switch (symbolId) {
    case 'data_outlet':
      const portStr = `${specs.ports || 2}x ${(specs.portTypes?.[0] || 'Cat6')}`;
      const heightStr = installation.height ? `${installation.height}" ${installation.heightType || 'AFF'}` : '';
      return [portStr, heightStr].filter(Boolean).join('\n');

    case 'touch_panel':
      const sizeStr = `${specs.screenSize || 7}"`;
      const mountStr = installation.mounting ? ` ${installation.mounting}` : '';
      const tpHeight = installation.height ? `${installation.height}" ${installation.heightType || 'AFF'}` : '';
      return [sizeStr + mountStr, tpHeight].filter(Boolean).join('\n');

    case 'speaker':
      const spkHeight = installation.height ? `${installation.height}" ${installation.heightType || 'AFF'}` : '';
      const powerStr = specs.power || '100W';
      return [powerStr, spkHeight].filter(Boolean).join('\n');

    case 'projector':
      const projRes = specs.resolution || '1080p';
      const projThrow = specs.throwRatio?.substring(0, 5) || 'std';
      return projRes + '\n' + projThrow;

    case 'tv_display':
      const tvSize = `${specs.screenSize || 55}"`;
      const tvRes = specs.resolution || '4K';
      return tvSize + '\n' + tvRes;

    case 'av_receiver':
      const channels = specs.channels || '7.2';
      const power = specs.power || '100W';
      return channels + '\n' + power;

    case 'microphone':
      const micType = specs.type || 'condenser';
      const micHeight = installation.height ? `${installation.height}" ${installation.heightType || 'AFF'}` : '';
      return [micType, micHeight].filter(Boolean).join('\n');

    default:
      return '';
  }
}

// Individual symbol renderers
function renderDataOutlet(specs, installation, scale) {
  const ports = specs.ports || 2;
  const orientation = specs.faceplateOrientation || 'vertical';
  const isHorizontal = orientation === 'horizontal';

  // Base faceplate dimensions
  const plateWidth = isHorizontal ? 4.5 : 2.75;
  const plateHeight = isHorizontal ? 2.75 : 4.5;

  // Port spacing
  const portSize = 0.3;
  const portGap = 0.15;

  return {
    type: 'outlet',
    dimensions: { width: plateWidth * scale, height: plateHeight * scale },
    ports: ports,
    orientation: orientation,
    portTypes: specs.portTypes || []
  };
}

function renderTouchPanel(specs, installation, scale) {
  const screenSize = specs.screenSize || 7;
  const orientation = specs.orientation || 'portrait';
  const isPortrait = orientation === 'portrait';

  const width = isPortrait ? 4 : 6.5;
  const height = isPortrait ? 6.5 : 4;
  const bezel = 0.3;

  return {
    type: 'panel',
    screenSize: screenSize,
    dimensions: { width: width * scale, height: height * scale },
    bezel: bezel * scale,
    orientation: orientation
  };
}

function renderSpeaker(specs, installation, scale) {
  const impedance = specs.impedance || '8';
  const power = specs.power || '100W';

  return {
    type: 'speaker',
    impedance: impedance,
    power: power,
    dimensions: { width: 1.5 * scale, height: 1.5 * scale }
  };
}

function renderProjector(specs, installation, scale) {
  const throwRatio = specs.throwRatio || 'standard';
  const isShortThrow = throwRatio.includes('short');

  return {
    type: 'projector',
    throwRatio: throwRatio,
    isShortThrow: isShortThrow,
    dimensions: { width: 2 * scale, height: 1.5 * scale }
  };
}

function renderTVDisplay(specs, installation, scale) {
  const screenSize = specs.screenSize || 55;
  const orientation = specs.orientation || 'landscape';
  const isPortrait = orientation === 'portrait';

  // Approximate aspect ratios
  const width = isPortrait ? 6 : 10;
  const height = isPortrait ? 10 : 6;

  return {
    type: 'display',
    screenSize: screenSize,
    dimensions: { width: width * scale, height: height * scale },
    orientation: orientation
  };
}

function renderAVReceiver(specs, installation, scale) {
  const channels = specs.channels || '7.2';
  const power = specs.power || '100W';

  return {
    type: 'receiver',
    channels: channels,
    power: power,
    dimensions: { width: 4.3 * scale, height: 1.75 * scale }
  };
}

function renderMicrophone(specs, installation, scale) {
  const micType = specs.type || 'condenser';

  return {
    type: 'microphone',
    micType: micType,
    dimensions: { width: 0.75 * scale, height: 1.5 * scale }
  };
}