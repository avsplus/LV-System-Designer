import React, { useState } from 'react';

export default function ConnectionLine({ from, to, onRemove }) {
  const [isHovered, setIsHovered] = useState(false);
  const midX = (from.x + to.x) / 2;
  const midY = (from.y + to.y) / 2;
  
  return (
    <g>
      <line
        x1={from.x}
        y1={from.y}
        x2={to.x}
        y2={to.y}
        stroke={isHovered ? "#ef4444" : "#3b82f6"}
        strokeWidth={isHovered ? "3" : "2"}
        strokeDasharray="5,5"
        className="transition-all"
        style={{ pointerEvents: 'none' }}
      />
      {/* Invisible larger hit area */}
      <circle
        cx={midX}
        cy={midY}
        r="20"
        fill="transparent"
        className="cursor-pointer"
        onClick={onRemove}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      />
      {/* Visible delete button */}
      <circle
        cx={midX}
        cy={midY}
        r={isHovered ? "12" : "10"}
        fill={isHovered ? "#ef4444" : "#1f2937"}
        stroke={isHovered ? "#ef4444" : "#3b82f6"}
        strokeWidth="2"
        className="transition-all"
        style={{ pointerEvents: 'none' }}
      />
      <text
        x={midX}
        y={midY + 1}
        textAnchor="middle"
        className="fill-white select-none font-bold"
        style={{ fontSize: isHovered ? '14px' : '12px', pointerEvents: 'none' }}
      >
        ×
      </text>
    </g>
  );
}