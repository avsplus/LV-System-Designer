const svgShell = (body, color) => `
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 60" fill="none">
    <g stroke="${color}" fill="${color}" stroke-linecap="round" stroke-linejoin="round">
      ${body}
    </g>
  </svg>
`;

const surveillanceBodies = {
  'SURV-DOME': `
    <path d="M17 22C17 17 22 13 30 13C38 13 43 17 43 22" stroke-width="2.6"/>
    <path d="M19 22H41" stroke-width="2.2"/>
    <path d="M21 23C21 33 25 39 30 39C35 39 39 33 39 23" stroke-width="2.6"/>
    <circle cx="30" cy="28" r="4.6" fill="none" stroke-width="2.1"/>
    <circle cx="30" cy="28" r="2.1" stroke="none"/>
    <path d="M24 41H36" stroke-width="2"/>
  `,
  'SURV-BULLET': `
    <path d="M17 30H23" stroke-width="2.2"/>
    <path d="M23 24H36C40 24 44 27 45 30C44 33 40 36 36 36H23Z" fill="none" stroke-width="2.6"/>
    <circle cx="34" cy="30" r="4.1" fill="none" stroke-width="2"/>
    <circle cx="34" cy="30" r="1.9" stroke="none"/>
    <path d="M18 30L13 35" stroke-width="2.2"/>
    <path d="M42 27L48 24V36L42 33" fill="none" stroke-width="2.2"/>
  `,
  'SURV-TURRET': `
    <path d="M20 19H40" stroke-width="2.2"/>
    <path d="M20 19C19 28 20 38 30 42C40 38 41 28 40 19" stroke-width="2.6"/>
    <circle cx="30" cy="28" r="5.3" fill="none" stroke-width="2.1"/>
    <circle cx="30" cy="28" r="2.2" stroke="none"/>
    <path d="M24 43H36" stroke-width="2"/>
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
