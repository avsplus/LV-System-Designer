import React from 'react';
import { Button } from "@/components/ui/button";

const SYMBOLS = [
  { id: '#D', label: 'Data Outlet', color: '#3b82f6' },
  { id: '#D@V', label: 'Data + VoIP', color: '#3b82f6' },
  { id: '#D-AV', label: 'AV Outlet', color: '#3b82f6' },
  { id: '#D-C', label: 'Camera Outlet', color: '#3b82f6' },
  { id: '#D-J', label: 'Device Jack', color: '#3b82f6' },
  { id: 'E', label: 'Empty Conduit', color: '#6b7280' },
  { id: '#T', label: 'Telephone', color: '#f97316' },
  { id: '#T-A', label: 'Analog Phone', color: '#f97316' },
  { id: '#T-F', label: 'Fax Line', color: '#f97316' },
  { id: '#T-W', label: 'Wall Phone', color: '#f97316' },
  { id: 'W-6A', label: 'WAP Cat6A', color: '#8b5cf6' },
  { id: 'W-6', label: 'WAP Cat6', color: '#8b5cf6' }
];

const SymbolIcon = ({ id, color }) => {
  const isWAP = id.startsWith('W-');
  
  if (isWAP) {
    // WAP symbols are circles with antenna lines
    return (
      <svg viewBox="0 0 60 60" className="w-8 h-8">
        {/* Circle */}
        <circle cx="30" cy="28" r="12" fill={color} />
        {/* Antenna lines */}
        <line x1="30" y1="12" x2="30" y2="4" stroke={color} strokeWidth="2" strokeLinecap="round" />
        <line x1="22" y1="15" x2="18" y2="8" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
        <line x1="38" y1="15" x2="42" y2="8" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
        {/* Label */}
        <text x="30" y="58" textAnchor="middle" fill={color} fontSize="10" fontWeight="bold">{id}</text>
      </svg>
    );
  }

  // All other symbols are triangles pointing down with text inside
  return (
    <svg viewBox="0 0 60 60" className="w-8 h-8">
      {/* Triangle pointing down */}
      <polygon points="30,8 48,48 12,48" fill={color} />
      {/* Text label */}
      {id === 'E' ? (
        <text x="30" y="34" textAnchor="middle" fill="white" fontSize="18" fontWeight="bold">E</text>
      ) : id.includes('@') ? (
        <>
          <text x="30" y="30" textAnchor="middle" fill="white" fontSize="9" fontWeight="bold">#D</text>
          <text x="30" y="40" textAnchor="middle" fill="white" fontSize="11" fontWeight="bold">@V</text>
        </>
      ) : id.includes('-') ? (
        <>
          <text x="30" y="28" textAnchor="middle" fill="white" fontSize="8" fontWeight="bold">{id.split('-')[0]}</text>
          <text x="30" y="40" textAnchor="middle" fill="white" fontSize="10" fontWeight="bold">{id.split('-')[1]}</text>
        </>
      ) : (
        <text x="30" y="35" textAnchor="middle" fill="white" fontSize="14" fontWeight="bold">{id}</text>
      )}
    </svg>
  );
};

export default function SymbolPicker({ onSelect, onClose }) {
  return (
    <div className="p-4 space-y-4">
      <label className="text-xs font-medium text-gray-400 block">Insert Symbol</label>
      <div className="grid grid-cols-3 gap-3 max-h-96 overflow-y-auto">
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
            <SymbolIcon id={symbol.id} color={symbol.color} />
            <span className="text-xs font-medium text-center mt-1">{symbol.label}</span>
          </Button>
        ))}
      </div>
    </div>
  );
}