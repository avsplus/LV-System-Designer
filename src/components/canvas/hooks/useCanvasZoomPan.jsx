import { useState, useEffect, useCallback } from 'react';

export default function useCanvasZoomPan(defaultZoom = 1) {
  const [zoom, setZoom] = useState(defaultZoom);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [spacePressed, setSpacePressed] = useState(false);

  const handleZoomIn = useCallback(() => {
    setZoom(prev => Math.min(prev + 0.1, 2));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoom(prev => Math.max(prev - 0.1, 0.1));
  }, []);

  const handleZoomReset = useCallback(() => {
    setZoom(1);
  }, []);

  const handleWheel = useCallback((e, canvasElement) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.05 : 0.05;
    const newZoom = Math.max(0.1, Math.min(2, zoom + delta));
    
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
      
      setPan({ x: newPanX, y: newPanY });
    }
    
    setZoom(newZoom);
  }, [zoom, pan]);

  const handlePanStart = useCallback((e, canvasElement) => {
    // Check if clicking on a device card or interactive element
    const isOnDevice = e.target.closest('[data-instance-id]');
    const isOnButton = e.target.closest('button');
    const isOnPort = e.target.hasAttribute('data-port-type') || e.target.hasAttribute('data-port-id');
    const isOnFloorplan = e.target.tagName === 'IMG'; // Floorplan images

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
    handlePanEnd
  };
}