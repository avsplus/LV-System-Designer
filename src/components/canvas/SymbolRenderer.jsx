import React from 'react';

const SYMBOL_ICONS = {
  'ELEC-1G': 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69220e1df953a2fd292e8b12/227d623c7_1GangOutlet.png',
  'ELEC-2G': 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69220e1df953a2fd292e8b12/f2f62ac3e_2GangOutlet.png',
  'ELEC-4G': 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69220e1df953a2fd292e8b12/906dd9057_4GangOutlet.png',
  'AV-AVO': 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69220e1df953a2fd292e8b12/9517c489b_AVOutlet_1.png',
  'NET-DP': 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69220e1df953a2fd292e8b12/99333e95d_PhoneData.png',
  'NET-DO': 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69220e1df953a2fd292e8b12/4de12c8e1_DataOutlet.png',
  'NET-PO': 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69220e1df953a2fd292e8b12/fb6f727f5_PhoneOutlet.png',
  'AV-SPK': 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69220e1df953a2fd292e8b12/9e3a38c86_Speaker.png',
  'NET-WAP': 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69220e1df953a2fd292e8b12/04cee7fda_WirelessAP.png'
};

// Renders symbols with PNG icons or fallback SVGs
export default function SymbolRenderer({ symbolId, position, color, scale = 1, rotation = 0, flipped = false }) {
        const baseSize = 60;
        const scaledSize = baseSize * scale;
        const iconUrl = SYMBOL_ICONS[symbolId];

        if (!symbolId) {
          console.warn('SymbolRenderer: No symbolId provided', { position, color });
          return null;
        }

        // Use PNG icon if available with color overlay
        if (iconUrl) {
          const filterId = `color-overlay-${symbolId}-${position.x}-${position.y}`;
          const rgb = hexToRgb(color || '#3b82f6');
          
          return (
            <g transform={`translate(${position.x}, ${position.y}) rotate(${rotation}) scale(${flipped ? -1 : 1}, 1)`}>
              <defs>
                <filter id={filterId}>
                  <feColorMatrix
                    type="matrix"
                    values={`0 0 0 0 ${rgb.r / 255}
                            0 0 0 0 ${rgb.g / 255}
                            0 0 0 0 ${rgb.b / 255}
                            0 0 0 1 0`}
                  />
                </filter>
              </defs>
              <image 
                href={iconUrl}
                x={-scaledSize / 2}
                y={-scaledSize / 2}
                width={scaledSize}
                height={scaledSize}
                preserveAspectRatio="xMidYMid meet"
                filter={color && color !== '#ffffff' ? `url(#${filterId})` : 'none'}
              />
            </g>
          );
        }

        // Speaker (fallback)
        if (symbolId === 'AV-SPK') {
    return (
      <g transform={`translate(${position.x}, ${position.y}) rotate(${rotation}) scale(${flipped ? -1 : 1}, 1)`}>
        <svg 
          x={-scaledSize / 2} 
          y={-scaledSize / 2} 
          width={scaledSize} 
          height={scaledSize}
          viewBox="0 0 106 93" 
          preserveAspectRatio="xMidYMid meet"
        >
          <g transform="translate(0,93) scale(0.1,-0.1)" fill={color}>
            <path d="M565 780 l-110 -110 -107 0 -108 0 0 -174 c0 -130 3 -175 12 -178 7 -3 58 -4 112 -3 l100 2 105 -108 c57 -60 111 -109 118 -109 10 0 13 75 13 395 0 312 -3 395 -13 395 -7 0 -62 -49 -122 -110z m101 -617 c-2 -2 -46 39 -96 91 l-93 96 -104 0 -104 0 3 147 3 147 101 -3 101 -3 94 101 94 100 3 -336 c1 -185 0 -338 -2 -340z"/>
          </g>
        </svg>
      </g>
    );
  }
  
  // Television
  if (symbolId === 'AV-TV') {
    return (
      <g transform={`translate(${position.x}, ${position.y}) rotate(${rotation}) scale(${flipped ? -1 : 1}, 1)`}>
        <svg 
          x={-scaledSize / 2} 
          y={-scaledSize / 2} 
          width={scaledSize} 
          height={scaledSize}
          viewBox="0 0 106 85" 
          preserveAspectRatio="xMidYMid meet"
        >
          <g transform="translate(0,85) scale(0.1,-0.1)" fill={color}>
            <path d="M262 438 l3 -193 280 0 280 0 0 190 0 190 -283 3 -282 2 2 -192z m82 -6 l1 -162 -27 0 -28 0 0 158 c0 87 3 162 7 166 4 4 16 6 26 4 18 -3 20 -14 21 -166z m366 1 l0 -163 -165 0 -165 0 0 163 0 162 165 0 165 0 0 -162z m82 2 l0 -160 -26 -3 -26 -3 0 159 c0 87 3 162 7 166 4 4 16 6 26 4 17 -3 19 -14 19 -163z"/>
          </g>
        </svg>
      </g>
    );
  }
  
  // Wireless AP
  
  // Wireless AP
  if (symbolId === 'NET-WAP') {
    return (
      <g transform={`translate(${position.x}, ${position.y}) rotate(${rotation}) scale(${flipped ? -1 : 1}, 1)`}>
        <svg 
          x={-scaledSize / 2} 
          y={-scaledSize / 2} 
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
      </g>
    );
  }
  
  // Phone Outlet
  if (symbolId === 'NET-PO') {
    return (
      <g transform={`translate(${position.x}, ${position.y}) rotate(${rotation}) scale(${flipped ? -1 : 1}, 1)`}>
        <svg 
          x={-scaledSize / 2} 
          y={-scaledSize / 2} 
          width={scaledSize} 
          height={scaledSize}
          viewBox="0 0 112 91" 
          preserveAspectRatio="xMidYMid meet"
        >
          <g transform="translate(0,91) scale(0.1,-0.1)" fill={color}>
            <path d="M600 724 c-107 -63 -206 -120 -220 -128 -97 -52 -153 -85 -177 -102 l-27 -20 85 -50 c46 -27 87 -50 91 -52 4 -2 108 -61 230 -132 147 -85 226 -125 233 -119 11 11 20 584 10 667 -4 31 -11 52 -18 51 -7 -1 -100 -52 -207 -115z m198 -244 c1 -167 -2 -308 -6 -312 -5 -5 -48 14 -98 43 -49 28 -103 60 -120 69 -288 164 -334 194 -326 202 19 19 527 307 537 304 6 -2 11 -115 13 -306z"/>
          </g>
        </svg>
      </g>
    );
  }
  
  // Data Outlet
  if (symbolId === 'NET-DO') {
    return (
      <g transform={`translate(${position.x}, ${position.y}) rotate(${rotation}) scale(${flipped ? -1 : 1}, 1)`}>
        <svg 
          x={-scaledSize / 2} 
          y={-scaledSize / 2} 
          width={scaledSize} 
          height={scaledSize}
          viewBox="0 0 114 85" 
          preserveAspectRatio="xMidYMid meet"
        >
          <g transform="translate(0,85) scale(0.1,-0.1)" fill={color}>
            <path d="M750 753 c-52 -31 -108 -63 -125 -73 -16 -9 -106 -61 -200 -114 -93 -53 -176 -103 -183 -110 -14 -14 -11 -16 93 -76 357 -206 521 -297 528 -291 11 11 4 714 -8 717 -5 1 -53 -23 -105 -53z"/>
          </g>
        </svg>
      </g>
    );
  }
  
  // Data & Phone
  if (symbolId === 'NET-DP') {
    return (
      <g transform={`translate(${position.x}, ${position.y}) rotate(${rotation}) scale(${flipped ? -1 : 1}, 1)`}>
        <svg 
          x={-scaledSize / 2} 
          y={-scaledSize / 2} 
          width={scaledSize} 
          height={scaledSize}
          viewBox="0 0 120 86" 
          preserveAspectRatio="xMidYMid meet"
        >
          <g transform="translate(0,86) scale(0.1,-0.1)" fill={color}>
            <path d="M635 673 c-126 -73 -239 -138 -250 -143 -50 -24 -128 -76 -126 -85 4 -15 615 -364 624 -356 11 11 4 714 -8 716 -5 2 -113 -58 -240 -132z m233 -387 c1 -79 -2 -144 -7 -149 -6 -6 -20 -2 -39 12 -17 11 -33 21 -36 21 -4 0 -36 18 -72 40 -36 22 -67 40 -68 40 -4 0 -300 171 -305 176 -3 2 114 3 260 2 l264 -3 3 -139z"/>
          </g>
        </svg>
      </g>
    );
  }
  
  // Projector Screen
  if (symbolId === 'AV-PS') {
    return (
      <g transform={`translate(${position.x}, ${position.y}) rotate(${rotation}) scale(${flipped ? -1 : 1}, 1)`}>
        <svg 
          x={-scaledSize / 2} 
          y={-scaledSize / 2} 
          width={scaledSize} 
          height={scaledSize}
          viewBox="0 0 115 81" 
          preserveAspectRatio="xMidYMid meet"
        >
          <g transform="translate(0,81) scale(0.1,-0.1)" fill={color}>
            <path d="M260 569 c0 -6 9 -13 20 -16 18 -5 20 -15 22 -162 l3 -156 280 0 280 0 3 157 c2 152 3 157 24 160 12 2 23 9 26 16 3 9 -67 12 -327 12 -233 0 -331 -3 -331 -11z m580 -164 l0 -145 -252 2 -253 3 -3 129 c-1 72 0 136 2 143 4 10 59 13 256 13 l250 0 0 -145z"/>
          </g>
        </svg>
      </g>
    );
  }
  
  // AV Outlet
  if (symbolId === 'AV-AVO') {
    return (
      <g transform={`translate(${position.x}, ${position.y}) rotate(${rotation}) scale(${flipped ? -1 : 1}, 1)`}>
        <svg 
          x={-scaledSize / 2} 
          y={-scaledSize / 2} 
          width={scaledSize} 
          height={scaledSize}
          viewBox="0 0 119 89" 
          preserveAspectRatio="xMidYMid meet"
        >
          <g transform="translate(0,89) scale(0.1,-0.1)" fill={color}>
            <path d="M590 709 c-123 -71 -226 -129 -228 -129 -2 0 -16 -8 -30 -19 -15 -10 -49 -31 -77 -46 -71 -39 -72 -41 -29 -63 22 -10 80 -43 129 -72 118 -69 266 -155 335 -193 30 -17 72 -41 92 -54 21 -13 42 -23 48 -23 7 0 10 124 10 365 0 286 -3 365 -12 364 -7 0 -114 -59 -238 -130z m222 -66 c-2 -82 -4 -149 -5 -150 -6 -5 -527 -7 -527 -2 0 3 12 12 27 20 28 14 262 146 318 179 17 9 62 36 100 59 39 22 75 41 80 41 6 0 9 -54 7 -147z m-5 -186 c6 -7 6 -297 0 -297 -5 0 -21 8 -35 18 -15 11 -52 32 -82 49 -59 32 -85 47 -195 111 -38 23 -102 58 -142 79 -39 20 -70 40 -68 43 3 4 517 2 522 -3z"/>
          </g>
        </svg>
      </g>
    );
  }
  
  // Keypad
  if (symbolId === 'CTRL-KP') {
    return (
      <g transform={`translate(${position.x}, ${position.y}) rotate(${rotation}) scale(${flipped ? -1 : 1}, 1)`}>
        <svg 
          x={-scaledSize / 2} 
          y={-scaledSize / 2} 
          width={scaledSize} 
          height={scaledSize}
          viewBox="0 0 91 77" 
          preserveAspectRatio="xMidYMid meet"
        >
          <g transform="translate(0,77) scale(0.1,-0.1)" fill={color}>
            <path d="M241 682 c-12 -24 -12 -580 0 -588 8 -4 307 -8 407 -4 9 0 12 67 12 299 0 258 -2 300 -15 305 -8 3 -101 5 -205 6 -169 0 -191 -2 -199 -18z m189 -102 l0 -80 -80 0 -80 0 0 80 0 80 80 0 80 0 0 -80z m190 0 l0 -80 -80 0 -80 0 0 80 0 80 80 0 80 0 0 -80z m-190 -190 l0 -81 -77 3 -78 3 -3 78 -3 77 81 0 80 0 0 -80z m190 0 l0 -80 -80 0 -80 0 0 80 0 80 80 0 80 0 0 -80z m-190 -191 l0 -79 -80 0 -80 0 0 73 c0 41 2 76 4 78 2 2 38 4 80 5 l76 1 0 -78z m190 -1 l0 -78 -80 0 -80 0 0 78 0 78 80 0 80 -1 0 -77z"/>
          </g>
        </svg>
      </g>
    );
  }
  
  // Wall Touch Panel
  if (symbolId === 'CTRL-WTP') {
    return (
      <g transform={`translate(${position.x}, ${position.y}) rotate(${rotation}) scale(${flipped ? -1 : 1}, 1)`}>
        <svg 
          x={-scaledSize / 2} 
          y={-scaledSize / 2} 
          width={scaledSize} 
          height={scaledSize}
          viewBox="0 0 87 83" 
          preserveAspectRatio="xMidYMid meet"
        >
          <g transform="translate(0,83) scale(0.05,-0.05)" fill={color}>
            <path d="M405 865 l5 -595 470 0 470 0 0 590 0 590 -475 5 -476 6 6 -596z m891 35 c3 -269 0 -510 -6 -535 l-11 -46 -404 6 -405 5 -5 510 c-3 280 -1 521 4 535 8 20 99 25 416 20 l405 -5 6 -490z"/>
            <path d="M529 1335 c-5 -14 -7 -237 -4 -495 l5 -470 332 -5 c419 -7 380 -61 373 518 l-5 467 -345 5 c-269 5 -348 0 -356 -20z m631 -70 c6 -398 -2 -815 -16 -829 -9 -9 -138 -15 -286 -12 l-268 6 -5 435 -6 435 291 0 c263 0 290 -3 290 -35z"/>
          </g>
        </svg>
      </g>
    );
  }
  
  // Tabletop Touch Panel
  if (symbolId === 'CTRL-TTP') {
    return (
      <g transform={`translate(${position.x}, ${position.y}) rotate(${rotation}) scale(${flipped ? -1 : 1}, 1)`}>
        <svg 
          x={-scaledSize / 2} 
          y={-scaledSize / 2} 
          width={scaledSize} 
          height={scaledSize}
          viewBox="0 0 87 84" 
          preserveAspectRatio="xMidYMid meet"
        >
          <g transform="translate(0,84) scale(0.05,-0.05)" fill={color}>
            <path d="M457 1422 l-47 -38 0 -534 c0 -657 -54 -590 474 -590 526 0 476 -62 476 591 l0 511 -49 49 c-68 68 -772 77 -854 11z m804 -43 c48 -25 61 -989 15 -1035 -34 -34 -758 -34 -792 0 -43 43 -33 1009 11 1034 47 28 716 28 766 1z"/>
            <path d="M528 1325 c-38 -37 -41 -784 -4 -821 15 -15 85 -24 180 -24 142 0 189 -17 136 -50 -31 -19 -23 -64 14 -79 47 -18 103 40 70 73 -46 46 -23 56 132 56 95 0 165 9 180 24 41 41 33 784 -9 826 -44 44 -654 40 -699 -5z m647 -410 l-5 -365 -290 0 -290 0 -5 365 -6 365 301 0 301 0 -6 -365z"/>
          </g>
        </svg>
      </g>
    );
  }
  
  // Volume Control
  if (symbolId === 'CTRL-VC') {
    return (
      <g transform={`translate(${position.x}, ${position.y}) rotate(${rotation}) scale(${flipped ? -1 : 1}, 1)`}>
        <svg 
          x={-scaledSize / 2} 
          y={-scaledSize / 2} 
          width={scaledSize} 
          height={scaledSize}
          viewBox="0 0 102 80" 
          preserveAspectRatio="xMidYMid meet"
        >
          <g transform="translate(0,80) scale(0.1,-0.1)" fill={color}>
            <path d="M287 704 c-4 -4 -7 -142 -7 -306 l0 -298 205 0 205 0 -2 303 -3 302 -196 3 c-107 1 -198 -1 -202 -4z m365 -304 l1 -265 -172 -3 -171 -2 0 270 0 270 171 -2 171 -3 0 -265z"/>
            <path d="M403 505 c-82 -65 -62 -189 36 -228 50 -21 101 -6 142 40 24 28 29 43 29 83 0 43 -5 54 -38 90 -35 36 -44 40 -88 40 -37 0 -57 -6 -81 -25z m121 -16 c33 -15 59 -71 51 -108 -16 -73 -111 -102 -160 -49 -44 47 -29 124 30 156 26 15 48 15 79 1z"/>
          </g>
        </svg>
      </g>
    );
  }
  
  // 1 Gang Outlet
  if (symbolId === 'ELEC-1G') {
    return (
      <g transform={`translate(${position.x}, ${position.y}) rotate(${rotation}) scale(${flipped ? -1 : 1}, 1)`}>
        <svg 
          x={-scaledSize / 2} 
          y={-scaledSize / 2} 
          width={scaledSize} 
          height={scaledSize}
          viewBox="0 0 100 72" 
          preserveAspectRatio="xMidYMid meet"
        >
          <g transform="translate(0,72) scale(0.1,-0.1)" fill={color}>
            <path d="M454 545 c-39 -17 -92 -77 -100 -113 -3 -15 -7 -31 -8 -36 -1 -5 -41 -10 -89 -10 -118 -1 -118 -20 1 -24 91 -3 92 -3 92 -28 0 -64 107 -154 184 -154 73 0 151 57 184 133 35 82 -21 202 -111 236 -38 15 -115 12 -153 -4z m166 -37 c41 -28 69 -65 72 -96 l3 -23 -158 0 c-87 -1 -161 2 -164 4 -7 7 32 79 54 99 48 44 141 51 193 16z m80 -160 c0 -6 -11 -30 -25 -54 -26 -45 -90 -84 -137 -84 -56 0 -126 48 -157 107 -21 42 -18 43 154 43 119 0 165 -3 165 -12z"/>
          </g>
        </svg>
      </g>
    );
  }
  
  // 2 Gang Outlet
  if (symbolId === 'ELEC-2G') {
    return (
      <g transform={`translate(${position.x}, ${position.y}) rotate(${rotation}) scale(${flipped ? -1 : 1}, 1)`}>
        <svg 
          x={-scaledSize / 2} 
          y={-scaledSize / 2} 
          width={scaledSize} 
          height={scaledSize}
          viewBox="0 0 94 77" 
          preserveAspectRatio="xMidYMid meet"
        >
          <g transform="translate(0,77) scale(0.1,-0.1)" fill={color}>
            <path d="M462 588 c-19 -6 -53 -33 -75 -60 l-42 -48 -87 0 c-52 0 -88 -4 -88 -10 0 -6 35 -10 85 -10 l85 0 0 -45 0 -44 -82 -3 c-54 -2 -83 -7 -86 -15 -3 -10 20 -13 90 -13 93 0 94 0 111 -30 44 -74 161 -105 242 -63 49 25 70 47 90 96 33 79 4 177 -65 223 -44 29 -127 39 -178 22z m126 -23 c43 -18 82 -53 82 -72 0 -10 -30 -13 -140 -13 -77 0 -140 3 -140 8 0 20 36 56 74 72 51 23 77 24 124 5z m108 -129 c3 -14 3 -34 -1 -45 -6 -20 -13 -21 -166 -21 l-159 0 0 45 0 45 160 0 160 0 6 -24z m-26 -105 c0 -5 -16 -23 -35 -39 -61 -55 -149 -55 -210 0 -19 16 -35 34 -35 39 0 5 63 9 140 9 77 0 140 -4 140 -9z"/>
          </g>
        </svg>
      </g>
    );
  }
  
  // 4 Gang Outlet
  if (symbolId === 'ELEC-4G') {
    return (
      <g transform={`translate(${position.x}, ${position.y}) rotate(${rotation}) scale(${flipped ? -1 : 1}, 1)`}>
        <svg 
          x={-scaledSize / 2} 
          y={-scaledSize / 2} 
          width={scaledSize} 
          height={scaledSize}
          viewBox="0 0 102 73" 
          preserveAspectRatio="xMidYMid meet"
        >
          <g transform="translate(0,73) scale(0.1,-0.1)" fill={color}>
            <path d="M487 570 c4 -22 2 -30 -9 -30 -19 0 -88 -69 -88 -87 0 -12 -19 -14 -97 -12 -87 3 -98 1 -101 -15 -3 -16 4 -17 87 -15 50 2 91 0 91 -4 0 -4 0 -25 0 -47 l0 -40 -95 0 c-83 0 -94 -2 -88 -16 5 -14 20 -16 105 -12 67 3 98 2 98 -6 0 -16 51 -70 78 -85 17 -9 22 -19 20 -39 -2 -19 2 -27 12 -27 10 0 14 8 13 23 -3 20 1 22 47 22 47 0 50 -2 50 -25 0 -16 6 -25 16 -25 13 0 15 7 11 29 -5 24 -1 32 31 52 75 49 105 154 67 235 -20 43 -70 94 -93 94 -10 0 -12 8 -7 30 6 25 4 30 -13 30 -15 0 -18 -5 -15 -23 4 -22 2 -23 -44 -21 -42 2 -48 5 -46 23 2 15 -3 21 -17 21 -16 0 -19 -5 -13 -30z m107 -36 c11 -4 16 -19 16 -51 l0 -44 -47 3 -47 3 -2 42 c-2 32 2 43 14 46 27 7 49 7 66 1z m-104 -54 c0 -39 -1 -40 -35 -40 -44 0 -46 19 -4 54 17 14 32 26 35 26 2 0 4 -18 4 -40z m212 -23 c8 -16 5 -18 -29 -15 -35 3 -38 6 -39 33 0 17 1 34 4 38 5 10 49 -29 64 -56z m-214 -90 l3 -47 -44 0 c-39 0 -46 3 -51 25 -4 14 -4 36 0 49 5 21 11 24 47 22 l42 -2 3 -47z m122 1 l0 -48 -49 0 -50 0 3 48 c2 26 4 47 5 47 0 0 21 0 46 0 l45 0 0 -47z m115 2 l0 -45 -45 -3 -46 -3 3 48 c1 26 2 48 2 49 1 0 20 0 44 0 l42 -1 0 -45z m-235 -112 c0 -21 -4 -38 -9 -38 -8 0 -71 66 -71 74 0 2 18 3 40 2 39 -1 40 -1 40 -38z m118 -7 c-3 -40 -6 -46 -27 -49 -12 -2 -33 -1 -45 2 -19 5 -22 12 -20 48 0 24 2 43 3 43 0 0 22 1 47 1 l45 2 -3 -47z m102 41 c0 -9 -63 -72 -71 -72 -6 0 -6 73 0 76 8 4 71 0 71 -4z"/>
          </g>
        </svg>
      </g>
    );
  }
  
  // Fallback: return simple circle for unknown symbols
  return (
    <g transform={`translate(${position.x}, ${position.y}) rotate(${rotation}) scale(${flipped ? -1 : 1}, 1)`}>
      <circle 
        cx={0} 
        cy={0} 
        r={scaledSize / 4} 
        fill={color} 
        opacity="0.8"
      />
    </g>
  );
}

// Helper to convert hex color to RGB
function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : { r: 59, g: 130, b: 246 }; // default blue
}