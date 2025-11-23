import React, { useState, useRef } from 'react';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { X, Link2 } from "lucide-react";

const categoryColors = {
  televisions: "bg-blue-500/10 text-blue-400 border-blue-500/50",
  projectors: "bg-purple-500/10 text-purple-400 border-purple-500/50",
  projector_screens: "bg-indigo-500/10 text-indigo-400 border-indigo-500/50",
  video_distribution: "bg-cyan-500/10 text-cyan-400 border-cyan-500/50",
  matrix_switchers: "bg-teal-500/10 text-teal-400 border-teal-500/50",
  audio_streamers: "bg-pink-500/10 text-pink-400 border-pink-500/50",
  media_streamers: "bg-rose-500/10 text-rose-400 border-rose-500/50",
  speakers: "bg-green-500/10 text-green-400 border-green-500/50",
  soundbars: "bg-lime-500/10 text-lime-400 border-lime-500/50",
  subwoofers: "bg-red-500/10 text-red-400 border-red-500/50",
  stereo_amps: "bg-orange-500/10 text-orange-400 border-orange-500/50",
  multizone_amps: "bg-amber-500/10 text-amber-400 border-amber-500/50",
  surround_processors: "bg-yellow-500/10 text-yellow-400 border-yellow-500/50",
  av_receivers: "bg-emerald-500/10 text-emerald-400 border-emerald-500/50"
};

export default function CanvasProduct({ 
        instanceId,
        product, 
        position,
        onRemove,
        onConnect,
        onPositionChange,
        isConnecting,
        isHighlighted,
        onClick,
        label,
        networkInfo
      }) {
  const [isDragging, setIsDragging] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });

  const handleMouseDown = (e) => {
    if (e.target.closest('button')) return;
    
    const clickTime = Date.now();
    const clickPos = { x: e.clientX, y: e.clientY };
    
    setIsDragging(true);
    dragOffset.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y,
      clickTime,
      clickPos
    };
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    e.preventDefault();
    
    const newX = e.clientX - dragOffset.current.x;
    const newY = e.clientY - dragOffset.current.y;
    
    requestAnimationFrame(() => {
      onPositionChange(instanceId, { x: newX, y: newY });
    });
  };

  const handleMouseUp = (e) => {
    const timeDiff = Date.now() - (dragOffset.current.clickTime || 0);
    const moveDist = Math.sqrt(
      Math.pow(e.clientX - (dragOffset.current.clickPos?.x || 0), 2) +
      Math.pow(e.clientY - (dragOffset.current.clickPos?.y || 0), 2)
    );
    
    if (timeDiff < 200 && moveDist < 5 && onClick) {
      onClick();
    }
    
    setIsDragging(false);
  };

  React.useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, position]);

  return (
    <div
      onMouseDown={handleMouseDown}
      style={{
        position: 'absolute',
        left: position.x,
        top: position.y,
        userSelect: 'none',
        willChange: isDragging ? 'transform' : 'auto',
        transition: isDragging ? 'none' : 'border-color 0.15s ease'
      }}
      className={`w-64 min-h-[200px] bg-gray-800 border-2 rounded-xl p-4 cursor-move ${
        isDragging ? 'shadow-2xl shadow-blue-500/30 border-blue-500 scale-105 z-50' : 
        isHighlighted ? 'border-yellow-400 shadow-lg shadow-yellow-400/50' :
        isConnecting ? 'border-blue-500' : 'border-gray-700 hover:border-gray-600'
      }`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          {label && (
            <Badge className="bg-gray-700 text-white border-gray-600 font-mono font-bold">
              {label}
            </Badge>
          )}
          <Badge className={`${categoryColors[product.category]} border`}>
            {product.category.charAt(0).toUpperCase() + product.category.slice(1)}
          </Badge>
        </div>
        <div className="flex gap-1">
          <Button
            size="icon"
            variant="ghost"
            className="h-6 w-6 text-blue-400 hover:text-blue-300 hover:bg-blue-500/10"
            onClick={(e) => {
              e.stopPropagation();
              onConnect(instanceId);
            }}
          >
            <Link2 className="w-3 h-3" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-6 w-6 text-gray-400 hover:text-red-400 hover:bg-red-500/10"
            onClick={(e) => {
              e.stopPropagation();
              onRemove(instanceId);
            }}
          >
            <X className="w-3 h-3" />
          </Button>
        </div>
      </div>
      
      <h3 className="font-semibold text-white text-base mb-1">
        {product.brand}
      </h3>
      <p className="text-sm text-gray-300 mb-2">{product.model}</p>
      
      {product.description && (
        <p className="text-xs text-gray-400 line-clamp-2 mb-2">
          {product.description}
        </p>
      )}
      
      {product.price && (
        <p className="text-sm font-medium text-blue-400">
          ${product.price.toLocaleString()}
        </p>
      )}

      {['av_receivers', 'surround_processors', 'matrix_switchers', 'video_distribution', 'audio_streamers', 'media_streamers'].includes(product.category) && (
        <div className="mt-3 pt-3 border-t border-gray-700 space-y-1">
          <p className="text-xs text-gray-400">
            <span className="text-gray-500">MAC:</span> {networkInfo.mac || '00:00:00:00:00:00'}
          </p>
          <p className="text-xs text-gray-400">
            <span className="text-gray-500">IP:</span> {networkInfo.ip || '000.000.000.000'}
            <span className="mx-1">|</span>
            <span className="text-gray-500">SW#:</span> {networkInfo.sw || '00'} 
            <span className="mx-1">|</span>
            <span className="text-gray-500">Port:</span> {networkInfo.port || '00'}
          </p>
        </div>
      )}
    </div>
  );
}