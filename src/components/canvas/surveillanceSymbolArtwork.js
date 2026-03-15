const svgShell = (body, color) => `
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 60" fill="none">
    <g stroke="${color}" fill="${color}" stroke-linecap="round" stroke-linejoin="round">
      ${body}
    </g>
  </svg>
`;

const surveillanceBodies = {
  'SURV-DOME': `
    <path d="M16 23C16 16 22 11.5 30 11.5C38 11.5 44 16 44 23" fill="none" stroke-width="3"/>
    <path d="M18.5 23H41.5" stroke-width="2.6"/>
    <path d="M20.5 24C20.5 33 24.8 39.5 30 39.5C35.2 39.5 39.5 33 39.5 24" fill="none" stroke-width="2.8"/>
    <circle cx="30" cy="28.5" r="4.8" fill="none" stroke-width="2.2"/>
    <circle cx="30" cy="28.5" r="2.2" stroke="none"/>
    <path d="M24 42H36" stroke-width="2.2"/>
  `,
  'SURV-BULLET': `
    <path d="M14 29H21" stroke-width="2.4"/>
    <path d="M21 24.5H36.5C40.5 24.5 44.3 27.2 45.2 30C44.3 32.8 40.5 35.5 36.5 35.5H21Z" fill="none" stroke-width="2.8"/>
    <circle cx="34" cy="30" r="4.2" fill="none" stroke-width="2.1"/>
    <circle cx="34" cy="30" r="2" stroke="none"/>
    <path d="M18.5 29L13 34.5" stroke-width="2.4"/>
    <path d="M42.5 27L49 23.8V36.2L42.5 33" fill="none" stroke-width="2.4"/>
  `,
  'SURV-TURRET': `
    <path d="M22 17.5H38" stroke-width="2.4"/>
    <path d="M23 17.5C21.5 22 21.2 28.5 22.8 34.2C24.1 38.5 26.8 41.3 30 42.5C33.2 41.3 35.9 38.5 37.2 34.2C38.8 28.5 38.5 22 37 17.5" fill="none" stroke-width="2.8"/>
    <path d="M25 20.5C24.3 25.5 24.5 31.8 26 35.8C27.1 38.7 28.6 40 30 40.6C31.4 40 32.9 38.7 34 35.8C35.5 31.8 35.7 25.5 35 20.5" fill="none" stroke-width="1.8"/>
    <circle cx="30" cy="28" r="4.6" fill="none" stroke-width="2.2"/>
    <circle cx="30" cy="28" r="1.9" stroke="none"/>
    <path d="M24.5 43H35.5" stroke-width="2.2"/>
  `
};

export const isSurveillanceSymbol = (symbolId) => Object.prototype.hasOwnProperty.call(surveillanceBodies, symbolId);

export const getSurveillanceSymbolSvgMarkup = (symbolId, color = '#ffffff') => {
  const body = surveillanceBodies[symbolId];
  if (!body) return '';
  return svgShell(body, color);
};

export const getSurveillanceSymbolDataUrl = (symbolId, color = '#ffffff') => {
  const svg = getSurveillanceSymbolSvgMarkup(symbolId, color);
  if (!svg) return '';
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
};
