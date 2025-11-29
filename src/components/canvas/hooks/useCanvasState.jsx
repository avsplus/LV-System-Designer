import { useState, useEffect, useCallback } from 'react';

export default function useCanvasState(orgSettings) {
  const [zoom, setZoom] = useState(orgSettings?.default_zoom || 1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [spacePressed, setSpacePressed] = useState(false);

  const handleZoomIn = useCallback(() => {
    setZoom(prev => Math.min(prev + 0.1, 2));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoom(prev => Math.max(prev - 0.1, 0.5));
  }, []);

  const handleZoomReset = useCallback(() => {
    setZoom(1);
  }, []);

  const handleWheel = useCallback((e) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.05 : 0.05;
    setZoom(prev => Math.max(0.5, Math.min(2, prev + delta)));
  }, []);

  const handleCanvasMouseDown = useCallback((e, canvasRef) => {
    if (e.button === 1 || (e.button === 0 && spacePressed) || (e.button === 0 && e.target === canvasRef?.current)) {
      e.preventDefault();
      setIsPanning(true);
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  }, [spacePressed, pan]);

  const handlePanMouseMove = useCallback((e) => {
    if (isPanning) {
      setPan({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y
      });
    }
  }, [isPanning, panStart]);

  const handlePanMouseUp = useCallback(() => {
    setIsPanning(false);
  }, []);

  // Space key listeners for pan mode
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

  // Pan mouse move/up listeners
  useEffect(() => {
    if (isPanning) {
      window.addEventListener('mousemove', handlePanMouseMove);
      window.addEventListener('mouseup', handlePanMouseUp);
      return () => {
        window.removeEventListener('mousemove', handlePanMouseMove);
        window.removeEventListener('mouseup', handlePanMouseUp);
      };
    }
  }, [isPanning, handlePanMouseMove, handlePanMouseUp]);

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
    handleCanvasMouseDown
  };
}