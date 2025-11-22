import React from 'react';

export default function ConnectionLine({ from, to, onRemove }) {
  const midX = (from.x + to.x) / 2;
  const midY = (from.y + to.y) / 2;
  
  return (
    <g>
      <line
        x1={from.x}
        y1={from.y}
        x2={to.x}
        y2={to.y}
        stroke="#3b82f6"
        strokeWidth="2"
        strokeDasharray="5,5"
        className="transition-all"
      />
      <circle
        cx={midX}
        cy={midY}
        r="8"
        fill="#1f2937"
        stroke="#3b82f6"
        strokeWidth="2"
        className="cursor-pointer hover:fill-red-500 hover:stroke-red-500 transition-colors"
        onClick={onRemove}
      />
      <text
        x={midX}
        y={midY + 1}
        textAnchor="middle"
        className="text-xs fill-white pointer-events-none select-none"
        style={{ fontSize: '10px' }}
      >
        ×
      </text>
    </g>
  );
}