import React from 'react';

// Renders symbols with the exact same SVG design as shown in SymbolPicker
export default function SymbolRenderer({ symbolId, position, color, scale = 1 }) {
  const baseSize = 60; // Match the size from SymbolPicker
  const scaledSize = baseSize * scale;
  
  // Wireless AP
  if (symbolId === 'NET-WAP') {
    return (
      <svg 
        x={position.x - scaledSize / 2} 
        y={position.y - scaledSize / 2} 
        width={scaledSize} 
        height={scaledSize}
        viewBox="0 0 128 84" 
        preserveAspectRatio="xMidYMid meet"
      >
        <g transform="translate(0,84) scale(0.1,-0.1)" fill={color}>
          <path d="M422 713 c2 -12 14 -19 37 -21 19 -2 44 -10 57 -19 36 -23 67 -79 60 -108 -5 -21 -3 -25 15 -25 19 0 21 4 14 37 -10 56 -74 133 -109 133 -8 0 -18 5 -21 10 -3 6 -17 10 -31 10 -19 0 -25 -5 -22 -17z"/>
          <path d="M425 672 c-13 -13 -2 -22 26 -22 41 0 89 -50 89 -92 0 -17 4 -27 10 -23 24 15 5 72 -39 111 -23 21 -75 36 -86 26z"/>
          <path d="M419 630 c-8 -6 -1 -13 24 -23 24 -11 38 -24 43 -41 7 -30 34 -35 34 -7 0 21 -42 67 -69 74 -10 2 -25 1 -32 -3z"/>
          <path d="M420 515 c0 -52 -1 -55 -25 -55 l-25 0 0 -150 0 -150 280 0 280 0 0 150 0 150 -240 0 -240 0 0 55 c0 42 -3 55 -15 55 -12 0 -15 -13 -15 -55z m480 -205 l0 -120 -255 0 -255 0 0 120 0 120 255 0 255 0 0 -120z"/>
        </g>
      </svg>
    );
  }
  
  // Phone Outlet
  if (symbolId === 'NET-PO') {
    return (
      <svg 
        x={position.x - scaledSize / 2} 
        y={position.y - scaledSize / 2} 
        width={scaledSize} 
        height={scaledSize}
        viewBox="0 0 112 91" 
        preserveAspectRatio="xMidYMid meet"
      >
        <g transform="translate(0,91) scale(0.1,-0.1)" fill={color}>
          <path d="M600 724 c-107 -63 -206 -120 -220 -128 -97 -52 -153 -85 -177 -102 l-27 -20 85 -50 c46 -27 87 -50 91 -52 4 -2 108 -61 230 -132 147 -85 226 -125 233 -119 11 11 20 584 10 667 -4 31 -11 52 -18 51 -7 -1 -100 -52 -207 -115z m198 -244 c1 -167 -2 -308 -6 -312 -5 -5 -48 14 -98 43 -49 28 -103 60 -120 69 -288 164 -334 194 -326 202 19 19 527 307 537 304 6 -2 11 -115 13 -306z"/>
        </g>
      </svg>
    );
  }
  
  // Data Outlet
  if (symbolId === 'NET-DO') {
    return (
      <svg 
        x={position.x - scaledSize / 2} 
        y={position.y - scaledSize / 2} 
        width={scaledSize} 
        height={scaledSize}
        viewBox="0 0 114 85" 
        preserveAspectRatio="xMidYMid meet"
      >
        <g transform="translate(0,85) scale(0.1,-0.1)" fill={color}>
          <path d="M750 753 c-52 -31 -108 -63 -125 -73 -16 -9 -106 -61 -200 -114 -93 -53 -176 -103 -183 -110 -14 -14 -11 -16 93 -76 357 -206 521 -297 528 -291 11 11 4 714 -8 717 -5 1 -53 -23 -105 -53z"/>
        </g>
      </svg>
    );
  }
  
  // Data & Phone
  if (symbolId === 'NET-DP') {
    return (
      <svg 
        x={position.x - scaledSize / 2} 
        y={position.y - scaledSize / 2} 
        width={scaledSize} 
        height={scaledSize}
        viewBox="0 0 120 86" 
        preserveAspectRatio="xMidYMid meet"
      >
        <g transform="translate(0,86) scale(0.1,-0.1)" fill={color}>
          <path d="M635 673 c-126 -73 -239 -138 -250 -143 -50 -24 -128 -76 -126 -85 4 -15 615 -364 624 -356 11 11 4 714 -8 716 -5 2 -113 -58 -240 -132z m233 -387 c1 -79 -2 -144 -7 -149 -6 -6 -20 -2 -39 12 -17 11 -33 21 -36 21 -4 0 -36 18 -72 40 -36 22 -67 40 -68 40 -4 0 -300 171 -305 176 -3 2 114 3 260 2 l264 -3 3 -139z"/>
        </g>
      </svg>
    );
  }
  
  // Fallback: return simple circle for unknown symbols
  return (
    <circle 
      cx={position.x} 
      cy={position.y} 
      r={scaledSize / 4} 
      fill={color} 
      opacity="0.8"
    />
  );
}