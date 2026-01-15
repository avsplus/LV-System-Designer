import React, { useState } from 'react';
import { Button } from "@/components/ui/button";

const SYMBOL_CATEGORIES = {
  'Audio/Video': [
    { id: 'AV-SPK', label: 'Speaker', color: '#f97316' },
    { id: 'AV-TV', label: 'Television', color: '#f97316' },
    { id: 'AV-PS', label: 'Projector Screen', color: '#f97316' },
    { id: 'AV-AVO', label: 'AV Outlet', color: '#f97316' }
  ],
  'Communications': [
    { id: 'COMM-PO', label: 'Phone Outlet', color: '#06b6d4' },
    { id: 'COMM-IC', label: 'Intercom', color: '#06b6d4' },
    { id: 'COMM-DV', label: 'Data & VoIP', color: '#06b6d4' }
  ],
  'Network': [
    { id: 'NET-WAP', label: 'Wireless AP', color: '#8b5cf6' },
    { id: 'NET-DO', label: 'Data Outlet', color: '#3b82f6' },
    { id: 'NET-PO', label: 'Phone Outlet', color: '#3b82f6' },
    { id: 'NET-DP', label: 'Data & Phone', color: '#3b82f6' }
  ],
  'Control': [
    { id: 'CTRL-WTP', label: 'Wall TP', color: '#a855f7' },
    { id: 'CTRL-KP', label: 'Keypad', color: '#a855f7' },
    { id: 'CTRL-VC', label: 'Volume Ctr', color: '#a855f7' },
    { id: 'CTRL-TTP', label: 'Tabletop TP', color: '#a855f7' }
  ],
  'Surveillance': [
    { id: 'SURV-DOME', label: 'Dome', color: '#ef4444' },
    { id: 'SURV-BULLET', label: 'Bullet', color: '#ef4444' },
    { id: 'SURV-TURRET', label: 'Turret', color: '#ef4444' }
  ],
  'Electrical': [
    { id: 'ELEC-1G', label: '1 Gang Outlet', color: '#8b5cf6' },
    { id: 'ELEC-2G', label: '2 Gang Outlet', color: '#8b5cf6' },
    { id: 'ELEC-DL', label: 'Dedicated Line', color: '#8b5cf6' }
  ]
};

const SymbolIcon = ({ id, color }) => {
  const commonProps = { viewBox: "0 0 60 60", style: { width: '32px', height: '32px' } };

  // Audio/Video symbols
  if (id === 'AV-SPK') { // Speaker
    return (
      <svg width="32px" height="32px" viewBox="0 0 106 93" preserveAspectRatio="xMidYMid meet">
        <g transform="translate(0,93) scale(0.1,-0.1)" fill={color}>
          <path d="M565 780 l-110 -110 -107 0 -108 0 0 -174 c0 -130 3 -175 12 -178 7 -3 58 -4 112 -3 l100 2 105 -108 c57 -60 111 -109 118 -109 10 0 13 75 13 395 0 312 -3 395 -13 395 -7 0 -62 -49 -122 -110z m101 -617 c-2 -2 -46 39 -96 91 l-93 96 -104 0 -104 0 3 147 3 147 101 -3 101 -3 94 101 94 100 3 -336 c1 -185 0 -338 -2 -340z"/>
        </g>
      </svg>
    );
  }
  
  if (id === 'AV-TV') { // Television
    return (
      <svg width="32px" height="32px" viewBox="0 0 106 85" preserveAspectRatio="xMidYMid meet">
        <g transform="translate(0,85) scale(0.1,-0.1)" fill={color}>
          <path d="M262 438 l3 -193 280 0 280 0 0 190 0 190 -283 3 -282 2 2 -192z m82 -6 l1 -162 -27 0 -28 0 0 158 c0 87 3 162 7 166 4 4 16 6 26 4 18 -3 20 -14 21 -166z m366 1 l0 -163 -165 0 -165 0 0 163 0 162 165 0 165 0 0 -162z m82 2 l0 -160 -26 -3 -26 -3 0 159 c0 87 3 162 7 166 4 4 16 6 26 4 17 -3 19 -14 19 -163z"/>
        </g>
      </svg>
    );
  }
  
  if (id === 'AV-PS') { // Projection Screen
    return (
      <svg {...commonProps}>
        <rect x="12" y="20" width="36" height="25" fill="none" stroke={color} strokeWidth="2" />
        <line x1="20" y1="15" x2="40" y2="15" stroke={color} strokeWidth="2" />
        <line x1="30" y1="15" x2="30" y2="20" stroke={color} strokeWidth="2" />
      </svg>
    );
  }
  
  if (id === 'AV-AVO') { // Remote AV Source
    return (
      <svg {...commonProps}>
        <rect x="15" y="20" width="30" height="20" rx="2" fill="none" stroke={color} strokeWidth="2" />
        <circle cx="25" cy="30" r="3" fill={color} />
        <circle cx="35" cy="30" r="3" fill={color} />
        <rect x="20" y="35" width="20" height="3" fill={color} />
      </svg>
    );
  }
  
  // Communications symbols
  if (id === 'COMM-PO') { // Phone Port
    return (
      <svg {...commonProps}>
        <path d="M20,15 L20,30 L25,35 L35,35 L40,30 L40,15 Z" fill="none" stroke={color} strokeWidth="2" />
        <path d="M22,25 L38,25" stroke={color} strokeWidth="2" />
      </svg>
    );
  }
  
  if (id === 'COMM-IC') { // Intercom Station
    return (
      <svg {...commonProps}>
        <rect x="15" y="15" width="30" height="30" rx="2" fill="none" stroke={color} strokeWidth="2" />
        <rect x="20" y="20" width="20" height="10" fill="none" stroke={color} strokeWidth="1.5" />
        <circle cx="25" cy="37" r="2" fill={color} />
        <circle cx="30" cy="37" r="2" fill={color} />
        <circle cx="35" cy="37" r="2" fill={color} />
      </svg>
    );
  }
  
  if (id === 'COMM-DV') { // Data Port
    return (
      <svg {...commonProps}>
        <path d="M18,20 L18,35 L30,45 L42,35 L42,20 Z" fill="none" stroke={color} strokeWidth="2" />
        <path d="M22,27 L38,27" stroke={color} strokeWidth="2" />
      </svg>
    );
  }
  
  // Network symbols
  if (id === 'NET-WAP') { // Wireless Access Point
    return (
      <svg {...commonProps} viewBox="0 0 128 84" preserveAspectRatio="xMidYMid meet">
        <g transform="translate(0,84) scale(0.1,-0.1)" fill={color}>
          <path d="M422 713 c2 -12 14 -19 37 -21 19 -2 44 -10 57 -19 36 -23 67 -79 60 -108 -5 -21 -3 -25 15 -25 19 0 21 4 14 37 -10 56 -74 133 -109 133 -8 0 -18 5 -21 10 -3 6 -17 10 -31 10 -19 0 -25 -5 -22 -17z"/>
          <path d="M425 672 c-13 -13 -2 -22 26 -22 41 0 89 -50 89 -92 0 -17 4 -27 10 -23 24 15 5 72 -39 111 -23 21 -75 36 -86 26z"/>
          <path d="M419 630 c-8 -6 -1 -13 24 -23 24 -11 38 -24 43 -41 7 -30 34 -35 34 -7 0 21 -42 67 -69 74 -10 2 -25 1 -32 -3z"/>
          <path d="M420 515 c0 -52 -1 -55 -25 -55 l-25 0 0 -150 0 -150 280 0 280 0 0 150 0 150 -240 0 -240 0 0 55 c0 42 -3 55 -15 55 -12 0 -15 -13 -15 -55z m480 -205 l0 -120 -255 0 -255 0 0 120 0 120 255 0 255 0 0 -120z"/>
        </g>
      </svg>
    );
  }

  if (id === 'NET-DO') { // Data Outlet
    return (
      <svg {...commonProps} viewBox="0 0 114 85" preserveAspectRatio="xMidYMid meet">
        <g transform="translate(0,85) scale(0.1,-0.1)" fill={color}>
          <path d="M750 753 c-52 -31 -108 -63 -125 -73 -16 -9 -106 -61 -200 -114 -93 -53 -176 -103 -183 -110 -14 -14 -11 -16 93 -76 357 -206 521 -297 528 -291 11 11 4 714 -8 717 -5 1 -53 -23 -105 -53z"/>
        </g>
      </svg>
    );
  }

  if (id === 'NET-PO') { // Phone Outlet
    return (
      <svg {...commonProps} viewBox="0 0 112 91" preserveAspectRatio="xMidYMid meet">
        <g transform="translate(0,91) scale(0.1,-0.1)" fill={color}>
          <path d="M600 724 c-107 -63 -206 -120 -220 -128 -97 -52 -153 -85 -177 -102 l-27 -20 85 -50 c46 -27 87 -50 91 -52 4 -2 108 -61 230 -132 147 -85 226 -125 233 -119 11 11 20 584 10 667 -4 31 -11 52 -18 51 -7 -1 -100 -52 -207 -115z m198 -244 c1 -167 -2 -308 -6 -312 -5 -5 -48 14 -98 43 -49 28 -103 60 -120 69 -288 164 -334 194 -326 202 19 19 527 307 537 304 6 -2 11 -115 13 -306z"/>
        </g>
      </svg>
    );
  }

  if (id === 'NET-DP') { // Data & Phone
    return (
      <svg {...commonProps} viewBox="0 0 120 86" preserveAspectRatio="xMidYMid meet">
        <g transform="translate(0,86) scale(0.1,-0.1)" fill={color}>
          <path d="M635 673 c-126 -73 -239 -138 -250 -143 -50 -24 -128 -76 -126 -85 4 -15 615 -364 624 -356 11 11 4 714 -8 716 -5 2 -113 -58 -240 -132z m233 -387 c1 -79 -2 -144 -7 -149 -6 -6 -20 -2 -39 12 -17 11 -33 21 -36 21 -4 0 -36 18 -72 40 -36 22 -67 40 -68 40 -4 0 -300 171 -305 176 -3 2 114 3 260 2 l264 -3 3 -139z"/>
        </g>
      </svg>
    );
  }
  
  // Control symbols
  if (id === 'CTRL-WTP') { // Wall Touch Panel
    return (
      <svg {...commonProps}>
        <rect x="18" y="15" width="24" height="30" rx="2" fill="none" stroke={color} strokeWidth="2" />
        <rect x="22" y="20" width="16" height="12" fill="none" stroke={color} strokeWidth="1.5" />
        <circle cx="26" cy="38" r="2" fill={color} />
        <circle cx="34" cy="38" r="2" fill={color} />
      </svg>
    );
  }
  
  if (id === 'CTRL-KP') { // Keypad
    return (
      <svg {...commonProps}>
        <rect x="15" y="15" width="30" height="30" rx="2" fill="none" stroke={color} strokeWidth="2" />
        <circle cx="23" cy="23" r="2" fill={color} />
        <circle cx="30" cy="23" r="2" fill={color} />
        <circle cx="37" cy="23" r="2" fill={color} />
        <circle cx="23" cy="30" r="2" fill={color} />
        <circle cx="30" cy="30" r="2" fill={color} />
        <circle cx="37" cy="30" r="2" fill={color} />
        <circle cx="23" cy="37" r="2" fill={color} />
        <circle cx="30" cy="37" r="2" fill={color} />
        <circle cx="37" cy="37" r="2" fill={color} />
      </svg>
    );
  }
  
  if (id === 'CTRL-VC') { // Volume Control
    return (
      <svg {...commonProps}>
        <circle cx="30" cy="30" r="15" fill="none" stroke={color} strokeWidth="2" />
        <circle cx="30" cy="30" r="8" fill="none" stroke={color} strokeWidth="2" />
        <line x1="30" y1="22" x2="30" y2="18" stroke={color} strokeWidth="2" />
      </svg>
    );
  }
  
  if (id === 'CTRL-TTP') { // Tabletop Touch Pad
    return (
      <svg {...commonProps}>
        <rect x="15" y="20" width="30" height="20" rx="2" fill="none" stroke={color} strokeWidth="2" />
        <rect x="20" y="25" width="20" height="10" fill="none" stroke={color} strokeWidth="1.5" />
      </svg>
    );
  }
  
  // Surveillance symbols
  if (id === 'SURV-DOME') { // Dome Camera
    return (
      <svg {...commonProps}>
        <ellipse cx="30" cy="32" rx="12" ry="8" fill="none" stroke={color} strokeWidth="2" />
        <circle cx="30" cy="25" r="6" fill="none" stroke={color} strokeWidth="2" />
        <circle cx="30" cy="25" r="3" fill={color} />
      </svg>
    );
  }
  
  if (id === 'SURV-BULLET') { // Bullet Camera
    return (
      <svg {...commonProps}>
        <rect x="15" y="25" width="20" height="10" fill="none" stroke={color} strokeWidth="2" />
        <circle cx="35" cy="30" r="8" fill="none" stroke={color} strokeWidth="2" />
        <circle cx="35" cy="30" r="4" fill={color} />
      </svg>
    );
  }
  
  if (id === 'SURV-TURRET') { // Turret Camera
    return (
      <svg {...commonProps}>
        <path d="M20,35 L20,28 Q20,22 26,22 L34,22 Q40,22 40,28 L40,35" fill="none" stroke={color} strokeWidth="2" />
        <circle cx="30" cy="27" r="5" fill="none" stroke={color} strokeWidth="2" />
        <circle cx="30" cy="27" r="2.5" fill={color} />
      </svg>
    );
  }
  
  // Electrical symbols
  if (id === 'ELEC-1G') { // Single Gang Outlet
    return (
      <svg {...commonProps}>
        <circle cx="30" cy="30" r="12" fill="none" stroke={color} strokeWidth="2" />
        <line x1="30" y1="24" x2="30" y2="36" stroke={color} strokeWidth="2" />
        <line x1="24" y1="30" x2="36" y2="30" stroke={color} strokeWidth="2" />
      </svg>
    );
  }
  
  if (id === 'ELEC-2G') { // Double Gang Outlet
    return (
      <svg {...commonProps}>
        <rect x="12" y="22" width="36" height="16" rx="2" fill="none" stroke={color} strokeWidth="2" />
        <line x1="23" y1="26" x2="23" y2="34" stroke={color} strokeWidth="1.5" />
        <line x1="37" y1="26" x2="37" y2="34" stroke={color} strokeWidth="1.5" />
        <line x1="19" y1="30" x2="27" y2="30" stroke={color} strokeWidth="1.5" />
        <line x1="33" y1="30" x2="41" y2="30" stroke={color} strokeWidth="1.5" />
      </svg>
    );
  }
  
  if (id === 'ELEC-DL') { // Dedicated Line
    return (
      <svg {...commonProps}>
        <path d="M20,35 L30,20 L40,35" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <line x1="30" y1="20" x2="30" y2="15" stroke={color} strokeWidth="2" />
      </svg>
    );
  }
  
  // Default fallback
  return (
    <svg {...commonProps}>
      <circle cx="30" cy="30" r="12" fill={color} opacity="0.3" />
      <text x="30" y="35" textAnchor="middle" fill={color} fontSize="10" fontWeight="bold">
        {id.split('-').pop()}
      </text>
    </svg>
  );
};

export default function SymbolPicker({ onSelect, onClose }) {
  const [activeCategory, setActiveCategory] = useState(Object.keys(SYMBOL_CATEGORIES)[0]);
  const symbols = SYMBOL_CATEGORIES[activeCategory];

  return (
    <div className="p-6 space-y-4 w-96">
      <label className="text-sm font-semibold text-gray-300 block">Insert Symbol</label>
      
      {/* Category tabs - 2 rows × 3 columns */}
      <div className="grid grid-cols-3 gap-2">
        {Object.keys(SYMBOL_CATEGORIES).map(category => (
          <button
            key={category}
            onClick={() => setActiveCategory(category)}
            className={`text-xs px-3 py-2 rounded transition-colors ${
              activeCategory === category
                ? 'bg-blue-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-gray-300'
            }`}
          >
            {category}
          </button>
        ))}
      </div>

      {/* Symbols grid */}
      <div className="grid grid-cols-2 gap-3 max-h-80 overflow-y-auto">
        {symbols.map(symbol => (
          <Button
            key={symbol.id}
            onClick={() => {
              onSelect(symbol.id);
              onClose();
            }}
            className="h-auto flex flex-col items-center justify-center p-3 bg-gray-800 border border-gray-700 hover:bg-gray-700 hover:border-gray-500 text-gray-200 transition-all rounded-lg w-full"
            title={symbol.label}
          >
            <SymbolIcon id={symbol.id} color={symbol.color} />
            <span className="text-xs font-medium text-center mt-2 line-clamp-2 w-full">{symbol.label}</span>
          </Button>
        ))}
      </div>
    </div>
  );
}