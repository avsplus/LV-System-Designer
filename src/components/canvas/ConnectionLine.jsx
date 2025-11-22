import React, { useState } from 'react';

export default function ConnectionLine({ from, to, onRemove, onClick }) {
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
        stroke={isHovered ? "#3b82f6" : "#3b82f6"}
        strokeWidth={isHovered ? "3" : "2"}
        strokeDasharray="5,5"
        className="transition-all cursor-pointer"
        style={{ pointerEvents: 'stroke' }}
        onClick={onClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      />
      {/* Invisible larger hit area for line */}
      <line
        x1={from.x}
        y1={from.y}
        x2={to.x}
        y2={to.y}
        stroke="transparent"
        strokeWidth="20"
        className="cursor-pointer"
        onClick={onClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      />
      {/* Delete button */}
      <circle
        cx={midX}
        cy={midY}
        r="20"
        fill="transparent"
        className="cursor-pointer"
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      />
      <circle
        cx={midX}
        cy={midY}
        r={isHovered ? "12" : "10"}
        fill="#ef4444"
        stroke="#ef4444"
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