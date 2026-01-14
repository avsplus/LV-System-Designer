import React, { useState } from 'react';
import { X, Trash2 } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";

export default function AnnotationDetailsPanel({ 
  annotation, 
  onClose, 
  onUpdate, 
  onDelete,
  index 
}) {
  const [showDelete, setShowDelete] = useState(false);

  if (!annotation) return null;

  const handleColorChange = (e) => {
    onUpdate(index, { ...annotation, color: e.target.value });
  };

  const handleStrokeWidthChange = (value) => {
    onUpdate(index, { ...annotation, strokeWidth: value[0] });
  };

  const handleFillChange = () => {
    onUpdate(index, { ...annotation, fill: !annotation.fill });
  };

  const handleFontSizeChange = (value) => {
    onUpdate(index, { ...annotation, fontSize: value[0] });
  };

  const handleTextChange = (e) => {
    onUpdate(index, { ...annotation, text: e.target.value });
  };

  const handleRadiusChange = (value) => {
    onUpdate(index, { ...annotation, radius: value[0] });
  };

  const handleWidthChange = (value) => {
    onUpdate(index, { ...annotation, width: value[0] });
  };

  const handleHeightChange = (value) => {
    onUpdate(index, { ...annotation, height: value[0] });
  };

  const getAnnotationLabel = () => {
    if (annotation.type === 'text') return 'Text';
    if (annotation.type === 'rectangle') return 'Rectangle';
    if (annotation.type === 'circle') return 'Circle';
    if (annotation.type === 'line') return 'Line';
    return 'Annotation';
  };

  return (
    <div className="fixed right-0 top-[87px] bottom-0 w-80 bg-gray-900 border-l border-gray-800 z-40 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-gray-800 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">{getAnnotationLabel()} Properties</h2>
        <Button
          size="icon"
          variant="ghost"
          onClick={onClose}
          className="text-gray-400 hover:text-white hover:bg-gray-700"
        >
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        
        {/* Text Content */}
        {annotation.type === 'text' && (
          <div>
            <p className="text-sm text-gray-500 mb-2">Text</p>
            <input
              type="text"
              value={annotation.text || ''}
              onChange={handleTextChange}
              className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none"
              placeholder="Enter text..."
            />
          </div>
        )}

        {/* Color */}
        <div>
          <p className="text-sm text-gray-500 mb-2">Color</p>
          <div className="flex gap-3 items-center">
            <input
              type="color"
              value={annotation.color || '#3b82f6'}
              onChange={handleColorChange}
              className="w-12 h-10 rounded cursor-pointer border border-gray-700"
            />
            <span className="text-sm text-gray-400">{annotation.color}</span>
          </div>
        </div>

        {/* Stroke Width */}
        {annotation.type !== 'text' && (
          <div>
            <div className="flex justify-between items-center mb-2">
              <p className="text-sm text-gray-500">Stroke Width</p>
              <span className="text-sm text-blue-400 font-medium">{annotation.strokeWidth}px</span>
            </div>
            <Slider
              value={[annotation.strokeWidth || 2]}
              onValueChange={handleStrokeWidthChange}
              min={1}
              max={10}
              step={0.5}
              className="w-full"
            />
          </div>
        )}

        {/* Fill Toggle */}
        {annotation.type !== 'text' && annotation.type !== 'line' && (
          <div className="flex items-center gap-3 py-2">
            <input
              type="checkbox"
              id="fill"
              checked={annotation.fill || false}
              onChange={handleFillChange}
              className="w-4 h-4 rounded border-gray-600 cursor-pointer accent-blue-500"
            />
            <label htmlFor="fill" className="text-sm text-gray-300 cursor-pointer">
              Fill Shape
            </label>
          </div>
        )}

        {/* Font Size */}
        {annotation.type === 'text' && (
          <div>
            <div className="flex justify-between items-center mb-2">
              <p className="text-sm text-gray-500">Font Size</p>
              <span className="text-sm text-blue-400 font-medium">{annotation.fontSize}px</span>
            </div>
            <Slider
              value={[annotation.fontSize || 16]}
              onValueChange={handleFontSizeChange}
              min={8}
              max={72}
              step={1}
              className="w-full"
            />
          </div>
        )}

        {/* Radius */}
        {annotation.type === 'circle' && (
          <div>
            <div className="flex justify-between items-center mb-2">
              <p className="text-sm text-gray-500">Radius</p>
              <span className="text-sm text-blue-400 font-medium">{Math.round(annotation.radius || 0)}px</span>
            </div>
            <Slider
              value={[annotation.radius || 0]}
              onValueChange={handleRadiusChange}
              min={5}
              max={500}
              step={1}
              className="w-full"
            />
          </div>
        )}

        {/* Width */}
        {annotation.type === 'rectangle' && (
          <div>
            <div className="flex justify-between items-center mb-2">
              <p className="text-sm text-gray-500">Width</p>
              <span className="text-sm text-blue-400 font-medium">{Math.round(annotation.width || 0)}px</span>
            </div>
            <Slider
              value={[annotation.width || 0]}
              onValueChange={handleWidthChange}
              min={10}
              max={500}
              step={1}
              className="w-full"
            />
          </div>
        )}

        {/* Height */}
        {annotation.type === 'rectangle' && (
          <div>
            <div className="flex justify-between items-center mb-2">
              <p className="text-sm text-gray-500">Height</p>
              <span className="text-sm text-blue-400 font-medium">{Math.round(annotation.height || 0)}px</span>
            </div>
            <Slider
              value={[annotation.height || 0]}
              onValueChange={handleHeightChange}
              min={10}
              max={500}
              step={1}
              className="w-full"
            />
          </div>
        )}

        {/* Position Info */}
        <div className="pt-2 border-t border-gray-800">
          <p className="text-sm text-gray-500 mb-3">Position</p>
          <div className="space-y-2">
            <div className="flex justify-between items-center py-2 border-b border-gray-800">
              <span className="text-xs text-gray-400">X Coordinate</span>
              <span className="text-xs text-gray-200">{Math.round(annotation.position?.x || 0)}px</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-gray-800">
              <span className="text-xs text-gray-400">Y Coordinate</span>
              <span className="text-xs text-gray-200">{Math.round(annotation.position?.y || 0)}px</span>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Button */}
      <div className="border-t border-gray-800 p-4">
        <Button
          onClick={() => setShowDelete(true)}
          className="w-full bg-red-600 hover:bg-red-700 text-white"
        >
          <Trash2 className="w-4 h-4 mr-2" />
          Delete Annotation
        </Button>
      </div>

      {/* Delete Confirmation */}
      {showDelete && (
        <div className="absolute inset-0 bg-black/50 rounded-lg flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
            <p className="text-white mb-4 text-sm">Delete this annotation?</p>
            <div className="flex gap-2">
              <Button
                onClick={() => setShowDelete(false)}
                variant="outline"
                className="flex-1 bg-gray-700 hover:bg-gray-600 text-white border-gray-600"
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  onDelete(index);
                  onClose();
                }}
                className="flex-1 bg-red-600 hover:bg-red-700"
              >
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}