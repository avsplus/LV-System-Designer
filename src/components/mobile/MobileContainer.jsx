import React from 'react';

/**
 * Container component that applies mobile-specific styles
 * Prevents rubber-band scrolling and manages safe areas
 */
export default function MobileContainer({ 
  children, 
  className = '',
  header = null,
  showBottomPadding = true 
}) {
  return (
    <div className={`flex flex-col min-h-screen bg-gray-950 ${className}`}>
      {/* Optional header */}
      {header && (
        <div className="fixed top-0 left-0 right-0 z-30">
          {header}
        </div>
      )}

      {/* Main content with safe scrolling */}
      <div 
        className={`flex-1 overflow-y-auto overscroll-none ${header ? 'mt-14' : ''} ${showBottomPadding ? 'pb-20 md:pb-0' : ''}`}
        style={{
          overscrollBehavior: 'none',
          WebkitOverscrollBehavior: 'none'
        }}
      >
        {children}
      </div>
    </div>
  );
}