import React from 'react';
import { Camera } from 'lucide-react';

export default function SnapshotMarker({ annotation, canvasPos, isSelected, isHovered, scale = 1, onMouseDown, onTouchStart, onTouchEnd }) {
  const size = 48 * scale;
  const imageCount = annotation.images?.length || 0;

  return (
    <div
      style={{
        position: 'absolute',
        left: `${canvasPos.x}px`,
        top: `${canvasPos.y}px`,
        transform: 'translate(-50%, -50%)',
        width: `${size}px`,
        height: `${size}px`,
        zIndex: 1200,
        pointerEvents: 'auto',
        cursor: 'move'
      }}
      onMouseDown={onMouseDown}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      <div
        className={`w-full h-full rounded-full flex items-center justify-center shadow-lg transition-all ${
          isSelected ? 'ring-2 ring-red-400 ring-offset-1' :
          isHovered ? 'ring-2 ring-yellow-300 ring-offset-1' : ''
        }`}
        style={{
          backgroundColor: isSelected ? '#ef4444' : (isHovered ? '#fbbf24' : (annotation.color || '#f59e0b')),
          boxShadow: `0 2px 10px rgba(0,0,0,0.4)`
        }}
      >
        <Camera className="text-white" style={{ width: `${size * 0.5}px`, height: `${size * 0.5}px` }} />
      </div>

      {/* Photo count badge */}
      {imageCount > 0 && (
        <div
          className="absolute -top-1 -right-1 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold"
          style={{ fontSize: '9px', zIndex: 1201 }}
        >
          {imageCount}
        </div>
      )}

      {/* Title tooltip */}
      {(isHovered || isSelected) && annotation.title && (
        <div
          className="absolute left-1/2 -translate-x-1/2 -bottom-7 bg-gray-900 text-white text-xs px-2 py-1 rounded whitespace-nowrap shadow-lg border border-gray-700"
          style={{ zIndex: 1202 }}
        >
          {annotation.title}
        </div>
      )}
    </div>
  );
}