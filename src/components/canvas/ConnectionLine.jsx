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

export default function ConnectionLine({ from, to, fromEdge, toEdge, connectionType, wireId, waypoints: initialWaypoints, isHighlighted, isSelected, offset = 0, onRemove, onClick, onHover, onLeave, onWaypointsChange, zoom = 1, pan = { x: 0, y: 0 } }) {
  const [isHovered, setIsHovered] = useState(false);
  const [waypoints, setWaypoints] = useState(initialWaypoints || []);
  const [draggingIndex, setDraggingIndex] = useState(null);
  const dragStateRef = useRef(null);
  const currentWaypointsRef = useRef(waypoints);

  // Keep ref in sync with state
  useEffect(() => {
    currentWaypointsRef.current = waypoints;
  }, [waypoints]);

  // Update local waypoints from props only when not dragging
  useEffect(() => {
    if (draggingIndex === null) {
      setWaypoints(initialWaypoints || []);
    }
  }, [initialWaypoints, draggingIndex]);

  const color = connectionTypeColors[connectionType] || "#3b82f6";

  // Generates SVG path by connecting start point → waypoints → end point
  // Waypoints allow users to manually route connections around obstacles
  const generatePath = () => {
    const points = [from, ...waypoints, to];
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

  const handleWaypointMouseDown = (e, index) => {
    e.stopPropagation();
    dragStateRef.current = {
      index,
      startX: e.clientX,
      startY: e.clientY
    };
    setDraggingIndex(index);
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

  // Handles waypoint dragging with zoom-aware calculations
  // Updates waypoint position as user drags it across the canvas
  const handleWindowMouseMove = (e) => {
    if (draggingIndex !== null && dragStateRef.current) {
      const { startX, startY, index } = dragStateRef.current;
      
      // Calculate delta in world space (accounts for zoom level to maintain smooth dragging)
      const dx = (e.clientX - startX) / zoom;
      const dy = (e.clientY - startY) / zoom;
      
      // Store pending update
      const newWaypoints = [...waypoints];
      newWaypoints[index].x += dx;
      newWaypoints[index].y += dy;
      pendingUpdateRef.current = newWaypoints;
      
      // Update drag start for next iteration
      dragStateRef.current.startX = e.clientX;
      dragStateRef.current.startY = e.clientY;

      // Throttle visual updates using requestAnimationFrame
      if (!rafRef.current) {
        rafRef.current = requestAnimationFrame(() => {
          if (pendingUpdateRef.current) {
            setWaypoints(pendingUpdateRef.current);
          }
          rafRef.current = null;
        });
      }
    }
  };

  const handleWindowMouseUp = () => {
    // Cancel any pending animation frame
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    
    // Apply final pending update and notify parent
    if (pendingUpdateRef.current) {
      setWaypoints(pendingUpdateRef.current);
      if (onWaypointsChange) {
        onWaypointsChange(pendingUpdateRef.current);
      }
      pendingUpdateRef.current = null;
    }
    
    dragStateRef.current = null;
    setDraggingIndex(null);
  };

  useEffect(() => {
    if (draggingIndex !== null) {
      window.addEventListener('mousemove', handleWindowMouseMove);
      window.addEventListener('mouseup', handleWindowMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleWindowMouseMove);
        window.removeEventListener('mouseup', handleWindowMouseUp);
      };
    }
  }, [draggingIndex, zoom]);

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
      <path
        d={pathData}
        stroke={color}
        strokeWidth={isSelected ? "6" : isHighlighted ? "6" : isHovered ? "4" : "3"}
        fill="none"
        className="transition-all"
        style={{ 
          pointerEvents: 'none',
          filter: isSelected ? 'drop-shadow(0 0 12px currentColor)' : isHighlighted ? 'drop-shadow(0 0 8px currentColor)' : 'none',
          opacity: isSelected ? 1 : isHighlighted ? 1 : isHovered ? 0.9 : 0.8
        }}
      />
      {/* Invisible larger hit area - makes thin lines easier to click/hover on */}
       <path
        d={pathData}
        stroke="transparent"
        strokeWidth="80"
        fill="none"
        className="cursor-pointer"
        style={{ pointerEvents: 'stroke' }}
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
          style={{ pointerEvents: 'all' }}
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
          style={{ pointerEvents: 'none' }}
        />
      ))}

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

      {/* Delete button - invisible hit area, visible indicator on hover */}
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