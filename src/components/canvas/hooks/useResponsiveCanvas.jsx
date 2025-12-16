import React, { useState, useEffect, useCallback, useMemo } from 'react';

// Breakpoints matching Tailwind
const BREAKPOINTS = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536
};

// Base dimensions at 1920px reference width
const BASE_DIMENSIONS = {
  cardWidth: 320,
  cardHeight: 280,
  portDotSize: 20,
  portGap: 12,
  portHitRadius: 50,
  sidebarWidth: 320,
  panelWidth: 400
};

export default function useResponsiveCanvas() {
  const [viewport, setViewport] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 1920,
    height: typeof window !== 'undefined' ? window.innerHeight : 1080,
    devicePixelRatio: typeof window !== 'undefined' ? window.devicePixelRatio : 1,
    isTouchDevice: typeof window !== 'undefined' ? 'ontouchstart' in window : false
  });

  // Update viewport on resize
  useEffect(() => {
    const handleResize = () => {
      setViewport({
        width: window.innerWidth,
        height: window.innerHeight,
        devicePixelRatio: window.devicePixelRatio,
        isTouchDevice: 'ontouchstart' in window || navigator.maxTouchPoints > 0
      });
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);
    
    // Initial call
    handleResize();

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, []);

  // Current breakpoint
  const breakpoint = useMemo(() => {
    const { width } = viewport;
    if (width >= BREAKPOINTS['2xl']) return '2xl';
    if (width >= BREAKPOINTS.xl) return 'xl';
    if (width >= BREAKPOINTS.lg) return 'lg';
    if (width >= BREAKPOINTS.md) return 'md';
    if (width >= BREAKPOINTS.sm) return 'sm';
    return 'xs';
  }, [viewport.width]);

  // Scale factor based on viewport (1.0 at 1920px, scales down for smaller screens)
  const scaleFactor = useMemo(() => {
    const baseWidth = 1920;
    const minScale = 0.6;
    const maxScale = 1.2;
    const scale = viewport.width / baseWidth;
    return Math.min(maxScale, Math.max(minScale, scale));
  }, [viewport.width]);

  // Scaled dimensions
  const dimensions = useMemo(() => {
    const touchMultiplier = viewport.isTouchDevice ? 1.25 : 1;
    
    return {
      cardWidth: Math.round(BASE_DIMENSIONS.cardWidth * scaleFactor),
      cardHeight: Math.round(BASE_DIMENSIONS.cardHeight * scaleFactor),
      portDotSize: Math.round(BASE_DIMENSIONS.portDotSize * scaleFactor * touchMultiplier),
      portGap: Math.round(BASE_DIMENSIONS.portGap * scaleFactor),
      portHitRadius: Math.round(BASE_DIMENSIONS.portHitRadius * touchMultiplier),
      sidebarWidth: breakpoint === 'xs' ? 0 : 
                    breakpoint === 'sm' ? 240 : 
                    breakpoint === 'md' ? 280 : 
                    BASE_DIMENSIONS.sidebarWidth,
      panelWidth: breakpoint === 'xs' ? viewport.width : 
                  breakpoint === 'sm' ? 300 : 
                  breakpoint === 'md' ? 350 : 
                  BASE_DIMENSIONS.panelWidth,
      buttonSize: viewport.isTouchDevice ? 44 : 36,
      minTapTarget: viewport.isTouchDevice ? 44 : 32
    };
  }, [scaleFactor, viewport.isTouchDevice, breakpoint, viewport.width]);

  // Layout helpers
  const layout = useMemo(() => ({
    isMobile: breakpoint === 'xs' || breakpoint === 'sm',
    isTablet: breakpoint === 'md',
    isDesktop: breakpoint === 'lg' || breakpoint === 'xl' || breakpoint === '2xl',
    showSidebar: breakpoint !== 'xs',
    collapsibleSidebar: breakpoint === 'sm' || breakpoint === 'md',
    stackPanels: breakpoint === 'xs' || breakpoint === 'sm'
  }), [breakpoint]);

  // Touch gesture support
  const [touchState, setTouchState] = useState({
    isPinching: false,
    initialDistance: 0,
    initialZoom: 1
  });

  const handleTouchStart = useCallback((e, currentZoom) => {
    if (e.touches.length === 2) {
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const distance = Math.hypot(
        touch2.clientX - touch1.clientX,
        touch2.clientY - touch1.clientY
      );
      setTouchState({
        isPinching: true,
        initialDistance: distance,
        initialZoom: currentZoom
      });
    }
  }, []);

  const handleTouchMove = useCallback((e, onZoomChange) => {
    if (touchState.isPinching && e.touches.length === 2) {
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const distance = Math.hypot(
        touch2.clientX - touch1.clientX,
        touch2.clientY - touch1.clientY
      );
      const scale = distance / touchState.initialDistance;
      const newZoom = Math.min(2, Math.max(0.5, touchState.initialZoom * scale));
      onZoomChange(newZoom);
    }
  }, [touchState]);

  const handleTouchEnd = useCallback(() => {
    setTouchState(prev => ({ ...prev, isPinching: false }));
  }, []);

  // High-DPI canvas setup helper
  const setupHighDPICanvas = useCallback((canvas, width, height) => {
    const dpr = viewport.devicePixelRatio;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
    return ctx;
  }, [viewport.devicePixelRatio]);

  return {
    viewport,
    breakpoint,
    scaleFactor,
    dimensions,
    layout,
    touchState,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    setupHighDPICanvas,
    BREAKPOINTS
  };
}