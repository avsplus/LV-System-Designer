import { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'sonner';

/**
 * Hook encapsulating all annotation state and logic for AVCanvas.
 * Handles placement, dragging, drawing (rect/circle/line), and CRUD.
 */
export default function useCanvasAnnotations({
  annotations, setAnnotations,
  floorplans,
  pan, zoom,
  canvasRef,
  markLocalChange,
  canvasToFloorplanCoords,
  floorplanToCanvasCoords,
  getFloorplanAtPoint,
  isMobile,
}) {
  const [activeTool, setActiveTool] = useState('select');
  const [drawingAnnotation, setDrawingAnnotation] = useState(null);
  const [selectedAnnotation, setSelectedAnnotation] = useState(null);
  const [hoveredAnnotation, setHoveredAnnotation] = useState(null);
  const [annotationColor, setAnnotationColor] = useState('#3b82f6');
  const [annotationStrokeWidth, setAnnotationStrokeWidth] = useState(2);
  const [annotationFill, setAnnotationFill] = useState(false);
  const [annotationFontSize, setAnnotationFontSize] = useState(16);
  const [editingText, setEditingText] = useState(null);
  const [annotationDragInitial, setAnnotationDragInitial] = useState(null);
  const [longPressTimer, setLongPressTimer] = useState(null);
  const [isLongPress, setIsLongPress] = useState(false);

  // Handle snapshot placement on click
  const handleSnapshotClick = useCallback((e) => {
    const canvasRect = canvasRef.current?.getBoundingClientRect();
    if (!canvasRect) return false;
    const canvasX = (e.clientX - canvasRect.left - pan.x) / zoom;
    const canvasY = (e.clientY - canvasRect.top - pan.y) / zoom;
    const floorplan = getFloorplanAtPoint(canvasX, canvasY);
    const position = floorplan ? canvasToFloorplanCoords(canvasX, canvasY, floorplan) : { x: canvasX, y: canvasY };
    const newAnnotation = {
      id: Date.now().toString(), type: 'snapshot', floorplanId: floorplan?.id,
      position, title: 'Snapshot', caption: '', images: [], scale: 1, color: '#f59e0b'
    };
    const updated = [...annotations, newAnnotation];
    setAnnotations(updated);
    setSelectedAnnotation(updated.length - 1);
    markLocalChange();
    return true;
  }, [annotations, setAnnotations, pan, zoom, canvasRef, getFloorplanAtPoint, canvasToFloorplanCoords, markLocalChange]);

  // Handle text placement on click
  const handleTextClick = useCallback((e) => {
    const canvasRect = canvasRef.current?.getBoundingClientRect();
    if (!canvasRect) return false;
    const canvasX = (e.clientX - canvasRect.left - pan.x) / zoom;
    const canvasY = (e.clientY - canvasRect.top - pan.y) / zoom;
    const floorplan = getFloorplanAtPoint(canvasX, canvasY);
    const fpCoords = floorplan ? canvasToFloorplanCoords(canvasX, canvasY, floorplan) : { x: canvasX, y: canvasY };
    const newAnnotation = {
      id: Date.now().toString(), type: 'text', floorplanId: floorplan?.id,
      position: fpCoords, text: 'Text', color: annotationColor, fontSize: annotationFontSize
    };
    setAnnotations([...annotations, newAnnotation]);
    setEditingText(newAnnotation.id);
    markLocalChange();
    return true;
  }, [annotations, setAnnotations, pan, zoom, canvasRef, getFloorplanAtPoint, canvasToFloorplanCoords, annotationColor, annotationFontSize, markLocalChange]);

  // Start drawing shape annotations on mousedown
  const handleAnnotationMouseDown = useCallback((e) => {
    if (activeTool === 'select' || activeTool === 'snapshot' || activeTool === 'text') return;
    const canvasRect = canvasRef.current?.getBoundingClientRect();
    if (!canvasRect) return;
    const canvasX = (e.clientX - canvasRect.left - pan.x) / zoom;
    const canvasY = (e.clientY - canvasRect.top - pan.y) / zoom;
    const floorplan = getFloorplanAtPoint(canvasX, canvasY);
    if (!floorplan) { toast.error('Please draw annotation on a floorplan'); return; }
    const fpCoords = canvasToFloorplanCoords(canvasX, canvasY, floorplan);

    let newAnnotation;
    if (activeTool === 'rectangle') {
      newAnnotation = { id: Date.now().toString(), type: 'rectangle', floorplanId: floorplan.id, position: fpCoords, color: annotationColor, strokeWidth: annotationStrokeWidth, fill: annotationFill, width: 0, height: 0 };
    } else if (activeTool === 'circle') {
      newAnnotation = { id: Date.now().toString(), type: 'circle', floorplanId: floorplan.id, position: fpCoords, color: annotationColor, strokeWidth: annotationStrokeWidth, fill: annotationFill, radius: 0 };
    } else if (activeTool === 'line') {
      newAnnotation = { id: Date.now().toString(), type: 'line', floorplanId: floorplan.id, position: fpCoords, color: annotationColor, strokeWidth: annotationStrokeWidth };
    }
    if (newAnnotation) setDrawingAnnotation(newAnnotation);
  }, [activeTool, pan, zoom, canvasRef, getFloorplanAtPoint, canvasToFloorplanCoords, annotationColor, annotationStrokeWidth, annotationFill]);

  const handleSymbolAnnotationDragStart = useCallback((e, idx) => {
    e.stopPropagation();
    setSelectedAnnotation(idx);
    const ann = annotations[idx];
    const clientX = e.clientX || (e.touches && e.touches[0]?.clientX);
    const clientY = e.clientY || (e.touches && e.touches[0]?.clientY);
    setAnnotationDragInitial({ clientX, clientY, annotationX: ann.position.x, annotationY: ann.position.y, endPosition: ann.endPosition ? { ...ann.endPosition } : null });
  }, [annotations]);

  const handleAnnotationTouchStart = useCallback((e, idx) => {
    if (!isMobile) return;
    const ann = annotations[idx];
    if (ann.locked && !isMobile) return;
    const timer = setTimeout(() => {
      setIsLongPress(true);
      setSelectedAnnotation(idx);
      handleSymbolAnnotationDragStart(e, idx);
    }, 500);
    setLongPressTimer(timer);
  }, [isMobile, annotations, handleSymbolAnnotationDragStart]);

  const handleAnnotationTouchEnd = useCallback(() => {
    if (longPressTimer) { clearTimeout(longPressTimer); setLongPressTimer(null); }
    if (isLongPress) { setIsLongPress(false); setAnnotationDragInitial(null); }
  }, [longPressTimer, isLongPress]);

  const handleUpdateAnnotation = useCallback((index, updatedAnnotation, applyToAll = false) => {
    if (applyToAll) {
      const originalType = annotations[index].type;
      const originalSymbolId = annotations[index].symbolId;
      const updated = annotations.map((ann) => {
        if (ann.type !== originalType) return ann;
        if (ann.type === 'symbol' && ann.symbolId !== originalSymbolId) return ann;
        return { ...ann, color: updatedAnnotation.color, strokeWidth: updatedAnnotation.strokeWidth, fill: updatedAnnotation.fill, fontSize: updatedAnnotation.fontSize };
      });
      setAnnotations(updated);
    } else {
      const updated = [...annotations];
      updated[index] = updatedAnnotation;
      setAnnotations(updated);
    }
    markLocalChange();
  }, [annotations, setAnnotations, markLocalChange]);

  const handleDeleteAnnotation = useCallback((index) => {
    setAnnotations(annotations.filter((_, i) => i !== index));
    setSelectedAnnotation(null);
    markLocalChange();
  }, [annotations, setAnnotations, markLocalChange]);

  const handleDuplicateAnnotation = useCallback((index) => {
    const original = annotations[index];
    if (!original) return;
    const duplicate = {
      ...original, id: Date.now().toString(),
      position: { x: original.position.x + 0.05, y: original.position.y + 0.05 },
      endPosition: original.endPosition ? { x: original.endPosition.x + 0.05, y: original.endPosition.y + 0.05 } : undefined
    };
    const updated = [...annotations, duplicate];
    setAnnotations(updated);
    setSelectedAnnotation(updated.length - 1);
    markLocalChange();
    toast.success('Annotation duplicated');
  }, [annotations, setAnnotations, markLocalChange]);

  // Global move/up handlers for annotation dragging and shape drawing
  const handleAnnotationGlobalMove = useCallback((e, selectedAnnotation) => {
    const clientX = e.clientX || (e.touches && e.touches[0]?.clientX);
    const clientY = e.clientY || (e.touches && e.touches[0]?.clientY);

    if (e.type === 'touchmove' && longPressTimer && !isLongPress) {
      clearTimeout(longPressTimer); setLongPressTimer(null);
    }

    if (annotationDragInitial !== null) {
      const canvasRect = canvasRef.current?.getBoundingClientRect();
      if (canvasRect) {
        const ann = annotations[selectedAnnotation];
        if (!ann) return true;
        const floorplan = ann.floorplanId ? floorplans.find(fp => fp.id === ann.floorplanId) : null;
        const currentCanvasX = (clientX - canvasRect.left - pan.x) / zoom;
        const currentCanvasY = (clientY - canvasRect.top - pan.y) / zoom;
        const newCoords = floorplan ? canvasToFloorplanCoords(currentCanvasX, currentCanvasY, floorplan) : { x: currentCanvasX, y: currentCanvasY };
        setAnnotations(prev => prev.map((a, idx) => {
          if (idx !== selectedAnnotation) return a;
          const updated = { ...a, position: newCoords };
          if (a.type === 'line' && a.endPosition && annotationDragInitial.endPosition) {
            const endDx = annotationDragInitial.endPosition.x - annotationDragInitial.annotationX;
            const endDy = annotationDragInitial.endPosition.y - annotationDragInitial.annotationY;
            updated.endPosition = { x: newCoords.x + endDx, y: newCoords.y + endDy };
          }
          return updated;
        }));
      }
      return true;
    }

    if (drawingAnnotation && activeTool !== 'text') {
      const canvasRect = canvasRef.current?.getBoundingClientRect();
      if (canvasRect) {
        const mouseX = (e.clientX - canvasRect.left - pan.x) / zoom;
        const mouseY = (e.clientY - canvasRect.top - pan.y) / zoom;
        const floorplan = floorplans.find(fp => fp.id === drawingAnnotation.floorplanId);
        if (!floorplan) return true;
        const fpCoords = canvasToFloorplanCoords(mouseX, mouseY, floorplan);
        const startCanvasCoords = floorplanToCanvasCoords(drawingAnnotation.position.x, drawingAnnotation.position.y, floorplan);
        const fpScale = floorplan.scale || 1;
        const hasCalibration = floorplan.imageWidth && floorplan.imageHeight && floorplan.pixelsPerInch;
        let fpWidth = hasCalibration ? floorplan.imageWidth * (1 / floorplan.pixelsPerInch) * fpScale : 500 * fpScale;
        let fpHeight = hasCalibration ? floorplan.imageHeight * (1 / floorplan.pixelsPerInch) * fpScale : (floorplan.imageHeight ? fpWidth * (floorplan.imageHeight / floorplan.imageWidth) : 500 * fpScale);

        if (activeTool === 'line') {
          setDrawingAnnotation(prev => ({ ...prev, endPosition: fpCoords }));
        } else if (activeTool === 'rectangle') {
          const width = Math.abs(mouseX - startCanvasCoords.x);
          const height = Math.abs(mouseY - startCanvasCoords.y);
          setDrawingAnnotation(prev => ({ ...prev, width: width / fpWidth, height: height / fpHeight, position: { x: Math.min(prev.position.x, fpCoords.x), y: Math.min(prev.position.y, fpCoords.y) } }));
        } else if (activeTool === 'circle') {
          const dx = mouseX - startCanvasCoords.x;
          const dy = mouseY - startCanvasCoords.y;
          setDrawingAnnotation(prev => ({ ...prev, radius: Math.sqrt(dx * dx + dy * dy) / fpWidth }));
        }
      }
      return true;
    }
    return false;
  }, [annotationDragInitial, drawingAnnotation, activeTool, pan, zoom, canvasRef, annotations, floorplans, canvasToFloorplanCoords, floorplanToCanvasCoords, longPressTimer, isLongPress, setAnnotations]);

  const handleAnnotationGlobalUp = useCallback((e) => {
    if (longPressTimer) { clearTimeout(longPressTimer); setLongPressTimer(null); }
    if (annotationDragInitial !== null) {
      setAnnotationDragInitial(null);
      setIsLongPress(false);
      markLocalChange();
      return true;
    }
    if (drawingAnnotation) {
      const minRelSize = 0.005;
      let shouldSave = false;
      if (activeTool === 'line' && drawingAnnotation.endPosition) {
        const dist = Math.sqrt(Math.pow(drawingAnnotation.endPosition.x - drawingAnnotation.position.x, 2) + Math.pow(drawingAnnotation.endPosition.y - drawingAnnotation.position.y, 2));
        shouldSave = dist > minRelSize;
      } else if (activeTool === 'rectangle') {
        shouldSave = drawingAnnotation.width > minRelSize && drawingAnnotation.height > minRelSize;
      } else if (activeTool === 'circle') {
        shouldSave = drawingAnnotation.radius > minRelSize;
      }
      if (shouldSave) { setAnnotations([...annotations, drawingAnnotation]); markLocalChange(); }
      setDrawingAnnotation(null);
      return true;
    }
    return false;
  }, [annotationDragInitial, drawingAnnotation, activeTool, annotations, setAnnotations, markLocalChange, longPressTimer]);

  // Drag selection class on body
  useEffect(() => {
    if (annotationDragInitial) document.body.classList.add('canvas-dragging');
    else document.body.classList.remove('canvas-dragging');
    return () => document.body.classList.remove('canvas-dragging');
  }, [annotationDragInitial]);

  return {
    activeTool, setActiveTool,
    drawingAnnotation,
    selectedAnnotation, setSelectedAnnotation,
    hoveredAnnotation, setHoveredAnnotation,
    annotationColor, setAnnotationColor,
    annotationStrokeWidth, setAnnotationStrokeWidth,
    annotationFill, setAnnotationFill,
    annotationFontSize, setAnnotationFontSize,
    editingText, setEditingText,
    annotationDragInitial,
    longPressTimer, isLongPress,
    handleSnapshotClick,
    handleTextClick,
    handleAnnotationMouseDown,
    handleSymbolAnnotationDragStart,
    handleAnnotationTouchStart,
    handleAnnotationTouchEnd,
    handleUpdateAnnotation,
    handleDeleteAnnotation,
    handleDuplicateAnnotation,
    handleAnnotationGlobalMove,
    handleAnnotationGlobalUp,
  };
}