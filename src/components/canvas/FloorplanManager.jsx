import React, { useState, useRef, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { X, Eye, EyeOff, Trash2, Upload, Ruler, Lock, Unlock } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import * as pdfjsLib from 'pdfjs-dist';

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

export default function FloorplanManager({ floorplans = [], onUpdate, onClose, selectedFloorplanId, onSelectFloorplan }) {
  const [uploading, setUploading] = useState(false);
  const [uploadForm, setUploadForm] = useState({ name: '' });
  const [calibrating, setCalibrating] = useState(null);
  const [calibrationPoints, setCalibrationPoints] = useState([]);
  const [knownDistance, setKnownDistance] = useState('');
  const [calibrationZoom, setCalibrationZoom] = useState(0.25);
  const [editingScale, setEditingScale] = useState(null);
  const fileInputRef = useRef(null);
  const canvasRef = useRef(null);
  const imageRef = useRef(null);

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!uploadForm.name.trim()) {
      toast.error('Please enter a floorplan name');
      return;
    }

    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      
      let imageUrl = file_url;
      let isPdf = file.type === 'application/pdf';

      // If PDF, render first page to canvas and convert to image
      if (isPdf) {
        const loadingTask = pdfjsLib.getDocument(file_url);
        const pdf = await loadingTask.promise;
        const page = await pdf.getPage(1);
        
        const viewport = page.getViewport({ scale: 2 });
        const tempCanvas = document.createElement('canvas');
        const context = tempCanvas.getContext('2d');
        tempCanvas.height = viewport.height;
        tempCanvas.width = viewport.width;

        await page.render({ canvasContext: context, viewport: viewport }).promise;
        imageUrl = tempCanvas.toDataURL('image/png');
      }

      // Get natural dimensions
      const tempImg = new Image();
      tempImg.src = imageUrl;
      await new Promise(resolve => {
        tempImg.onload = () => {
          setCalibrating({
            id: Date.now().toString(),
            name: uploadForm.name,
            url: imageUrl,
            originalUrl: file_url,
            isPdf: isPdf,
            naturalWidth: tempImg.naturalWidth,
            naturalHeight: tempImg.naturalHeight
          });
          resolve();
        };
      });
      setCalibrationPoints([]);
      setKnownDistance('');
      setCalibrationZoom(0.25);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload floorplan');
    }
    setUploading(false);
  };

  const handleToggleVisibility = (id) => {
    onUpdate(floorplans.map(fp => 
      fp.id === id ? { ...fp, visible: !fp.visible } : fp
    ));
  };

  const handleToggleLock = (id) => {
    onUpdate(floorplans.map(fp => 
      fp.id === id ? { ...fp, locked: !fp.locked } : fp
    ));
  };

  const handleLockAll = () => {
    onUpdate(floorplans.map(fp => ({ ...fp, locked: true })));
    toast.success('All floorplans locked');
  };

  const handleUnlockAll = () => {
    onUpdate(floorplans.map(fp => ({ ...fp, locked: false })));
    toast.success('All floorplans unlocked');
  };

  const handleOpacityChange = (id, opacity) => {
    onUpdate(floorplans.map(fp => 
      fp.id === id ? { ...fp, opacity: opacity[0] } : fp
    ));
  };

  const handleDelete = (id) => {
    if (confirm('Delete this floorplan?')) {
      onUpdate(floorplans.filter(fp => fp.id !== id));
    }
  };

  const handleRecalibrate = (floorplan) => {
    setCalibrating({
      ...floorplan,
      isRecalibrating: true,
      originalFloorplan: floorplan
    });
    setCalibrationPoints([]);
    setKnownDistance('');
    setCalibrationZoom(0.25);
  };

  const handleScaleEdit = (id, newScale) => {
    const scale = parseFloat(newScale);
    if (scale > 0) {
      onUpdate(floorplans.map(fp => 
        fp.id === id ? { ...fp, pixelsPerInch: scale } : fp
      ));
      setEditingScale(null);
      toast.success('Scale updated');
    }
  };

  const handleCanvasClick = (e) => {
    if (!calibrating || calibrationPoints.length >= 2) return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) / calibrationZoom;
    const y = (e.clientY - rect.top) / calibrationZoom;

    setCalibrationPoints([...calibrationPoints, { x, y }]);
  };

  const handleCalibrationComplete = () => {
    if (calibrationPoints.length !== 2 || !knownDistance || parseFloat(knownDistance) <= 0) {
      toast.error('Please draw a line and enter a valid distance');
      return;
    }

    const [p1, p2] = calibrationPoints;
    const pixelDistance = Math.sqrt(
      Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2)
    );
    
    // Store as pixels per inch for distance calculations
    const pixelsPerInch = pixelDistance / parseFloat(knownDistance);

    if (calibrating.isRecalibrating) {
      // Update existing floorplan
      onUpdate(floorplans.map(fp => 
        fp.id === calibrating.id ? { ...fp, pixelsPerInch } : fp
      ));
      toast.success('Floorplan recalibrated');
    } else {
      // Get image dimensions from calibrating object (captured during upload)
      const imageWidth = calibrating.naturalWidth;
      const imageHeight = calibrating.naturalHeight;
      
      // Calculate position offset for new floorplan (200px right of last one)
      const lastFloorplan = floorplans[floorplans.length - 1];
      const position = lastFloorplan && lastFloorplan.position
        ? { x: lastFloorplan.position.x + 200, y: lastFloorplan.position.y }
        : { x: 0, y: 0 };

      const newFloorplan = {
        id: calibrating.id,
        name: calibrating.name,
        url: calibrating.url,
        originalUrl: calibrating.originalUrl || calibrating.url,
        isPdf: calibrating.isPdf,
        pixelsPerInch: pixelsPerInch,
        imageWidth: imageWidth,
        imageHeight: imageHeight,
        position: position,
        visible: true,
        opacity: 0.3
      };

      onUpdate([...floorplans, newFloorplan]);
      setUploadForm({ name: '' });
      toast.success('Floorplan calibrated and added');
    }
    
    setCalibrating(null);
    setCalibrationPoints([]);
    setKnownDistance('');
  };

  const handleCancelCalibration = () => {
    setCalibrating(null);
    setCalibrationPoints([]);
    setKnownDistance('');
  };

  useEffect(() => {
    if (!calibrating || !canvasRef.current || !imageRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const img = imageRef.current;

    const draw = () => {
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      ctx.drawImage(img, 0, 0, img.naturalWidth, img.naturalHeight);

      // Draw calibration points and line
      if (calibrationPoints.length > 0) {
        calibrationPoints.forEach((point, i) => {
          ctx.fillStyle = '#3b82f6';
          ctx.beginPath();
          ctx.arc(point.x, point.y, 5, 0, 2 * Math.PI);
          ctx.fill();
          
          ctx.fillStyle = 'white';
          ctx.font = '12px sans-serif';
          ctx.fillText(i === 0 ? 'A' : 'B', point.x + 8, point.y - 8);
        });

        if (calibrationPoints.length === 2) {
          ctx.strokeStyle = '#3b82f6';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(calibrationPoints[0].x, calibrationPoints[0].y);
          ctx.lineTo(calibrationPoints[1].x, calibrationPoints[1].y);
          ctx.stroke();
        }
      }
    };

    if (img.complete) {
      draw();
    } else {
      img.onload = draw;
    }
  }, [calibrating, calibrationPoints, calibrationZoom]);

  if (calibrating) {
    return (
      <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 max-w-4xl w-full mx-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-white">Calibrate Scale</h3>
              <p className="text-sm text-gray-400">Click two points with a known distance</p>
            </div>
            <Button
              size="icon"
              variant="ghost"
              onClick={handleCancelCalibration}
              className="text-gray-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          <div className="mb-3 flex items-center gap-3 px-2">
            <span className="text-sm text-gray-400">Zoom:</span>
            <input
              type="range"
              value={calibrationZoom * 100}
              onChange={(e) => setCalibrationZoom(parseFloat(e.target.value) / 100)}
              min={10}
              max={200}
              step={5}
              className="flex-1 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
              style={{
                accentColor: '#3b82f6'
              }}
            />
            <span className="text-sm text-white w-12">{Math.round(calibrationZoom * 100)}%</span>
          </div>
          
          <div className="bg-gray-800 rounded-lg overflow-auto max-h-[60vh]" style={{ padding: '16px' }}>
            <div style={{ 
              transform: `scale(${calibrationZoom})`, 
              transformOrigin: 'top left',
              width: 'fit-content'
            }}>
              <img
                ref={imageRef}
                src={calibrating.url}
                alt="Floorplan"
                className="hidden"
              />
              <canvas
                ref={canvasRef}
                onClick={handleCanvasClick}
                className="cursor-crosshair border border-gray-700 rounded"
              />
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <Ruler className="w-4 h-4" />
              <span>
                {calibrationPoints.length === 0 && 'Click point A'}
                {calibrationPoints.length === 1 && 'Click point B'}
                {calibrationPoints.length === 2 && 'Enter the known distance'}
              </span>
            </div>

            {calibrationPoints.length === 2 && (
              <div className="flex gap-2">
                <Input
                  type="number"
                  value={knownDistance}
                  onChange={(e) => setKnownDistance(e.target.value)}
                  placeholder="Distance in inches (e.g., 120)"
                  className="bg-gray-800 border-gray-700 text-white"
                  autoFocus
                />
                <Button
                  onClick={handleCalibrationComplete}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  Complete
                </Button>
              </div>
            )}

            {calibrationPoints.length > 0 && (
              <Button
                variant="outline"
                onClick={() => setCalibrationPoints([])}
                className="w-full border-gray-700"
              >
                Reset Points
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed right-0 top-[72px] bottom-0 w-80 bg-gray-900 border-l border-gray-800 z-40 overflow-y-auto">
      <div className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">Floorplans</h3>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={handleLockAll}
              className="text-xs text-gray-400 hover:text-white"
            >
              <Lock className="w-3 h-3 mr-1" />
              Lock All
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={handleUnlockAll}
              className="text-xs text-gray-400 hover:text-white"
            >
              <Unlock className="w-3 h-3 mr-1" />
              Unlock All
            </Button>
            <Button
              size="icon"
              variant="ghost"
              onClick={onClose}
              className="text-gray-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Upload Form */}
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-3 mb-4">
          <h4 className="text-sm font-medium text-white mb-3">Add Floorplan</h4>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Name</label>
              <Input
                value={uploadForm.name}
                onChange={(e) => setUploadForm({ ...uploadForm, name: e.target.value })}
                placeholder="e.g., First Floor"
                className="bg-gray-900 border-gray-700 text-white text-sm"
              />
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,application/pdf"
              onChange={handleUpload}
              className="hidden"
            />
            <Button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              <Upload className="w-4 h-4 mr-2" />
              {uploading ? 'Uploading...' : 'Upload Image'}
            </Button>
          </div>
        </div>

        {/* Floorplan List */}
        <div className="space-y-3">
          {floorplans.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-4">No floorplans yet</p>
          ) : (
            floorplans.map((fp) => (
              <div 
                key={fp.id} 
                onClick={() => onSelectFloorplan?.(fp.id)}
                className={`bg-gray-800 border rounded-lg p-3 cursor-pointer transition-all ${
                  selectedFloorplanId === fp.id 
                    ? 'border-blue-500 ring-2 ring-blue-500/50' 
                    : 'border-gray-700 hover:border-gray-600'
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                      <h4 className="text-sm font-medium text-white">{fp.name}</h4>
                      {editingScale === fp.id ? (
                        <div className="flex gap-1 mt-1">
                          <Input
                            type="number"
                            defaultValue={fp.pixelsPerInch?.toFixed(2) || ''}
                            placeholder="px/inch"
                            className="h-6 text-xs bg-gray-900 border-gray-700"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleScaleEdit(fp.id, e.target.value);
                              if (e.key === 'Escape') setEditingScale(null);
                            }}
                          />
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => setEditingScale(null)}
                            className="h-6 w-6 text-gray-400"
                          >
                            <X className="w-3 h-3" />
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                          <p className="text-xs text-gray-500">
                            Scale: {fp.pixelsPerInch ? `${fp.pixelsPerInch.toFixed(2)} px/inch` : 'Not calibrated'}
                          </p>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRecalibrate(fp);
                            }}
                            className="h-5 w-5 text-blue-400 hover:text-blue-300"
                            title="Recalibrate"
                          >
                            <Ruler className="w-3 h-3" />
                          </Button>
                        </div>
                      )}
                    </div>
                    <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleLock(fp.id);
                        }}
                        className={`h-7 w-7 ${fp.locked ? 'text-yellow-400 hover:text-yellow-300' : 'text-gray-400 hover:text-gray-300'}`}
                        title={fp.locked ? 'Unlock' : 'Lock'}
                      >
                        {fp.locked ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleVisibility(fp.id);
                        }}
                        className="h-7 w-7 text-orange-400 hover:text-orange-300"
                      >
                        {fp.visible ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(fp.id);
                        }}
                        className="h-7 w-7 text-red-500 hover:text-red-400"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                </div>
                
                {fp.visible && (
                  <div className="space-y-1" onClick={(e) => e.stopPropagation()}>
                    <label className="text-xs text-gray-400">Opacity: {Math.round(fp.opacity * 100)}%</label>
                    <Slider
                      value={[fp.opacity]}
                      onValueChange={(value) => handleOpacityChange(fp.id, value)}
                      min={0}
                      max={1}
                      step={0.05}
                      className="w-full"
                    />
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}