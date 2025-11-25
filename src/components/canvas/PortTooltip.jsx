import React from 'react';

export default function PortTooltip({ type, portCount, color, isInput, position }) {
  if (!position) return null;

  return (
    <div 
      className="fixed z-[9999] pointer-events-none px-3 py-2 rounded-lg shadow-lg border-2 text-xs font-medium whitespace-nowrap"
      style={{
        left: position.x,
        top: position.y,
        backgroundColor: color,
        borderColor: `${color}`,
        color: '#000',
        transform: 'translate(-50%, -120%)',
        boxShadow: `0 4px 12px ${color}40`
      }}
    >
      <div className="flex items-center gap-2">
        <span className="font-semibold">{type}</span>
        <span className="opacity-70">•</span>
        <span className="opacity-80">{isInput ? 'Input' : 'Output'}</span>
        <span className="opacity-70">•</span>
        <span className="opacity-80">{portCount} port{portCount > 1 ? 's' : ''}</span>
      </div>
      <div 
        className="absolute left-1/2 -translate-x-1/2 bottom-0 translate-y-full w-0 h-0"
        style={{
          borderLeft: '6px solid transparent',
          borderRight: '6px solid transparent',
          borderTop: `6px solid ${color}`
        }}
      />
    </div>
  );
}