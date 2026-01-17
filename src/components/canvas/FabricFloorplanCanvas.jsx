import React, { useEffect, useRef, useState } from 'react';
import { fabric } from 'fabric';
import { Button } from "@/components/ui/button";
import { ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';

/**
 * Standalone Fabric.js canvas component for floorplan editing
 * Independent from main app - can be removed/debugged without affecting other code
 */
export default function FabricFloorplanCanvas({
  floorplanUrl,
  annotations = [],
  onAnnotationsChange,
  width = 1200,
  height = 800,
  readOnly = false
}) {
  const canvasRef = useRef(null);
  const fabricCanvasRef = useRef(null);
  const [zoom, setZoom] = useState(1);

  // Initialize Fabric canvas
  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = new fabric.Canvas(canvasRef.current, {
      width,
      height,
      backgroundColor: '#f8fafc',
      selection: !readOnly,
      renderOnAddRemove: true
    });

    fabricCanvasRef.current = canvas;

    // Enable panning with Alt+drag
    canvas.on('mouse:down', function(opt) {
      const evt = opt.e;
      if (evt.altKey === true) {
        this.isDragging = true;
        this.selection = false;
        this.lastPosX = evt.clientX;
        this.lastPosY = evt.clientY;
      }
    });

    canvas.on('mouse:move', function(opt) {
      if (this.isDragging) {
        const e = opt.e;
        const vpt = this.viewportTransform;
        vpt[4] += e.clientX - this.lastPosX;
        vpt[5] += e.clientY - this.lastPosY;
        this.requestRenderAll();
        this.lastPosX = e.clientX;
        this.lastPosY = e.clientY;
      }
    });

    canvas.on('mouse:up', function() {
      this.setViewportTransform(this.viewportTransform);
      this.isDragging = false;
      this.selection = !readOnly;
    });

    // Emit changes when objects are modified
    if (!readOnly) {
      canvas.on('object:modified', () => {
        exportAnnotations();
      });
      canvas.on('object:added', () => {
        exportAnnotations();
      });
      canvas.on('object:removed', () => {
        exportAnnotations();
      });
    }

    return () => {
      canvas.dispose();
    };
  }, [width, height, readOnly]);

  // Load floorplan image
  useEffect(() => {
    if (!fabricCanvasRef.current || !floorplanUrl) return;

    fabric.Image.fromURL(floorplanUrl, (img) => {
      const canvas = fabricCanvasRef.current;
      
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

      canvas.setBackgroundImage(img, canvas.renderAll.bind(canvas));
    }, { crossOrigin: 'anonymous' });
  }, [floorplanUrl]);

  // Load annotations
  useEffect(() => {
    if (!fabricCanvasRef.current || !annotations.length) return;

    const canvas = fabricCanvasRef.current;
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
  }, [annotations, readOnly]);

  // Export annotations from Fabric canvas
  const exportAnnotations = () => {
    if (!fabricCanvasRef.current || readOnly) return;

    const canvas = fabricCanvasRef.current;
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

    if (onAnnotationsChange) {
      onAnnotationsChange(exported);
    }
  };

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
}

// Export utility for external use
FabricFloorplanCanvas.exportToSVG = (fabricCanvasRef) => {
  return fabricCanvasRef.current?.toSVG();
};