import React, { useState, useRef, useEffect } from 'react';
import { Trash2 } from 'lucide-react';
import { Button } from "@/components/ui/button";

export default function CanvasRiser({ 
  riser, 
  onRemove, 
  onPositionChange,
  onClick,
  isSelected,
  zoom,
  registerPort,
  getPortId,
  onPortMouseDown,
  hoveredPortId
}) {
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState(null);
  const riserRef = useRef(null);
  const portRef = useRef(null);

  // Register riser as a connection port
  useEffect(() => {
    if (portRef.current && registerPort && getPortId) {
      const portId = getPortId(riser.id, 'Ethernet', 'riser', false);
      registerPort(portId, portRef.current, riser.id, 'Ethernet', 'riser', false);
      return () => registerPort(portId, null);
    }
  }, [riser.id, registerPort, getPortId]);

  const handleMouseDown = (e) => {
    // Don't handle if clicking on the port circle itself
    if (e.target === portRef.current || portRef.current?.contains(e.target)) {
      return;
    }
    
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    
    const startData = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      startX: riser.position.x,
      startY: riser.position.y
    };
    
    setDragStart(startData);
    setIsDragging(true);
    
    const handleMouseMove = (moveEvent) => {
      const dx = (moveEvent.clientX - startData.mouseX) / zoom;
      const dy = (moveEvent.clientY - startData.mouseY) / zoom;
      
      onPositionChange(riser.id, {
        x: startData.startX + dx,
        y: startData.startY + dy
      });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      setDragStart(null);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  return (
    <div
      ref={riserRef}
      onMouseDown={handleMouseDown}
      onClick={(e) => {
        e.stopPropagation();
        onClick(riser);
      }}
      style={{
        position: 'absolute',
        left: `${riser.position.x}px`,
        top: `${riser.position.y}px`,
        pointerEvents: 'auto',
        cursor: isDragging ? 'grabbing' : 'grab',
        zIndex: isSelected ? 100 : 50
      }}
      className="group"
    >
      {/* Riser Circle - acts as connection port */}
      <div 
        ref={portRef}
        onMouseDown={(e) => {
          if (onPortMouseDown && e.button === 0) {
            e.stopPropagation();
            e.preventDefault();
            console.log('🎯 Riser port mousedown:', riser.id);
            onPortMouseDown(riser.id, 'Ethernet', 'riser', false, portRef.current);
          }
        }}
        className={`w-16 h-16 rounded-full flex items-center justify-center transition-all ${
          hoveredPortId === getPortId?.(riser.id, 'Ethernet', 'riser', false)
            ? 'bg-green-500 border-4 border-green-300 shadow-lg shadow-green-500/50'
            : isSelected 
            ? 'bg-purple-600 border-4 border-purple-300 shadow-lg shadow-purple-500/50' 
            : 'bg-purple-500 border-3 border-purple-300 hover:bg-purple-600 hover:shadow-lg'
        }`}
      >
        <span className="text-white font-bold text-lg pointer-events-none">{riser.label}</span>
      </div>

      {/* Label below */}
      <div className="absolute top-[70px] left-1/2 -translate-x-1/2 bg-gray-900/90 px-2 py-1 rounded text-xs text-white whitespace-nowrap">
        Riser {riser.label}
      </div>

      {/* Delete button on hover */}
      <Button
        size="icon"
        variant="destructive"
        onClick={(e) => {
          e.stopPropagation();
          onRemove(riser.id);
        }}
        className="absolute -top-2 -right-2 w-6 h-6 opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <Trash2 className="w-3 h-3" />
      </Button>
    </div>
  );
}