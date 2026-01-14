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
  const isWAP = id.startsWith('W-');
  
  if (isWAP) {
    return (
      <svg viewBox="0 0 60 60" className="w-7 h-7">
        <circle cx="30" cy="28" r="12" fill={color} />
        <line x1="30" y1="12" x2="30" y2="4" stroke={color} strokeWidth="2" strokeLinecap="round" />
        <line x1="22" y1="15" x2="18" y2="8" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
        <line x1="38" y1="15" x2="42" y2="8" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 60 60" className="w-7 h-7">
      <polygon points="30,8 48,48 12,48" fill={color} />
      <text x="30" y="35" textAnchor="middle" fill="white" fontSize="10" fontWeight="bold" textTransform="uppercase">{id.split('-').pop().slice(0, 2)}</text>
    </svg>
  );
};

export default function SymbolPicker({ onSelect, onClose }) {
  const [activeCategory, setActiveCategory] = useState(Object.keys(SYMBOL_CATEGORIES)[0]);
  const symbols = SYMBOL_CATEGORIES[activeCategory];

  return (
    <div className="p-6 space-y-4 w-96">
      <label className="text-sm font-semibold text-gray-300 block">Insert Symbol</label>
      
      {/* Category tabs */}
      <div className="flex flex-wrap gap-2">
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
      <div className="grid grid-cols-3 gap-3 max-h-80 overflow-y-auto pr-2">
        {symbols.map(symbol => (
          <Button
            key={symbol.id}
            onClick={() => {
              onSelect(symbol.id);
              onClose();
            }}
            className="h-auto flex flex-col items-center justify-center p-3 bg-gray-800 border border-gray-700 hover:bg-gray-700 hover:border-gray-500 text-gray-200 transition-all rounded-lg"
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