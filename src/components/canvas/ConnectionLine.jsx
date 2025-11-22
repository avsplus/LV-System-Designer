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

export default function ConnectionLine({ from, to, connectionType, waypoints: initialWaypoints, isHighlighted, offset = 0, onRemove, onClick, onWaypointsChange }) {
  const [isHovered, setIsHovered] = useState(false);
  const [waypoints, setWaypoints] = useState(initialWaypoints || []);
  const [draggingIndex, setDraggingIndex] = useState(null);
  const waypointRefs = useRef([]);

  const color = connectionTypeColors[connectionType] || "#3b82f6";

  // Generate orthogonal path with offset
  const generatePath = () => {
    if (waypoints.length === 0) {
      // Determine if connection exits horizontally or vertically
      const dx = Math.abs(to.x - from.x);
      const dy = Math.abs(to.y - from.y);
      
      if (dx > dy) {
        // Horizontal primary direction - exit horizontally, offset vertically
        const midX = (from.x + to.x) / 2;
        return `M ${from.x} ${from.y + offset} L ${midX} ${from.y + offset} L ${midX} ${to.y + offset} L ${to.x} ${to.y + offset}`;
      } else {
        // Vertical primary direction - exit vertically, offset horizontally
        const midY = (from.y + to.y) / 2;
        return `M ${from.x + offset} ${from.y} L ${from.x + offset} ${midY} L ${to.x + offset} ${midY} L ${to.x + offset} ${to.y}`;
      }
    } else {
      // Path through waypoints - offset applied to segments
      const dx = Math.abs(to.x - from.x);
      const dy = Math.abs(to.y - from.y);
      const primaryHorizontal = dx > dy;
      
      let path = primaryHorizontal 
        ? `M ${from.x} ${from.y + offset}`
        : `M ${from.x + offset} ${from.y}`;
      
      // Route to first waypoint orthogonally
      const firstWp = waypoints[0];
      const dx1 = Math.abs(firstWp.x - from.x);
      const dy1 = Math.abs(firstWp.y - from.y);
      
      if (dx1 > dy1) {
        path += primaryHorizontal 
          ? ` L ${firstWp.x} ${from.y + offset} L ${firstWp.x} ${firstWp.y + offset}`
          : ` L ${firstWp.x} ${from.y + offset} L ${firstWp.x + offset} ${firstWp.y}`;
      } else {
        path += primaryHorizontal 
          ? ` L ${from.x} ${firstWp.y + offset} L ${firstWp.x} ${firstWp.y + offset}`
          : ` L ${from.x + offset} ${firstWp.y} L ${firstWp.x + offset} ${firstWp.y}`;
      }
      
      // Route between waypoints
      for (let i = 1; i < waypoints.length; i++) {
        const prevWp = waypoints[i - 1];
        const currWp = waypoints[i];
        const dxW = Math.abs(currWp.x - prevWp.x);
        const dyW = Math.abs(currWp.y - prevWp.y);
        
        if (dxW > dyW) {
          path += primaryHorizontal
            ? ` L ${currWp.x} ${prevWp.y + offset} L ${currWp.x} ${currWp.y + offset}`
            : ` L ${currWp.x + offset} ${prevWp.y} L ${currWp.x + offset} ${currWp.y}`;
        } else {
          path += primaryHorizontal
            ? ` L ${prevWp.x} ${currWp.y + offset} L ${currWp.x} ${currWp.y + offset}`
            : ` L ${prevWp.x + offset} ${currWp.y} L ${currWp.x + offset} ${currWp.y}`;
        }
      }
      
      // Route from last waypoint to end
      const lastWp = waypoints[waypoints.length - 1];
      const dxL = Math.abs(to.x - lastWp.x);
      const dyL = Math.abs(to.y - lastWp.y);
      
      if (dxL > dyL) {
        path += primaryHorizontal
          ? ` L ${to.x} ${lastWp.y + offset} L ${to.x} ${to.y + offset}`
          : ` L ${to.x + offset} ${lastWp.y} L ${to.x + offset} ${to.y}`;
      } else {
        path += primaryHorizontal
          ? ` L ${lastWp.x} ${to.y + offset} L ${to.x} ${to.y + offset}`
          : ` L ${lastWp.x + offset} ${to.y} L ${to.x + offset} ${to.y}`;
      }
      
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
        strokeWidth={isHighlighted ? "6" : isHovered ? "4" : "3"}
        fill="none"
        className="transition-all cursor-pointer"
        style={{ 
          pointerEvents: 'stroke',
          filter: isHighlighted ? 'drop-shadow(0 0 8px currentColor)' : 'none',
          opacity: isHighlighted ? 1 : isHovered ? 0.9 : 0.8
        }}
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