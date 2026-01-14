import React, { useState } from 'react';
import { Button } from "@/components/ui/button";

const SYMBOL_CATEGORIES = {
  'Audio/Video': [
    { id: 'AV-LS', label: 'Loudspeaker', color: '#f97316' },
    { id: 'AV-DM', label: 'Display Monitor', color: '#f97316' },
    { id: 'AV-VC', label: 'Video Camera', color: '#f97316' },
    { id: 'AV-PS', label: 'Projection Screen', color: '#f97316' },
    { id: 'AV-RC', label: 'Remote AV Control', color: '#f97316' },
    { id: 'AV-WB', label: 'White Board', color: '#f97316' },
    { id: 'AV-MIC', label: 'Microphone', color: '#f97316' }
  ],
  'Communications': [
    { id: 'COMM-PP', label: 'Phone Port', color: '#06b6d4' },
    { id: 'COMM-DP', label: 'Data Port', color: '#06b6d4' },
    { id: 'COMM-PDP', label: 'Phone and Data Port', color: '#06b6d4' },
    { id: 'COMM-TP', label: 'Touch Pad', color: '#06b6d4' },
    { id: 'COMM-CLK', label: 'Clock', color: '#06b6d4' },
    { id: 'COMM-IS', label: 'Intercom Station', color: '#06b6d4' },
    { id: 'COMM-KB', label: 'Keyboard', color: '#06b6d4' }
  ],
  'Security': [
    { id: 'SEC-KP', label: 'Keypad', color: '#ef4444' },
    { id: 'SEC-CP', label: 'Control Panel', color: '#ef4444' },
    { id: 'SEC-FC', label: 'Fire Control', color: '#ef4444' },
    { id: 'SEC-CS', label: 'Contact Switch', color: '#ef4444' },
    { id: 'SEC-VC', label: 'Video Camera', color: '#ef4444' },
    { id: 'SEC-AD', label: 'Audio Device', color: '#ef4444' },
    { id: 'SEC-DET', label: 'Detector', color: '#ef4444' }
  ],
  'Environmental': [
    { id: 'ENV-THERM', label: 'Thermostat', color: '#3b82f6' },
    { id: 'ENV-HUM', label: 'Humidistat', color: '#3b82f6' },
    { id: 'ENV-TH', label: 'Temp/Humidity', color: '#3b82f6' },
    { id: 'ENV-TS', label: 'Temperature Sensor', color: '#3b82f6' },
    { id: 'ENV-HS', label: 'Humidity Sensor', color: '#3b82f6' },
    { id: 'ENV-MISC', label: 'Miscellaneous', color: '#3b82f6' }
  ],
  'Control': [
    { id: 'CTRL-KP', label: 'Keypad', color: '#a855f7' },
    { id: 'CTRL-TP', label: 'Touch Panel', color: '#a855f7' },
    { id: 'CTRL-VOL', label: 'Volume Control', color: '#a855f7' },
    { id: 'CTRL-JOY', label: 'Joystick', color: '#a855f7' },
    { id: 'CTRL-BTN', label: 'Button', color: '#a855f7' },
    { id: 'CTRL-SW', label: 'Control Switch', color: '#a855f7' }
  ],
  'Electrical': [
    { id: 'ELEC-SW', label: 'Switch', color: '#8b5cf6' },
    { id: 'ELEC-RECEPT', label: 'Receptacle', color: '#8b5cf6' },
    { id: 'ELEC-BATT', label: 'Battery', color: '#8b5cf6' },
    { id: 'ELEC-SURGE', label: 'Surge Protector', color: '#8b5cf6' },
    { id: 'ELEC-INVERTER', label: 'Inverter', color: '#8b5cf6' },
    { id: 'ELEC-CHARGER', label: 'Charger Controller', color: '#8b5cf6' }
  ],
  'Network': [
    { id: 'W-6A', label: 'WAP Cat6A', color: '#8b5cf6' },
    { id: 'W-6', label: 'WAP Cat6', color: '#8b5cf6' },
    { id: '#D', label: 'Data Outlet', color: '#3b82f6' },
    { id: '#D@V', label: 'Data + VoIP', color: '#3b82f6' },
    { id: '#D-AV', label: 'AV Outlet', color: '#3b82f6' },
    { id: '#D-C', label: 'Camera Outlet', color: '#3b82f6' }
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