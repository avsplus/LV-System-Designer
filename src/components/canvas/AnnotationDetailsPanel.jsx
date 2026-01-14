import React, { useState } from 'react';
import { X, Trash2 } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";

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
    <div className="fixed right-0 top-0 h-screen w-96 bg-gray-800 border-l border-gray-700 shadow-2xl flex flex-col z-40">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-700">
        <h2 className="text-lg font-semibold text-white">{getAnnotationLabel()} Properties</h2>
        <Button
          size="icon"
          variant="ghost"
          onClick={onClose}
          className="text-gray-400 hover:text-white"
        >
          <X className="w-5 h-5" />
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        
        {/* Text Content */}
        {annotation.type === 'text' && (
          <div>
            <Label className="text-gray-300 mb-2 block">Text Content</Label>
            <Input
              type="text"
              value={annotation.text || ''}
              onChange={handleTextChange}
              className="bg-gray-700 border-gray-600 text-white placeholder-gray-400"
              placeholder="Enter text..."
            />
          </div>
        )}

        {/* Color */}
        <div>
          <Label className="text-gray-300 mb-2 block">Color</Label>
          <div className="flex gap-2">
            <input
              type="color"
              value={annotation.color || '#3b82f6'}
              onChange={handleColorChange}
              className="w-12 h-10 rounded cursor-pointer border border-gray-600"
            />
            <span className="text-gray-400 text-sm py-2">{annotation.color}</span>
          </div>
        </div>

        {/* Stroke Width */}
        {annotation.type !== 'text' && (
          <div>
            <Label className="text-gray-300 mb-2 block">
              Stroke Width: <span className="text-blue-400">{annotation.strokeWidth}px</span>
            </Label>
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
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="fill"
              checked={annotation.fill || false}
              onChange={handleFillChange}
              className="w-4 h-4 rounded border-gray-600 cursor-pointer"
            />
            <Label htmlFor="fill" className="text-gray-300 cursor-pointer">
              Fill Shape
            </Label>
          </div>
        )}

        {/* Font Size */}
        {annotation.type === 'text' && (
          <div>
            <Label className="text-gray-300 mb-2 block">
              Font Size: <span className="text-blue-400">{annotation.fontSize}px</span>
            </Label>
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
            <Label className="text-gray-300 mb-2 block">
              Radius: <span className="text-blue-400">{Math.round(annotation.radius || 0)}px</span>
            </Label>
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
            <Label className="text-gray-300 mb-2 block">
              Width: <span className="text-blue-400">{Math.round(annotation.width || 0)}px</span>
            </Label>
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
            <Label className="text-gray-300 mb-2 block">
              Height: <span className="text-blue-400">{Math.round(annotation.height || 0)}px</span>
            </Label>
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
        <div className="pt-4 border-t border-gray-700">
          <h3 className="text-sm font-semibold text-gray-300 mb-3">Position</h3>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <span className="text-gray-500">X:</span>
              <p className="text-gray-300">{Math.round(annotation.position?.x || 0)}px</p>
            </div>
            <div>
              <span className="text-gray-500">Y:</span>
              <p className="text-gray-300">{Math.round(annotation.position?.y || 0)}px</p>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Button */}
      <div className="border-t border-gray-700 p-4">
        <Button
          onClick={() => setShowDelete(true)}
          variant="destructive"
          className="w-full bg-red-600 hover:bg-red-700"
        >
          <Trash2 className="w-4 h-4 mr-2" />
          Delete Annotation
        </Button>
      </div>

      {/* Delete Confirmation */}
      {showDelete && (
        <div className="absolute inset-0 bg-black/50 rounded-lg flex items-center justify-center z-50">
          <div className="bg-gray-700 rounded-lg p-4 border border-gray-600">
            <p className="text-white mb-4">Delete this annotation?</p>
            <div className="flex gap-2">
              <Button
                onClick={() => setShowDelete(false)}
                variant="outline"
                className="bg-gray-600 hover:bg-gray-500 text-white border-gray-500"
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  onDelete(index);
                  onClose();
                }}
                variant="destructive"
                className="bg-red-600 hover:bg-red-700"
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