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

export default function ConnectionLine({ from, to, fromEdge, toEdge, connectionType, waypoints: initialWaypoints, isHighlighted, offset = 0, onRemove, onClick, onWaypointsChange }) {
  const [isHovered, setIsHovered] = useState(false);
  const [waypoints, setWaypoints] = useState(initialWaypoints || []);
  const [draggingIndex, setDraggingIndex] = useState(null);
  const waypointRefs = useRef([]);

  const color = connectionTypeColors[connectionType] || "#3b82f6";

  // Generate orthogonal path perpendicular to edges
  const generatePath = () => {
    const standoffDistance = 30; // Distance to extend perpendicular from edge
    
    // Calculate perpendicular standoff points OUTSIDE the device
    let fromStandoff, toStandoff;
    
    if (fromEdge === 'right') {
      fromStandoff = { x: from.x + standoffDistance, y: from.y };
    } else if (fromEdge === 'left') {
      fromStandoff = { x: from.x - standoffDistance, y: from.y };
    } else if (fromEdge === 'bottom') {
      fromStandoff = { x: from.x, y: from.y + standoffDistance };
    } else { // top
      fromStandoff = { x: from.x, y: from.y - standoffDistance };
    }
    
    if (toEdge === 'right') {
      toStandoff = { x: to.x + standoffDistance, y: to.y };
    } else if (toEdge === 'left') {
      toStandoff = { x: to.x - standoffDistance, y: to.y };
    } else if (toEdge === 'bottom') {
      toStandoff = { x: to.x, y: to.y + standoffDistance };
    } else { // top
      toStandoff = { x: to.x, y: to.y - standoffDistance };
    }
    
    if (waypoints.length === 0) {
      // Route from standoff to standoff
      const dx = toStandoff.x - fromStandoff.x;
      const dy = toStandoff.y - fromStandoff.y;
      
      let path = `M ${from.x} ${from.y} L ${fromStandoff.x} ${fromStandoff.y}`;
      
      if (Math.abs(dx) > Math.abs(dy)) {
        // Horizontal routing
        const midX = (fromStandoff.x + toStandoff.x) / 2;
        path += ` L ${midX} ${fromStandoff.y} L ${midX} ${toStandoff.y}`;
      } else {
        // Vertical routing
        const midY = (fromStandoff.y + toStandoff.y) / 2;
        path += ` L ${fromStandoff.x} ${midY} L ${toStandoff.x} ${midY}`;
      }
      
      path += ` L ${toStandoff.x} ${toStandoff.y} L ${to.x} ${to.y}`;
      return path;
    } else {
      // With waypoints
      const dx = toStandoff.x - fromStandoff.x;
      const dy = toStandoff.y - fromStandoff.y;
      const primaryHorizontal = Math.abs(dx) > Math.abs(dy);
      
      let path = `M ${from.x} ${from.y} L ${fromStandoff.x} ${fromStandoff.y}`;
      
      const firstWp = waypoints[0];
      if (primaryHorizontal) {
        path += ` L ${firstWp.x} ${fromStandoff.y} L ${firstWp.x} ${firstWp.y}`;
      } else {
        path += ` L ${fromStandoff.x} ${firstWp.y} L ${firstWp.x} ${firstWp.y}`;
      }
      
      for (let i = 1; i < waypoints.length; i++) {
        const prevWp = waypoints[i - 1];
        const currWp = waypoints[i];
        
        if (primaryHorizontal) {
          path += ` L ${currWp.x} ${prevWp.y} L ${currWp.x} ${currWp.y}`;
        } else {
          path += ` L ${prevWp.x} ${currWp.y} L ${currWp.x} ${currWp.y}`;
        }
      }
      
      const lastWp = waypoints[waypoints.length - 1];
      if (primaryHorizontal) {
        path += ` L ${toStandoff.x} ${lastWp.y} L ${toStandoff.x} ${toStandoff.y}`;
      } else {
        path += ` L ${lastWp.x} ${toStandoff.y} L ${toStandoff.x} ${toStandoff.y}`;
      }
      
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