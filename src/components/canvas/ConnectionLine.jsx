import React, { useState, useRef, useEffect } from 'react';

// Maps connection types to visual colors for easy identification on canvas
// Used for coloring connection lines and waypoint handles
const connectionTypeColors = {
  "HDMI": "#E74C3C",
  "Optical": "#2A7FDB",
  "Optical/TOSLINK": "#2A7FDB",
  "RCA": "#FFB300",
  "XLR": "#1ABC9C",
  "Speaker Wire": "#8E5C2C",
  "Ethernet": "#27AE60",
  "USB": "#2A7FDB",
  "Coaxial": "#2A7FDB",
  "3.5mm Jack": "#F4D03F",
  "Component": "#E74C3C",
  "Composite": "#E74C3C",
  "VGA": "#E74C3C",
  "RS232": "#7F8C8D",
  "HDBaseT": "#E91E63",
  "Control": "#7F8C8D",
  "Subwoofer": "#8E5C2C",
  "Wireless": "#27AE60",
  "IR": "#7F8C8D"
};

export default function ConnectionLine({ from, to, fromEdge, toEdge, connectionType, wireId, waypoints: initialWaypoints, isHighlighted, isSelected, offset = 0, onClick, onHover, onLeave, onWaypointsChange, zoom = 1, pan = { x: 0, y: 0 } }) {
  const [isHovered, setIsHovered] = useState(false);
  const [waypoints, setWaypoints] = useState(initialWaypoints || []);
  const [draggingPreview, setDraggingPreview] = useState(null);
  
  // Imperative drag state - NO React state updates during drag
  const dragStateRef = useRef(null);
  const pathRef = useRef(null);
  const hitPathRef = useRef(null);
  const waypointsRef = useRef(initialWaypoints || []);
  const previewPathRef = useRef(null);
  const previewHitPathRef = useRef(null);

  // Keep waypoints ref in sync
  useEffect(() => {
    waypointsRef.current = waypoints;
  }, [waypoints]);

  // Update from props when not dragging
  useEffect(() => {
    if (!dragStateRef.current) {
      setWaypoints(initialWaypoints || []);
    }
  }, [initialWaypoints]);

  const color = connectionTypeColors[connectionType] || "#3b82f6";

  // Generates SVG path by connecting start point → waypoints → end point
  const generatePath = (wps = waypoints) => {
    const points = [from, ...wps, to];
    let path = '';
    
    points.forEach((p, i) => {
      if (i === 0) {
        path += `M ${p.x} ${p.y}`;
      } else {
        path += ` L ${p.x} ${p.y}`;
      }
    });
    
    return path;
  };

  const pathData = generatePath();

  // Calculates midpoint of connection line for positioning delete button and wire ID label
  // Uses middle waypoint if available, otherwise calculates geometric center
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

  const gRef = useRef(null);

  // Imperative path update - no React re-render
  const updatePreviewPath = (previewWaypoints, dragIndex, dragPos) => {
    if (!previewPathRef.current || !previewHitPathRef.current) return;
    const d = generatePath(previewWaypoints);
    previewPathRef.current.setAttribute('d', d);
    previewHitPathRef.current.setAttribute('d', d);
    setDraggingPreview({ index: dragIndex, x: dragPos.x, y: dragPos.y });
  };

  const handleWaypointMouseDown = (e, index) => {
    e.preventDefault();
    e.stopPropagation();
    
    const wp = waypointsRef.current[index];
    
    dragStateRef.current = {
      index,
      startX: e.clientX,
      startY: e.clientY,
      previewWaypoints: [...waypointsRef.current]
    };
    
    // Show initial preview
    setDraggingPreview({ index, x: wp.x, y: wp.y });
    
    // Attach listeners immediately
    window.addEventListener('mousemove', handleWindowMouseMove);
    window.addEventListener('mouseup', handleWindowMouseUp);
    
    // Disable text selection while dragging
    document.body.style.userSelect = 'none';
  };

  const handleWaypointContextMenu = (e, index) => {
    e.preventDefault();
    e.stopPropagation();
    const newWaypoints = waypoints.filter((_, i) => i !== index);
    setWaypoints(newWaypoints);
    if (onWaypointsChange) {
      onWaypointsChange(newWaypoints);
    }
  };

  // Imperative drag handler - updates SVG directly, no React state
  const handleWindowMouseMove = (e) => {
    if (!dragStateRef.current) return;
    
    const { index, startX, startY, previewWaypoints } = dragStateRef.current;
    
    // Calculate delta in world space
    const dx = (e.clientX - startX) / zoom;
    const dy = (e.clientY - startY) / zoom;
    
    // Update preview waypoints directly
    const newPos = {
      x: waypointsRef.current[index].x + dx,
      y: waypointsRef.current[index].y + dy
    };
    previewWaypoints[index] = newPos;
    
    // Update SVG path imperatively - instant, no React
    updatePreviewPath(previewWaypoints, index, newPos);
  };

  const handleWindowMouseUp = () => {
    if (!dragStateRef.current) return;
    
    const { index, previewWaypoints } = dragStateRef.current;
    
    // Commit to React state once
    const finalWaypoints = [...waypointsRef.current];
    finalWaypoints[index] = previewWaypoints[index];
    
    setWaypoints(finalWaypoints);
    if (onWaypointsChange) {
      onWaypointsChange(finalWaypoints);
    }
    
    dragStateRef.current = null;
    setDraggingPreview(null);
    
    // Clean up
    window.removeEventListener('mousemove', handleWindowMouseMove);
    window.removeEventListener('mouseup', handleWindowMouseUp);
    document.body.style.userSelect = '';
  };

  // Double-click to add waypoint at click location
  // Converts screen coordinates to world coordinates accounting for pan and zoom
  const handlePathDoubleClick = (e) => {
    e.stopPropagation();
    const svg = e.target.closest('svg');
    if (!svg) return;
    
    const rect = svg.getBoundingClientRect();
    const svgX = e.clientX - rect.left;
    const svgY = e.clientY - rect.top;
    
    const worldX = (svgX - pan.x) / zoom;
    const worldY = (svgY - pan.y) / zoom;
    
    const newWaypoints = [...waypoints, { x: worldX, y: worldY }];
    setWaypoints(newWaypoints);
    if (onWaypointsChange) {
      onWaypointsChange(newWaypoints);
    }
  };

  return (
    <g>
      {/* Main path */}
      <path
        ref={pathRef}
        d={pathData}
        stroke={color}
        strokeWidth={isSelected ? "6" : isHighlighted ? "6" : isHovered ? "4" : "3"}
        fill="none"
        className="transition-all"
        style={{ 
          pointerEvents: 'none',
          filter: isSelected ? 'drop-shadow(0 0 12px currentColor)' : isHighlighted ? 'drop-shadow(0 0 8px currentColor)' : 'none',
          opacity: draggingPreview ? 0.3 : isSelected ? 1 : isHighlighted ? 1 : isHovered ? 0.9 : 0.8
        }}
      />
      
      {/* Preview path while dragging */}
      {draggingPreview && (
        <>
          <path
            ref={previewPathRef}
            d={pathData}
            stroke={color}
            strokeWidth="3"
            strokeDasharray="8 4"
            fill="none"
            style={{ pointerEvents: 'none' }}
          />
          <path
            ref={previewHitPathRef}
            d={pathData}
            stroke="transparent"
            strokeWidth="20"
            fill="none"
            style={{ pointerEvents: 'none' }}
          />
        </>
      )}
      
      {/* Invisible larger hit area - makes thin lines easier to click/hover on */}
       <path
        ref={hitPathRef}
        d={pathData}
        stroke="transparent"
        strokeWidth="20"
        fill="none"
        className="cursor-pointer"
        style={{ pointerEvents: draggingPreview ? 'none' : 'stroke' }}
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
      
      {/* Waypoint hit area - larger invisible target for easier interaction */}
       {waypoints.map((wp, index) => (
        <circle
          key={`waypoint-hit-${index}`}
          cx={wp.x}
          cy={wp.y}
          r="12"
          fill="transparent"
          stroke="none"
          style={{ pointerEvents: draggingPreview ? 'none' : 'all', opacity: draggingPreview?.index === index ? 0 : 1 }}
          onMouseDown={(e) => handleWaypointMouseDown(e, index)}
          onContextMenu={(e) => handleWaypointContextMenu(e, index)}
          className="cursor-move"
        />
      ))}
      
      {/* Visible waypoint handles */}
      {waypoints.map((wp, index) => (
        <circle
          key={`waypoint-${index}`}
          cx={wp.x}
          cy={wp.y}
          r="6"
          fill={color}
          stroke="white"
          strokeWidth="2"
          style={{ pointerEvents: 'none', opacity: draggingPreview?.index === index ? 0.3 : 1 }}
        />
      ))}
      
      {/* Dragging preview waypoint */}
      {draggingPreview && (
        <circle
          cx={draggingPreview.x}
          cy={draggingPreview.y}
          r="6"
          fill={color}
          stroke="white"
          strokeWidth="2"
          style={{ pointerEvents: 'none' }}
        />
      )}

      {/* Connection Label */}
      {!isHovered && wireId && (
        <g>
          <rect
            x={midpoint.x - 40}
            y={midpoint.y - 10}
            width="80"
            height="20"
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

      {/* Inline delete control intentionally removed. Use connection details panel to delete. */}
    </g>
  );
}
