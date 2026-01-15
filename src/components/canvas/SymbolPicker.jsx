import React, { useState } from 'react';
import { Button } from "@/components/ui/button";

const SYMBOL_CATEGORIES = {
  'Audio/Video': [
    { id: 'AV-SP', label: 'Speaker', color: '#f97316' },
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
  const commonProps = { viewBox: "0 0 60 60", className: "w-8 h-8" };
  
  // Audio/Video symbols
  if (id === 'AV-SP') { // Loudspeaker
    return (
      <svg {...commonProps}>
        <path d="M15,20 L25,20 L35,12 L35,48 L25,40 L15,40 Z" fill="none" stroke={color} strokeWidth="2" />
        <path d="M40,22 Q45,30 40,38" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" />
      </svg>
    );
  }
  
  if (id === 'AV-TV') { // Display Monitor
    return (
      <svg {...commonProps}>
        <rect x="10" y="15" width="40" height="25" fill="none" stroke={color} strokeWidth="2" />
        <line x1="30" y1="40" x2="30" y2="45" stroke={color} strokeWidth="2" />
        <line x1="20" y1="45" x2="40" y2="45" stroke={color} strokeWidth="2" />
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
      <svg {...commonProps}>
        <path d="M18,25 L22,30 L18,35" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" />
        <path d="M30,20 L30,40" stroke={color} strokeWidth="2" />
        <path d="M42,25 L38,30 L42,35" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" />
        <circle cx="30" cy="15" r="3" fill={color} />
      </svg>
    );
  }
  
  if (id === 'NET-DO') { // Data Outlet
    return (
      <svg {...commonProps}>
        <path d="M25,15 L15,25 L15,40 L45,40 L45,25 L35,15 Z" fill="none" stroke={color} strokeWidth="2" />
        <path d="M20,30 L40,30" stroke={color} strokeWidth="2" />
      </svg>
    );
  }
  
  if (id === 'NET-PO') { // Phone Outlet
    return (
      <svg {...commonProps}>
        <path d="M25,18 L18,25 L18,38 L25,45 L35,45 L42,38 L42,25 L35,18 Z" fill="none" stroke={color} strokeWidth="2" />
        <path d="M22,30 L38,30" stroke={color} strokeWidth="2" />
      </svg>
    );
  }
  
  if (id === 'NET-DP') { // Data & Phone
    return (
      <svg {...commonProps}>
        <path d="M15,20 L15,35 L27,45 L33,45 L45,35 L45,20 Z" fill="none" stroke={color} strokeWidth="2" />
        <path d="M18,28 L42,28" stroke={color} strokeWidth="2" />
        <line x1="30" y1="20" x2="30" y2="35" stroke={color} strokeWidth="2" />
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
            className="h-auto flex flex-col items-center justify-center p-3 bg-gray-800 border border-gray-700 hover:bg-gray-700 hover:border-gray-500 text-gray-200 transition-all rounded-lg w-full h-20"
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