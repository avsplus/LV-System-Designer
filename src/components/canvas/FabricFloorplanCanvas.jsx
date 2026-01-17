import React, { useEffect, useRef, useState } from 'react';
import * as fabric from 'fabric';
import { Button } from "@/components/ui/button";
import { ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';

/**
 * Standalone Fabric.js canvas component for floorplan editing
 * Independent from main app - can be removed/debugged without affecting other code
 */
const FabricFloorplanCanvas = React.forwardRef(({
  floorplanUrl,
  annotations = [],
  onAnnotationsChange,
  width = 1200,
  height = 800,
  readOnly = false,
  activeTool = null,
  onToolUsed = null
}, ref) => {
  const canvasRef = useRef(null);
  const fabricCanvasRef = useRef(null);
  const [zoom, setZoom] = useState(1);
  const isDrawingRef = useRef(false);
  const drawingObjectRef = useRef(null);
  const activeToolRef = useRef(activeTool);
  const onToolUsedRef = useRef(onToolUsed);
  const onAnnotationsChangeRef = useRef(onAnnotationsChange);
  const isLoadingAnnotationsRef = useRef(false);

  // Keep refs in sync
  useEffect(() => {
    activeToolRef.current = activeTool;
    onToolUsedRef.current = onToolUsed;
    onAnnotationsChangeRef.current = onAnnotationsChange;
    
    // Update cursor when tool changes
    if (fabricCanvasRef.current) {
      if (activeTool && !readOnly) {
        fabricCanvasRef.current.defaultCursor = 'crosshair';
      } else {
        fabricCanvasRef.current.defaultCursor = 'default';
      }
    }
  }, [activeTool, onToolUsed, onAnnotationsChange, readOnly]);

  React.useImperativeHandle(ref, () => ({
    getCanvas: () => fabricCanvasRef.current
  }));

  // Initialize Fabric canvas
  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = new fabric.Canvas(canvasRef.current, {
      width,
      height,
      backgroundColor: '#f8fafc',
      selection: !readOnly,
      renderOnAddRemove: true,
      preserveObjectStacking: true
    });

    // Set default cursor
    canvas.defaultCursor = 'default';
    canvas.hoverCursor = 'move';

    fabricCanvasRef.current = canvas;

    // Update cursor based on active tool
    const updateCursor = () => {
      if (activeToolRef.current && !readOnly) {
        canvas.defaultCursor = 'crosshair';
      } else {
        canvas.defaultCursor = 'default';
      }
    };
    updateCursor();

    // Handle mouse events for drawing and panning
    canvas.on('mouse:down', function(opt) {
      const evt = opt.e;
      
      // Panning with Alt+drag
      if (evt.altKey === true) {
        this.isDragging = true;
        this.selection = false;
        this.lastPosX = evt.clientX;
        this.lastPosY = evt.clientY;
        return;
      }

      // Drawing mode
      if (activeToolRef.current && !readOnly) {
        const pointer = canvas.getPointer(opt.e);
        isDrawingRef.current = true;
        this.selection = false;

        if (activeToolRef.current === 'text') {
          const text = new fabric.IText('Click to edit', {
            left: pointer.x,
            top: pointer.y,
            fontSize: 20,
            fill: '#3b82f6',
            fontFamily: 'Arial',
            fontWeight: 600
          });
          canvas.add(text);
          canvas.setActiveObject(text);
          text.enterEditing();
          if (onToolUsedRef.current) onToolUsedRef.current();
          isDrawingRef.current = false;
        } else if (activeToolRef.current === 'rect') {
          const rect = new fabric.Rect({
            left: pointer.x,
            top: pointer.y,
            width: 0,
            height: 0,
            fill: 'transparent',
            stroke: '#3b82f6',
            strokeWidth: 2
          });
          canvas.add(rect);
          drawingObjectRef.current = rect;
        } else if (activeToolRef.current === 'circle') {
          const circle = new fabric.Circle({
            left: pointer.x,
            top: pointer.y,
            radius: 0,
            fill: 'transparent',
            stroke: '#3b82f6',
            strokeWidth: 2
          });
          canvas.add(circle);
          drawingObjectRef.current = circle;
        } else if (activeToolRef.current === 'line') {
          const line = new fabric.Line([pointer.x, pointer.y, pointer.x, pointer.y], {
            stroke: '#3b82f6',
            strokeWidth: 2
          });
          canvas.add(line);
          drawingObjectRef.current = line;
        }
        
        canvas.renderAll();
      }
    });

    canvas.on('mouse:move', function(opt) {
      // Panning
      if (this.isDragging) {
        const e = opt.e;
        const vpt = this.viewportTransform;
        vpt[4] += e.clientX - this.lastPosX;
        vpt[5] += e.clientY - this.lastPosY;
        this.requestRenderAll();
        this.lastPosX = e.clientX;
        this.lastPosY = e.clientY;
        return;
      }

      // Drawing
      if (isDrawingRef.current && drawingObjectRef.current && activeToolRef.current) {
        const pointer = canvas.getPointer(opt.e);
        const obj = drawingObjectRef.current;

        if (activeToolRef.current === 'rect') {
          obj.set({
            width: Math.abs(pointer.x - obj.left),
            height: Math.abs(pointer.y - obj.top)
          });
        } else if (activeToolRef.current === 'circle') {
          const radius = Math.sqrt(
            Math.pow(pointer.x - obj.left, 2) + Math.pow(pointer.y - obj.top, 2)
          );
          obj.set({ radius });
        } else if (activeToolRef.current === 'line') {
          obj.set({ x2: pointer.x, y2: pointer.y });
        }

        canvas.renderAll();
      }
    });

    canvas.on('mouse:up', function() {
      this.setViewportTransform(this.viewportTransform);
      this.isDragging = false;
      this.selection = !readOnly;

      if (isDrawingRef.current && drawingObjectRef.current) {
        isDrawingRef.current = false;
        drawingObjectRef.current = null;
        if (onToolUsedRef.current) onToolUsedRef.current();
        canvas.renderAll();
      }
    });

    // Emit changes when objects are modified
    const handleChange = () => {
      if (readOnly || isLoadingAnnotationsRef.current) return;
      
      const objects = canvas.getObjects();
      const exported = objects.map(obj => {
        const annotation = {
          id: obj.annotationId || `ann_${Date.now()}_${Math.random()}`,
          position: { x: obj.left, y: obj.top }
        };

        if (obj.type === 'i-text') {
          annotation.type = 'text';
          annotation.text = obj.text;
          annotation.fontSize = obj.fontSize;
          annotation.color = obj.fill;
          annotation.rotation = obj.angle;
        } else if (obj.type === 'rect') {
          annotation.type = 'rectangle';
          annotation.width = obj.width;
          annotation.height = obj.height;
          annotation.color = obj.stroke;
          annotation.strokeWidth = obj.strokeWidth;
          annotation.fill = obj.fill !== 'transparent';
          annotation.rotation = obj.angle;
        } else if (obj.type === 'circle') {
          annotation.type = 'circle';
          annotation.radius = obj.radius;
          annotation.color = obj.stroke;
          annotation.strokeWidth = obj.strokeWidth;
          annotation.fill = obj.fill !== 'transparent';
        } else if (obj.type === 'line') {
          annotation.type = 'line';
          annotation.endPosition = { x: obj.x2, y: obj.y2 };
          annotation.color = obj.stroke;
          annotation.strokeWidth = obj.strokeWidth;
        }

        return annotation;
      });

      if (onAnnotationsChangeRef.current) {
        onAnnotationsChangeRef.current(exported);
      }
    };

    if (!readOnly) {
      canvas.on('object:modified', handleChange);
      canvas.on('object:added', handleChange);
      canvas.on('object:removed', handleChange);
    }

    return () => {
      canvas.dispose();
    };
  }, [width, height, readOnly]);

  // Load floorplan image
  useEffect(() => {
    if (!fabricCanvasRef.current || !floorplanUrl) return;

    console.log('Loading floorplan:', floorplanUrl);
    
    // Fabric v6 uses promises, not callbacks
    fabric.FabricImage.fromURL(floorplanUrl, { crossOrigin: 'anonymous' })
      .then((img) => {
        const canvas = fabricCanvasRef.current;
        if (!canvas) return;

        console.log('Image loaded successfully:', img.width, 'x', img.height);
        
        // Scale image to fit canvas
        const scale = Math.min(
          canvas.width / img.width,
          canvas.height / img.height
        ) * 0.9;

        img.scale(scale);
        img.set({
          left: (canvas.width - img.width * scale) / 2,
          top: (canvas.height - img.height * scale) / 2,
          selectable: false,
          evented: false,
          opacity: 0.7
        });

        canvas.backgroundImage = img;
        canvas.renderAll();
        console.log('Background image set and rendered');
      })
      .catch((error) => {
        console.error('Failed to load image:', floorplanUrl, error);
      });
  }, [floorplanUrl]);

  // Load annotations
  useEffect(() => {
    if (!fabricCanvasRef.current || !annotations.length) return;

    const canvas = fabricCanvasRef.current;
    isLoadingAnnotationsRef.current = true;
    canvas.clear();

    annotations.forEach(ann => {
      let obj;

      switch (ann.type) {
        case 'text':
          obj = new fabric.IText(ann.text || 'Text', {
            left: ann.position.x,
            top: ann.position.y,
            fontSize: ann.fontSize || 16,
            fill: ann.color || '#000000',
            fontFamily: 'Arial',
            fontWeight: 600,
            angle: ann.rotation || 0
          });
          break;

        case 'rectangle':
          obj = new fabric.Rect({
            left: ann.position.x - (ann.width || 40) / 2,
            top: ann.position.y - (ann.height || 30) / 2,
            width: ann.width || 40,
            height: ann.height || 30,
            fill: ann.fill ? ann.color + '80' : 'transparent',
            stroke: ann.color || '#3b82f6',
            strokeWidth: ann.strokeWidth || 2,
            angle: ann.rotation || 0
          });
          break;

        case 'circle':
          obj = new fabric.Circle({
            left: ann.position.x - (ann.radius || 20),
            top: ann.position.y - (ann.radius || 20),
            radius: ann.radius || 20,
            fill: ann.fill ? ann.color + '80' : 'transparent',
            stroke: ann.color || '#3b82f6',
            strokeWidth: ann.strokeWidth || 2
          });
          break;

        case 'line':
          if (ann.endPosition) {
            obj = new fabric.Line([
              ann.position.x,
              ann.position.y,
              ann.endPosition.x,
              ann.endPosition.y
            ], {
              stroke: ann.color || '#000000',
              strokeWidth: ann.strokeWidth || 2
            });
          }
          break;

        case 'symbol':
          // For symbols, we'll use a placeholder circle for now
          // Can be enhanced with actual symbol rendering
          obj = new fabric.Circle({
            left: ann.position.x - 20,
            top: ann.position.y - 20,
            radius: 20 * (ann.scale || 1),
            fill: ann.color || '#3b82f6',
            angle: ann.rotation || 0
          });
          break;
      }

      if (obj) {
        obj.set({
          selectable: !readOnly,
          hasControls: !readOnly,
          hasBorders: !readOnly,
          annotationId: ann.id
        });
        canvas.add(obj);
      }
    });

    canvas.renderAll();
    isLoadingAnnotationsRef.current = false;
  }, [annotations, readOnly]);



  // Zoom controls
  const handleZoomIn = () => {
    const newZoom = Math.min(zoom * 1.2, 3);
    setZoom(newZoom);
    fabricCanvasRef.current?.setZoom(newZoom);
    fabricCanvasRef.current?.renderAll();
  };

  const handleZoomOut = () => {
    const newZoom = Math.max(zoom / 1.2, 0.1);
    setZoom(newZoom);
    fabricCanvasRef.current?.setZoom(newZoom);
    fabricCanvasRef.current?.renderAll();
  };

  const handleFitToScreen = () => {
    setZoom(1);
    fabricCanvasRef.current?.setZoom(1);
    fabricCanvasRef.current?.setViewportTransform([1, 0, 0, 1, 0, 0]);
    fabricCanvasRef.current?.renderAll();
  };

  // Export to SVG
  const exportToSVG = () => {
    if (!fabricCanvasRef.current) return null;
    return fabricCanvasRef.current.toSVG();
  };

  return (
    <div className="relative inline-block">
      {/* Zoom controls */}
      <div className="absolute top-4 right-4 z-10 flex flex-col gap-2">
        <Button
          size="icon"
          variant="secondary"
          onClick={handleZoomIn}
          title="Zoom In"
        >
          <ZoomIn className="w-4 h-4" />
        </Button>
        <Button
          size="icon"
          variant="secondary"
          onClick={handleZoomOut}
          title="Zoom Out"
        >
          <ZoomOut className="w-4 h-4" />
        </Button>
        <Button
          size="icon"
          variant="secondary"
          onClick={handleFitToScreen}
          title="Fit to Screen"
        >
          <Maximize2 className="w-4 h-4" />
        </Button>
      </div>

      {/* Fabric canvas */}
      <canvas ref={canvasRef} />

      {/* Instructions */}
      {!readOnly && (
        <div className="mt-2 text-xs text-gray-500">
          Hold Alt + Drag to pan | Zoom: {Math.round(zoom * 100)}%
        </div>
      )}
    </div>
  );
});

FabricFloorplanCanvas.displayName = 'FabricFloorplanCanvas';

// Export utility for external use
FabricFloorplanCanvas.exportToSVG = (fabricCanvasRef) => {
  return fabricCanvasRef.current?.toSVG();
};

export default FabricFloorplanCanvas;