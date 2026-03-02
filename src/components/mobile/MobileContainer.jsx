import React, { useState, useRef } from 'react';
import { RefreshCw } from 'lucide-react';

/**
 * Container component that applies mobile-specific styles
 * Prevents rubber-band scrolling, manages safe areas, and provides pull-to-refresh
 */
export default function MobileContainer({ 
  children, 
  className = '',
  header = null,
  showBottomPadding = true,
  onRefresh = null
}) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const scrollContainerRef = useRef(null);
  const startYRef = useRef(0);
  const isAtTopRef = useRef(true);

  const handleTouchStart = (e) => {
    startYRef.useRef = e.touches[0].clientY;
    isAtTopRef.current = scrollContainerRef.current?.scrollTop === 0;
  };

  const handleTouchMove = (e) => {
    if (!isAtTopRef.current || isRefreshing) return;

    const currentY = e.touches[0].clientY;
    const distance = currentY - startYRef.useRef;

    if (distance > 0) {
      e.preventDefault();
      setPullDistance(Math.min(distance, 100));
    }
  };

  const handleTouchEnd = async () => {
    if (pullDistance > 60 && onRefresh && !isRefreshing) {
      setIsRefreshing(true);
      try {
        await onRefresh();
      } finally {
        setIsRefreshing(false);
      }
    }
    setPullDistance(0);
  };

  return (
    <div className={`flex flex-col min-h-screen bg-gray-950 ${className}`}>
      {/* Optional header */}
      {header && (
        <div className="fixed top-0 left-0 right-0 z-30">
          {header}
        </div>
      )}

      {/* Pull-to-refresh indicator */}
      {pullDistance > 0 && (
        <div 
          className="fixed top-0 left-0 right-0 flex items-center justify-center bg-gradient-to-b from-blue-500/10 to-transparent z-20"
          style={{ height: `${pullDistance}px` }}
        >
          <RefreshCw 
            className={`w-5 h-5 text-blue-400 ${isRefreshing ? 'animate-spin' : ''}`}
            style={{ 
              transform: `rotate(${Math.min(pullDistance * 3, 360)}deg)`,
              transition: isRefreshing ? 'none' : 'transform 0.2s ease-out'
            }}
          />
        </div>
      )}

      {/* Main content with safe scrolling */}
      <div 
        ref={scrollContainerRef}
        className={`flex-1 overflow-y-auto overscroll-none ${header ? 'mt-14' : ''} ${showBottomPadding ? 'pb-20 md:pb-0' : ''}`}
        style={{
          overscrollBehavior: 'none',
          WebkitOverscrollBehavior: 'none',
          WebkitTouchCallout: 'none'
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {children}
      </div>
    </div>
  );
}