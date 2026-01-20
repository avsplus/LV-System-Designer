import { useState, useEffect, useCallback } from 'react';

export default function useCanvasZoomPan(defaultZoom = 1) {
  const [zoom, setZoom] = useState(defaultZoom);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [spacePressed, setSpacePressed] = useState(false);
  const [lastTouchDistance, setLastTouchDistance] = useState(null);
  const [lastTouchCenter, setLastTouchCenter] = useState(null);

  const handleZoomIn = useCallback(() => {
    setZoom(prev => Math.min(prev + 0.1, 2.0));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoom(prev => Math.max(prev - 0.1, 0.08));
  }, []);

  const handleZoomReset = useCallback(() => {
    setZoom(1);
  }, []);

  const handleWheel = useCallback((e, canvasElement) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.05 : 0.05;
    const newZoom = Math.max(0.08, Math.min(2.0, zoom + delta));
    
    if (canvasElement) {
      const rect = canvasElement.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      
      // Calculate world position under mouse before zoom
      const worldX = (mouseX - pan.x) / zoom;
      const worldY = (mouseY - pan.y) / zoom;
      
      // Calculate new pan to keep mouse position fixed
      const newPanX = mouseX - worldX * newZoom;
      const newPanY = mouseY - worldY * newZoom;
      
      // Batch updates to reduce flickering
      setPan({ x: newPanX, y: newPanY });
      setZoom(newZoom);
    } else {
      setZoom(newZoom);
    }
  }, [zoom, pan]);

  const handlePanStart = useCallback((e, canvasElement) => {
    // Check if clicking on a device card or interactive element
    const isOnDevice = e.target.closest('[data-instance-id]');
    const isOnButton = e.target.closest('button');
    const isOnPort = e.target.hasAttribute('data-port-type') || e.target.hasAttribute('data-port-id');
    const isOnFloorplan = e.target.tagName === 'IMG' || e.target.closest('[data-floorplan]');

    // Allow panning with middle mouse, space+click, or left click on empty canvas area
    const isMiddleMouse = e.button === 1;
    const isSpacePanning = e.button === 0 && spacePressed;
    const isEmptyCanvasClick = e.button === 0 && !isOnDevice && !isOnButton && !isOnPort && !isOnFloorplan;

    if (isMiddleMouse || isSpacePanning || isEmptyCanvasClick) {
      e.preventDefault();
      setIsPanning(true);
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
      return true;
    }
    return false;
  }, [spacePressed, pan]);

  const handlePanMove = useCallback((e) => {
    if (isPanning) {
      setPan({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y
      });
    }
  }, [isPanning, panStart]);

  const handlePanEnd = useCallback(() => {
    setIsPanning(false);
  }, []);

  // Keyboard handlers for space panning
  useEffect(() => {
    const handleKeyDown = (e) => {
      const isInputField = e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable;
      if (e.code === 'Space' && !e.repeat && !isInputField) {
        e.preventDefault();
        setSpacePressed(true);
      }
    };

    const handleKeyUp = (e) => {
      if (e.code === 'Space') {
        setSpacePressed(false);
        setIsPanning(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Mouse move/up handlers for panning
  useEffect(() => {
    if (isPanning) {
      window.addEventListener('mousemove', handlePanMove);
      window.addEventListener('mouseup', handlePanEnd);
      return () => {
        window.removeEventListener('mousemove', handlePanMove);
        window.removeEventListener('mouseup', handlePanEnd);
      };
    }
  }, [isPanning, handlePanMove, handlePanEnd]);

  // Touch gesture handlers for pinch-to-zoom and two-finger pan
  const getTouchDistance = (touch1, touch2) => {
    const dx = touch1.clientX - touch2.clientX;
    const dy = touch1.clientY - touch2.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const getTouchCenter = (touch1, touch2) => {
    return {
      x: (touch1.clientX + touch2.clientX) / 2,
      y: (touch1.clientY + touch2.clientY) / 2
    };
  };

  const handleTouchStart = useCallback((e, canvasElement) => {
    if (e.touches.length === 2) {
      e.preventDefault();
      const distance = getTouchDistance(e.touches[0], e.touches[1]);
      const center = getTouchCenter(e.touches[0], e.touches[1]);
      setLastTouchDistance(distance);
      setLastTouchCenter(center);
      setIsPanning(false);
    } else if (e.touches.length === 1) {
      const touch = e.touches[0];
      const isOnDevice = e.target.closest('[data-instance-id]');
      const isOnButton = e.target.closest('button');
      const isOnPort = e.target.hasAttribute('data-port-type') || e.target.hasAttribute('data-port-id');
      const isOnFloorplan = e.target.tagName === 'IMG' || e.target.closest('[data-floorplan]');
      
      if (!isOnDevice && !isOnButton && !isOnPort && !isOnFloorplan) {
        setIsPanning(true);
        setPanStart({ x: touch.clientX - pan.x, y: touch.clientY - pan.y });
      }
    }
  }, [pan]);

  const handleTouchMove = useCallback((e, canvasElement) => {
    if (e.touches.length === 2 && lastTouchDistance && lastTouchCenter) {
      e.preventDefault();
      const distance = getTouchDistance(e.touches[0], e.touches[1]);
      const center = getTouchCenter(e.touches[0], e.touches[1]);
      
      // Calculate zoom change
      const zoomDelta = distance / lastTouchDistance;
      const newZoom = Math.max(0.08, Math.min(2.0, zoom * zoomDelta));
      
      if (canvasElement) {
        const rect = canvasElement.getBoundingClientRect();
        const touchX = center.x - rect.left;
        const touchY = center.y - rect.top;
        
        // Calculate world position under touch before zoom
        const worldX = (touchX - pan.x) / zoom;
        const worldY = (touchY - pan.y) / zoom;
        
        // Calculate new pan to keep touch position fixed
        const newPanX = touchX - worldX * newZoom;
        const newPanY = touchY - worldY * newZoom;
        
        // Also account for finger movement during pinch
        const panDeltaX = center.x - lastTouchCenter.x;
        const panDeltaY = center.y - lastTouchCenter.y;
        
        setPan({ x: newPanX + panDeltaX, y: newPanY + panDeltaY });
        setZoom(newZoom);
      }
      
      setLastTouchDistance(distance);
      setLastTouchCenter(center);
    } else if (e.touches.length === 1 && isPanning) {
      e.preventDefault();
      const touch = e.touches[0];
      setPan({
        x: touch.clientX - panStart.x,
        y: touch.clientY - panStart.y
      });
    }
  }, [isPanning, panStart, lastTouchDistance, lastTouchCenter, zoom, pan]);

  const handleTouchEnd = useCallback(() => {
    setLastTouchDistance(null);
    setLastTouchCenter(null);
    setIsPanning(false);
  }, []);

  return {
    zoom,
    setZoom,
    pan,
    setPan,
    isPanning,
    spacePressed,
    handleZoomIn,
    handleZoomOut,
    handleZoomReset,
    handleWheel,
    handlePanStart,
    handlePanMove,
    handlePanEnd,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd
  };
}