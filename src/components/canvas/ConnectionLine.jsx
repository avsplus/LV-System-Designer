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

export default function ConnectionLine({ from, to, fromEdge, toEdge, connectionType, wireId, waypoints: initialWaypoints, isHighlighted, offset = 0, onRemove, onClick, onHover, onLeave, onWaypointsChange }) {
  const [isHovered, setIsHovered] = useState(false);
  const [waypoints, setWaypoints] = useState(initialWaypoints || []);
  const [draggingIndex, setDraggingIndex] = useState(null);
  const waypointRefs = useRef([]);

  const color = connectionTypeColors[connectionType] || "#3b82f6";

  // Generate orthogonal path perpendicular to edges with rounded corners
  const generatePath = () => {
    const standoffDistance = 30;
    const cornerRadius = 12;

    // Exit perpendicular to the edge
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
    
    // Helper to add rounded corner
    const addRoundedCorner = (path, fromPt, cornerPt, toPt, radius) => {
      const dx1 = cornerPt.x - fromPt.x;
      const dy1 = cornerPt.y - fromPt.y;
      const dx2 = toPt.x - cornerPt.x;
      const dy2 = toPt.y - cornerPt.y;
      
      const dist1 = Math.sqrt(dx1 * dx1 + dy1 * dy1);
      const dist2 = Math.sqrt(dx2 * dx2 + dy2 * dy2);
      const r = Math.min(radius, dist1 / 2, dist2 / 2);
      
      if (dist1 === 0 || dist2 === 0) {
        return path;
      }
      
      const startX = cornerPt.x - (dx1 / dist1) * r;
      const startY = cornerPt.y - (dy1 / dist1) * r;
      const endX = cornerPt.x + (dx2 / dist2) * r;
      const endY = cornerPt.y + (dy2 / dist2) * r;
      
      path += ` L ${startX} ${startY} Q ${cornerPt.x} ${cornerPt.y} ${endX} ${endY}`;
      return path;
    };
    
    if (waypoints.length === 0) {
      let path = `M ${from.x} ${from.y} L ${fromStandoff.x} ${fromStandoff.y}`;

      // Determine routing based on edge directions
      const fromIsHorizontal = fromEdge === 'left' || fromEdge === 'right';
      const toIsHorizontal = toEdge === 'left' || toEdge === 'right';

      if (fromIsHorizontal && toIsHorizontal) {
        // Both horizontal: H → V → H (3 segments)
        const midY = (fromStandoff.y + toStandoff.y) / 2;
        const corner1 = { x: fromStandoff.x, y: midY };
        const corner2 = { x: toStandoff.x, y: midY };
        path = addRoundedCorner(path, fromStandoff, corner1, corner2, cornerRadius);
        path = addRoundedCorner(path, corner1, corner2, toStandoff, cornerRadius);
      } else if (!fromIsHorizontal && !toIsHorizontal) {
        // Both vertical: V → H → V (3 segments)
        const midX = (fromStandoff.x + toStandoff.x) / 2;
        const corner1 = { x: midX, y: fromStandoff.y };
        const corner2 = { x: midX, y: toStandoff.y };
        path = addRoundedCorner(path, fromStandoff, corner1, corner2, cornerRadius);
        path = addRoundedCorner(path, corner1, corner2, toStandoff, cornerRadius);
      } else if (fromIsHorizontal && !toIsHorizontal) {
        // H → V: single corner
        const corner1 = { x: toStandoff.x, y: fromStandoff.y };
        path = addRoundedCorner(path, fromStandoff, corner1, toStandoff, cornerRadius);
      } else {
        // V → H: single corner
        const corner1 = { x: fromStandoff.x, y: toStandoff.y };
        path = addRoundedCorner(path, fromStandoff, corner1, toStandoff, cornerRadius);
      }

      path += ` L ${toStandoff.x} ${toStandoff.y} L ${to.x} ${to.y}`;
      return path;
    } else {
      // With waypoints - route through them orthogonally
      let path = `M ${from.x} ${from.y} L ${fromStandoff.x} ${fromStandoff.y}`;

      const fromIsHorizontal = fromEdge === 'left' || fromEdge === 'right';
      const firstWp = waypoints[0];

      if (fromIsHorizontal) {
        path = addRoundedCorner(path, fromStandoff, { x: firstWp.x, y: fromStandoff.y }, firstWp, cornerRadius);
      } else {
        path = addRoundedCorner(path, fromStandoff, { x: fromStandoff.x, y: firstWp.y }, firstWp, cornerRadius);
      }

      for (let i = 1; i < waypoints.length; i++) {
        const prevWp = waypoints[i - 1];
        const currWp = waypoints[i];

        if (Math.abs(currWp.x - prevWp.x) > Math.abs(currWp.y - prevWp.y)) {
          path = addRoundedCorner(path, prevWp, { x: currWp.x, y: prevWp.y }, currWp, cornerRadius);
        } else {
          path = addRoundedCorner(path, prevWp, { x: prevWp.x, y: currWp.y }, currWp, cornerRadius);
        }
      }

      const lastWp = waypoints[waypoints.length - 1];
      const toIsHorizontal = toEdge === 'left' || toEdge === 'right';

      if (toIsHorizontal) {
        path = addRoundedCorner(path, lastWp, { x: toStandoff.x, y: lastWp.y }, toStandoff, cornerRadius);
      } else {
        path = addRoundedCorner(path, lastWp, { x: lastWp.x, y: toStandoff.y }, toStandoff, cornerRadius);
      }

      path += ` L ${toStandoff.x} ${toStandoff.y} L ${to.x} ${to.y}`;
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
        onMouseEnter={() => {
          setIsHovered(true);
          if (onHover) onHover();
        }}
        onMouseLeave={() => {
          setIsHovered(false);
          if (onLeave) onLeave();
        }}
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
        onMouseEnter={() => {
          setIsHovered(true);
          if (onHover) onHover();
        }}
        onMouseLeave={() => {
          setIsHovered(false);
          if (onLeave) onLeave();
        }}
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

      {/* Connection Label */}
      {!isHovered && wireId && (
        <g>
          <rect
            x={midpoint.x - 40}
            y={midpoint.y - 12}
            width="80"
            height="24"
            rx="4"
            fill={color}
            opacity="0.9"
            style={{ pointerEvents: 'none' }}
          />
          <text
            x={midpoint.x}
            y={midpoint.y + 4}
            textAnchor="middle"
            className="fill-white select-none font-medium"
            style={{ fontSize: '11px', pointerEvents: 'none' }}
          >
            {wireId}
          </text>
        </g>
      )}

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
        onMouseEnter={() => {
          setIsHovered(true);
          if (onHover) onHover();
        }}
        onMouseLeave={() => {
          setIsHovered(false);
          if (onLeave) onLeave();
        }}
      />
      {isHovered && (
        <>
          <circle
            cx={midpoint.x}
            cy={midpoint.y}
            r="12"
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
            style={{ fontSize: '14px', pointerEvents: 'none' }}
          >
            ×
          </text>
        </>
      )}
    </g>
  );
}