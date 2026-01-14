import React from 'react';
import { Button } from "@/components/ui/button";

const SYMBOLS = [
  {
    id: '#D',
    label: 'Data Outlet',
    description: 'Cat6 Data'
  },
  {
    id: '#D@V',
    label: 'Data + VoIP',
    description: 'Cat6 + Phone'
  },
  {
    id: '#D-AV',
    label: 'AV Outlet',
    description: 'HDMI + Audio'
  },
  {
    id: '#D-C',
    label: 'Camera Outlet',
    description: 'IP Camera'
  },
  {
    id: '#D-J',
    label: 'Device Jack',
    description: 'Generic'
  },
  {
    id: 'E',
    label: 'Empty Conduit',
    description: '1" Double Gang'
  },
  {
    id: '#T',
    label: 'Telephone',
    description: 'Analog/Digital'
  },
  {
    id: '#T-A',
    label: 'Analog Phone',
    description: 'Cat5E'
  },
  {
    id: '#T-F',
    label: 'Fax Line',
    description: 'Analog'
  },
  {
    id: '#T-W',
    label: 'Wall Phone',
    description: 'Analog'
  },
  {
    id: 'W-6A',
    label: 'WAP Cat6A',
    description: 'Access Point'
  },
  {
    id: 'W-6',
    label: 'WAP Cat6',
    description: 'Access Point'
  }
];

const SymbolIcon = ({ symbol }) => {
  const getIcon = (id) => {
    const iconMap = {
      '#D': (
        <svg viewBox="0 0 60 60" className="w-6 h-6">
          <rect x="15" y="15" width="30" height="30" fill="currentColor" rx="2"/>
          <text x="30" y="35" textAnchor="middle" fill="white" fontSize="14" fontWeight="bold">#D</text>
        </svg>
      ),
      '#D@V': (
        <svg viewBox="0 0 60 60" className="w-6 h-6">
          <rect x="15" y="15" width="30" height="30" fill="currentColor" rx="2"/>
          <text x="30" y="32" textAnchor="middle" fill="white" fontSize="10" fontWeight="bold">#D</text>
          <text x="30" y="42" textAnchor="middle" fill="white" fontSize="8">@V</text>
        </svg>
      ),
      '#D-AV': (
        <svg viewBox="0 0 60 60" className="w-6 h-6">
          <rect x="10" y="15" width="20" height="30" fill="currentColor" rx="2"/>
          <rect x="30" y="15" width="20" height="30" fill="#ef4444" rx="2"/>
          <text x="20" y="37" textAnchor="middle" fill="white" fontSize="9" fontWeight="bold">D</text>
          <text x="40" y="37" textAnchor="middle" fill="white" fontSize="9" fontWeight="bold">A</text>
        </svg>
      ),
      '#D-C': (
        <svg viewBox="0 0 60 60" className="w-6 h-6">
          <circle cx="30" cy="30" r="15" fill="currentColor"/>
          <text x="30" y="35" textAnchor="middle" fill="white" fontSize="12" fontWeight="bold">📷</text>
        </svg>
      ),
      '#D-J': (
        <svg viewBox="0 0 60 60" className="w-6 h-6">
          <rect x="15" y="15" width="30" height="30" fill="currentColor" rx="4"/>
          <circle cx="30" cy="30" r="3" fill="white"/>
        </svg>
      ),
      'E': (
        <svg viewBox="0 0 60 60" className="w-6 h-6">
          <rect x="12" y="12" width="36" height="36" fill="none" stroke="currentColor" strokeWidth="2" rx="2"/>
          <line x1="30" y1="12" x2="30" y2="48" stroke="currentColor" strokeWidth="1"/>
          <line x1="12" y1="30" x2="48" y2="30" stroke="currentColor" strokeWidth="1"/>
          <text x="30" y="35" textAnchor="middle" fill="currentColor" fontSize="16" fontWeight="bold">E</text>
        </svg>
      ),
      '#T': (
        <svg viewBox="0 0 60 60" className="w-6 h-6">
          <rect x="15" y="15" width="30" height="30" fill="currentColor" rx="2"/>
          <text x="30" y="35" textAnchor="middle" fill="white" fontSize="14" fontWeight="bold">#T</text>
        </svg>
      ),
      '#T-A': (
        <svg viewBox="0 0 60 60" className="w-6 h-6">
          <rect x="15" y="15" width="30" height="30" fill="#f97316" rx="2"/>
          <text x="30" y="32" textAnchor="middle" fill="white" fontSize="10" fontWeight="bold">#T</text>
          <text x="30" y="42" textAnchor="middle" fill="white" fontSize="8">A</text>
        </svg>
      ),
      '#T-F': (
        <svg viewBox="0 0 60 60" className="w-6 h-6">
          <rect x="15" y="15" width="30" height="30" fill="#f97316" rx="2"/>
          <text x="30" y="32" textAnchor="middle" fill="white" fontSize="10" fontWeight="bold">#T</text>
          <text x="30" y="42" textAnchor="middle" fill="white" fontSize="8">F</text>
        </svg>
      ),
      '#T-W': (
        <svg viewBox="0 0 60 60" className="w-6 h-6">
          <rect x="15" y="20" width="30" height="25" fill="#f97316" rx="2"/>
          <text x="30" y="37" textAnchor="middle" fill="white" fontSize="10" fontWeight="bold">#T-W</text>
        </svg>
      ),
      'W-6A': (
        <svg viewBox="0 0 60 60" className="w-6 h-6">
          <circle cx="30" cy="30" r="15" fill="#3b82f6" opacity="0.8"/>
          <text x="30" y="37" textAnchor="middle" fill="white" fontSize="9" fontWeight="bold">W-6A</text>
        </svg>
      ),
      'W-6': (
        <svg viewBox="0 0 60 60" className="w-6 h-6">
          <circle cx="30" cy="30" r="15" fill="#3b82f6"/>
          <text x="30" y="37" textAnchor="middle" fill="white" fontSize="10" fontWeight="bold">W-6</text>
        </svg>
      )
    };
    return iconMap[id] || null;
  };

  return getIcon(symbol);
};

export default function SymbolPicker({ onSelect, onClose }) {
  return (
    <div className="p-4 space-y-4">
      <label className="text-xs font-medium text-gray-400 block">Insert Symbol</label>
      <div className="grid grid-cols-3 gap-2 max-h-96 overflow-y-auto">
        {SYMBOLS.map(symbol => (
          <Button
            key={symbol.id}
            onClick={() => {
              onSelect(symbol.id);
              onClose();
            }}
            className="h-auto flex flex-col items-center justify-center p-3 bg-gray-800 border border-gray-700 hover:bg-gray-700 hover:border-gray-600 text-gray-200 transition-all"
            title={symbol.label}
          >
            <div className="text-gray-400 mb-1">
              <SymbolIcon symbol={symbol.id} />
            </div>
            <span className="text-xs font-medium text-center">{symbol.id}</span>
            <span className="text-[10px] text-gray-500 text-center">{symbol.description}</span>
          </Button>
        ))}
      </div>
    </div>
  );
}