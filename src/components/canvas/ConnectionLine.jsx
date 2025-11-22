import React, { useState, useRef, useEffect } from 'react';

const connectionTypeColors = {
  "HDMI": "#a855f7",
  "Optical": "#06b6d4",
  "Optical/TOSLINK": "#06b6d4",
  "RCA": "#ef4444",
  "XLR": "#22c55e",
  "Speaker Wire": "#f97316",
  "Ethernet": "#3b82f6",
  "USB": "#6366f1",
  "Coaxial": "#eab308"
};

export default function ConnectionLine({ from, to, connectionType, waypoints: initialWaypoints, onRemove, onClick, onWaypointsChange }) {
  const [isHovered, setIsHovered] = useState(false);
  const [waypoints, setWaypoints] = useState(initialWaypoints || []);
  const [draggingIndex, setDraggingIndex] = useState(null);
  const waypointRefs = useRef([]);

  const color = connectionTypeColors[connectionType] || "#3b82f6";

  // Generate orthogonal path
  const generatePath = () => {
    if (waypoints.length === 0) {
      // Default orthogonal routing
      const midX = (from.x + to.x) / 2;
      return `M ${from.x} ${from.y} L ${midX} ${from.y} L ${midX} ${to.y} L ${to.x} ${to.y}`;
    } else {
      // Path through waypoints
      let path = `M ${from.x} ${from.y}`;
      waypoints.forEach(wp => {
        path += ` L ${wp.x} ${wp.y}`;
      });
      path += ` L ${to.x} ${to.y}`;
      return path;
    }
  };

  const pathData = generatePath();

  // Calculate midpoint for delete button
  const getMidpoint = () => {
    if (waypoints.length > 0) {
      const mid = Math.floor(waypoints.length / 2);
      return waypoints[mid];
    }
    const midX = (from.x + to.x) / 2;
    const midY = (from.y + to.y) / 2;
    return { x: midX, y: midY };
  };

  const midpoint = getMidpoint();

  const handleWaypointMouseDown = (e, index) => {
    e.stopPropagation();
    setDraggingIndex(index);
  };

  const handleMouseMove = (e) => {
    if (draggingIndex !== null) {
      const svg = e.currentTarget.closest('svg');
      const pt = svg.createSVGPoint();
      pt.x = e.clientX;
      pt.y = e.clientY;
      const svgP = pt.matrixTransform(svg.getScreenCTM().inverse());
      
      const newWaypoints = [...waypoints];
      newWaypoints[draggingIndex] = { x: svgP.x, y: svgP.y };
      setWaypoints(newWaypoints);
      if (onWaypointsChange) {
        onWaypointsChange(newWaypoints);
      }
    }
  };

  const handleMouseUp = () => {
    setDraggingIndex(null);
  };

  useEffect(() => {
    if (draggingIndex !== null) {
      window.addEventListener('mouseup', handleMouseUp);
      return () => window.removeEventListener('mouseup', handleMouseUp);
    }
  }, [draggingIndex]);

  const handlePathDoubleClick = (e) => {
    e.stopPropagation();
    const svg = e.currentTarget.closest('svg');
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const svgP = pt.matrixTransform(svg.getScreenCTM().inverse());
    
    const newWaypoints = [...waypoints, { x: svgP.x, y: svgP.y }];
    setWaypoints(newWaypoints);
    if (onWaypointsChange) {
      onWaypointsChange(newWaypoints);
    }
  };

  return (
    <g onMouseMove={handleMouseMove}>
      <path
        d={pathData}
        stroke={color}
        strokeWidth={isHovered ? "4" : "3"}
        fill="none"
        className="transition-all cursor-pointer"
        style={{ pointerEvents: 'stroke' }}
        onClick={onClick}
        onDoubleClick={handlePathDoubleClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      />
      {/* Invisible larger hit area */}
      <path
        d={pathData}
        stroke="transparent"
        strokeWidth="20"
        fill="none"
        className="cursor-pointer"
        onClick={onClick}
        onDoubleClick={handlePathDoubleClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      />
      
      {/* Draggable waypoints */}
      {waypoints.map((wp, index) => (
        <circle
          key={index}
          ref={el => waypointRefs.current[index] = el}
          cx={wp.x}
          cy={wp.y}
          r="6"
          fill={color}
          stroke="white"
          strokeWidth="2"
          className="cursor-move"
          style={{ pointerEvents: 'all' }}
          onMouseDown={(e) => handleWaypointMouseDown(e, index)}
        />
      ))}

      {/* Delete button */}
      <circle
        cx={midpoint.x}
        cy={midpoint.y}
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
        cx={midpoint.x}
        cy={midpoint.y}
        r={isHovered ? "12" : "10"}
        fill="#ef4444"
        stroke="#ef4444"
        strokeWidth="2"
        className="transition-all"
        style={{ pointerEvents: 'none' }}
      />
      <text
        x={midpoint.x}
        y={midpoint.y + 1}
        textAnchor="middle"
        className="fill-white select-none font-bold"
        style={{ fontSize: isHovered ? '14px' : '12px', pointerEvents: 'none' }}
      >
        ×
      </text>
    </g>
  );
}