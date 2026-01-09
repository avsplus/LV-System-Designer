import React, { useState, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import { Button } from "@/components/ui/button";
import { X, Crop, ZoomIn, ZoomOut } from "lucide-react";
import { Slider } from "@/components/ui/slider";

export default function FloorplanCropper({ floorplan, onApply, onCancel }) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [croppedAreaPercent, setCroppedAreaPercent] = useState(null);

  const onCropComplete = useCallback((croppedArea, croppedAreaPixels) => {
    setCroppedAreaPercent(croppedArea);
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleApply = () => {
    if (croppedAreaPercent) {
      console.log('🎯 Raw crop from react-easy-crop (%):', croppedAreaPercent);
      console.log('🖼️ Image natural dimensions:', {
        width: floorplan.imageWidth,
        height: floorplan.imageHeight
      });
      
      const cropData = {
        top: croppedAreaPercent.y,
        left: croppedAreaPercent.x,
        width: croppedAreaPercent.width,
        height: croppedAreaPercent.height
      };
      
      console.log('📦 Saving crop data:', cropData);
      onApply(cropData);
    }
  };

  return (
    <div className="fixed inset-0 bg-black z-[10000] flex flex-col">
      {/* Cropper Area */}
      <div className="flex-1 relative">
        <Cropper
          image={floorplan.url}
          crop={crop}
          zoom={zoom}
          aspect={undefined}
          onCropChange={setCrop}
          onZoomChange={setZoom}
          onCropComplete={onCropComplete}
          style={{
            containerStyle: {
              backgroundColor: '#000'
            },
            mediaStyle: {
              objectFit: 'contain'
            }
          }}
        />
      </div>

      {/* Controls */}
      <div className="bg-gray-900/95 backdrop-blur-xl border-t border-gray-700/50 p-6">
        <div className="max-w-4xl mx-auto space-y-4">
          {/* Zoom Control */}
          <div className="flex items-center gap-4">
            <ZoomOut className="w-5 h-5 text-gray-400" />
            <Slider
              value={[zoom]}
              onValueChange={(value) => setZoom(value[0])}
              min={1}
              max={3}
              step={0.1}
              className="flex-1"
            />
            <ZoomIn className="w-5 h-5 text-gray-400" />
            <span className="text-sm text-gray-400 min-w-[4rem] text-right">
              {Math.round(zoom * 100)}%
            </span>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4 justify-center">
            <Button
              onClick={handleApply}
              className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white px-8 py-6 text-base font-semibold shadow-lg shadow-green-900/50 transition-all hover:scale-105"
            >
              <Crop className="w-5 h-5 mr-2" />
              Apply Crop
            </Button>
            <Button
              onClick={onCancel}
              className="bg-gray-800 hover:bg-gray-700 text-white px-8 py-6 text-base font-semibold border border-gray-600 shadow-lg transition-all hover:scale-105"
            >
              <X className="w-5 h-5 mr-2" />
              Cancel
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}