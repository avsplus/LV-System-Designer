import React, { useState, useCallback, useEffect, useRef } from 'react';
import Cropper from 'react-easy-crop';
import { Button } from "@/components/ui/button";
import { X, Crop, ZoomIn, ZoomOut } from "lucide-react";
import { Slider } from "@/components/ui/slider";

export default function FloorplanCropper({ floorplan, onApply, onCancel }) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [imageDimensions, setImageDimensions] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const onMediaLoaded = useCallback((mediaSize) => {
    console.log('Media loaded in Cropper:', mediaSize);
    setImageDimensions({
      width: mediaSize.naturalWidth,
      height: mediaSize.naturalHeight
    });
    setIsLoading(false);
  }, []);

  const onCropComplete = useCallback((croppedArea, croppedAreaPixels) => {
    console.log('onCropComplete:', { croppedArea, croppedAreaPixels });
    // Only set if we have valid data
    if (croppedAreaPixels && typeof croppedAreaPixels.width === 'number' && croppedAreaPixels.width > 0) {
      setCroppedAreaPixels(croppedAreaPixels);
    }
  }, []);

  const handleApply = () => {
    // Validate croppedAreaPixels has actual data (not just an empty object)
    if (!croppedAreaPixels || !imageDimensions || 
        typeof croppedAreaPixels.width !== 'number' || 
        typeof croppedAreaPixels.height !== 'number') {
      console.error('Missing or invalid crop data:', { croppedAreaPixels, imageDimensions });
      return;
    }

    console.log('Applying crop with data:', {
      croppedAreaPixels,
      imageDimensions
    });

    onApply({ ...croppedAreaPixels, imageDimensions });
  };

  return (
    <div className="fixed inset-0 bg-black z-[10000] flex flex-col">
      {/* Cropper Area */}
      <div className="flex-1 relative">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black z-10">
            <div className="text-white">Loading image...</div>
          </div>
        )}
        <Cropper
          image={floorplan.url}
          crop={crop}
          zoom={zoom}
          aspect={undefined}
          onCropChange={setCrop}
          onZoomChange={setZoom}
          onCropComplete={onCropComplete}
          onMediaLoaded={onMediaLoaded}
          restrictPosition={true}
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
              disabled={!croppedAreaPixels || !imageDimensions || typeof croppedAreaPixels.width !== 'number'}
              className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white px-8 py-6 text-base font-semibold shadow-lg shadow-green-900/50 transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
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