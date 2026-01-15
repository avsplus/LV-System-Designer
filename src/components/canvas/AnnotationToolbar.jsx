import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Type, Square, Circle, Minus, MousePointer, Grid3x3 } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import SymbolPicker from "./SymbolPicker";

const COLORS = [
  { name: 'Blue', value: '#3b82f6' },
  { name: 'Red', value: '#ef4444' },
  { name: 'Green', value: '#22c55e' },
  { name: 'Yellow', value: '#eab308' },
  { name: 'Purple', value: '#a855f7' },
  { name: 'Orange', value: '#f97316' },
  { name: 'White', value: '#ffffff' },
  { name: 'Black', value: '#000000' }
];

const STROKE_WIDTHS = [1, 2, 3, 4, 6];

export default function AnnotationToolbar({ 
  activeTool, 
  onToolChange, 
  color, 
  onColorChange, 
  strokeWidth, 
  onStrokeWidthChange,
  fill,
  onFillChange,
  fontSize,
  onFontSizeChange,
  onAddSymbol
}) {
  const [showSettings, setShowSettings] = useState(false);
  const [showSymbols, setShowSymbols] = useState(true);

  useEffect(() => {
    setShowSymbols(true);
  }, []);

  const tools = [
    { id: 'select', icon: MousePointer, label: 'Select' },
    { id: 'text', icon: Type, label: 'Text' },
    { id: 'rectangle', icon: Square, label: 'Rectangle' },
    { id: 'circle', icon: Circle, label: 'Circle' },
    { id: 'line', icon: Minus, label: 'Line' }
  ];

  return (
    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-50 bg-gray-900 border border-gray-700 rounded-xl shadow-2xl p-3">
      <div className="flex items-center gap-2">
        {/* Tool Buttons */}
        <div className="flex items-center gap-1 pr-2 border-r border-gray-700">
          {tools.map(tool => {
            const Icon = tool.icon;
            return (
              <Button
                key={tool.id}
                size="icon"
                variant={activeTool === tool.id ? "default" : "ghost"}
                onClick={() => onToolChange(tool.id)}
                className={`h-9 w-9 ${
                  activeTool === tool.id 
                    ? 'bg-blue-600 text-white hover:bg-blue-700' 
                    : 'text-gray-400 hover:text-white hover:bg-gray-800'
                }`}
                title={tool.label}
              >
                <Icon className="w-4 h-4" />
              </Button>
            );
          })}
        </div>

        {/* Symbols Button */}
        <div className="pl-2 border-l border-gray-700">
          <Popover open={showSymbols} onOpenChange={setShowSymbols}>
            <PopoverTrigger asChild>
              <Button
                size="icon"
                variant="ghost"
                className="h-9 w-9 text-gray-400 hover:text-white hover:bg-gray-800"
                title="Add Symbol"
              >
                <Grid3x3 className="w-4 h-4" />
              </Button>
            </PopoverTrigger>
          <PopoverContent className="w-auto bg-gray-900 border-gray-700 p-0" side="top" sideOffset={16}>
            <SymbolPicker 
              onSelect={onAddSymbol}
              onClose={() => setShowSymbols(false)}
            />
          </PopoverContent>
        </Popover>

        {/* Settings Button */}
        {activeTool !== 'select' && (
          <Popover open={showSettings} onOpenChange={setShowSettings}>
            <PopoverTrigger asChild>
              <Button
                size="sm"
                variant="outline"
                className="h-9 bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700 hover:text-white"
              >
                <div className="flex items-center gap-2">
                  <div 
                    className="w-4 h-4 rounded border-2"
                    style={{ 
                      backgroundColor: fill ? color : 'transparent',
                      borderColor: color,
                      borderWidth: `${Math.min(strokeWidth, 2)}px`
                    }}
                  />
                  <span className="text-xs">Style</span>
                </div>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64 bg-gray-900 border-gray-700 p-4" side="top">
              <div className="space-y-4">
                {/* Color Picker */}
                <div>
                  <label className="text-xs font-medium text-gray-400 mb-2 block">Color</label>
                  <div className="grid grid-cols-4 gap-2">
                    {COLORS.map(c => (
                      <button
                        key={c.value}
                        onClick={() => onColorChange(c.value)}
                        className={`w-full h-8 rounded border-2 transition-all ${
                          color === c.value 
                            ? 'border-blue-500 scale-110' 
                            : 'border-gray-700 hover:border-gray-500'
                        }`}
                        style={{ backgroundColor: c.value }}
                        title={c.name}
                      />
                    ))}
                  </div>
                </div>

                {/* Stroke Width */}
                {activeTool !== 'text' && (
                  <div>
                    <label className="text-xs font-medium text-gray-400 mb-2 block">
                      Stroke Width: {strokeWidth}px
                    </label>
                    <div className="flex gap-2">
                      {STROKE_WIDTHS.map(width => (
                        <button
                          key={width}
                          onClick={() => onStrokeWidthChange(width)}
                          className={`flex-1 h-8 rounded border transition-all ${
                            strokeWidth === width
                              ? 'bg-blue-600 border-blue-500 text-white'
                              : 'bg-gray-800 border-gray-700 text-gray-400 hover:bg-gray-700'
                          }`}
                        >
                          {width}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Fill Toggle */}
                {(activeTool === 'rectangle' || activeTool === 'circle') && (
                  <div>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={fill}
                        onChange={(e) => onFillChange(e.target.checked)}
                        className="w-4 h-4 rounded border-gray-700 bg-gray-800 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-300">Fill Shape</span>
                    </label>
                  </div>
                )}

                {/* Font Size */}
                {activeTool === 'text' && (
                  <div>
                    <label className="text-xs font-medium text-gray-400 mb-2 block">
                      Font Size: {fontSize}px
                    </label>
                    <input
                      type="range"
                      min="12"
                      max="48"
                      value={fontSize}
                      onChange={(e) => onFontSizeChange(parseInt(e.target.value))}
                      className="w-full"
                    />
                  </div>
                )}
              </div>
            </PopoverContent>
          </Popover>
        )}
      </div>
    </div>
  );
}