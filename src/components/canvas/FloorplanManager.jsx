import React, { useState, useRef, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { X, Eye, EyeOff, Trash2, Upload, Ruler, Lock, Unlock, Home, ChevronDown, ChevronUp, Tv, Video, RectangleHorizontal, Box, Network, LayoutGrid, Music, Play, Speaker, Volume2, AudioLines, Gauge, Layers, Cpu, Radio, Router, Settings2, Cable, GripVertical, Pencil, Check, Circle, Compass, Wifi, Phone, HardDrive, Camera, Plug, Edit3, Type, Square, Minus } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import * as pdfjsLib from 'pdfjs-dist';
import FabricFloorplanCanvas from './FabricFloorplanCanvas';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

const categoryIcons = {
  televisions: Tv,
  projectors: Video,
  projector_screens: RectangleHorizontal,
  video_distribution: Network,
  matrix_switchers: LayoutGrid,
  audio_streamers: Music,
  media_streamers: Play,
  speakers: Speaker,
  soundbars: Volume2,
  subwoofers: AudioLines,
  stereo_amps: Gauge,
  multizone_amps: Layers,
  surround_processors: Cpu,
  av_receivers: Radio,
  network_switches: Router,
  control_processors: Settings2,
  hdmi_extenders: Cable,
  access_points: Wifi,
  patch_panels: LayoutGrid,
  data_jacks: Plug,
  telephones: Phone,
  phone_jacks: Plug,
  intercoms: Speaker,
  nvrs: HardDrive,
  ip_cameras: Camera
};

export default function FloorplanManager({ floorplans = [], onUpdate, onClose, selectedFloorplanId, onSelectFloorplan, rooms = [], onAddRoom, onDeleteRoom, onRenameRoom, canvasProducts = [], onDeviceRoomChange, onDeviceHover, onCenterDevice, annotations = [], onAnnotationsChange }) {
  const [uploading, setUploading] = useState(false);
  const [uploadForm, setUploadForm] = useState({ name: '' });
  const [calibrating, setCalibrating] = useState(null);
  const [calibrationPoints, setCalibrationPoints] = useState([]);
  const [knownDistance, setKnownDistance] = useState('');
  const [calibrationZoom, setCalibrationZoom] = useState(0.25);
  const [editingScale, setEditingScale] = useState(null);
  const [expandedFloorplan, setExpandedFloorplan] = useState(null);
  const [newRoomName, setNewRoomName] = useState('');
  const [draggedDevice, setDraggedDevice] = useState(null);
  const [dragOverRoom, setDragOverRoom] = useState(null);
  const [editingRoomId, setEditingRoomId] = useState(null);
  const [editingRoomName, setEditingRoomName] = useState('');
  const [editingFloorplan, setEditingFloorplan] = useState(null);
  const [editorActiveTool, setEditorActiveTool] = useState(null);
  const [editorColor, setEditorColor] = useState('#3b82f6');
  const [editorStrokeWidth, setEditorStrokeWidth] = useState(2);
  const [editorFill, setEditorFill] = useState(false);
  const [editorFontSize, setEditorFontSize] = useState(20);
  const fileInputRef = useRef(null);
  const canvasRef = useRef(null);
  const imageRef = useRef(null);

  const COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899', '#000000', '#ffffff'];
  const STROKE_WIDTHS = [1, 2, 3, 4, 6, 8];

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
    // The canvas is scaled by CSS transform, so we need to account for the zoom
    // Click position relative to canvas, then convert to canvas coordinates
    const x = (e.clientX - rect.left) / calibrationZoom;
    const y = (e.clientY - rect.top) / calibrationZoom;

    console.log(`Calibration point: x=${x}, y=${y}, zoom=${calibrationZoom}, pixelDist from first point will be calculated`);
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

      console.log('=== CALIBRATION DEBUG ===');
      console.log(`Point 1: (${p1.x}, ${p1.y})`);
      console.log(`Point 2: (${p2.x}, ${p2.y})`);
      console.log(`Pixel distance: ${pixelDistance}`);
      console.log(`Known distance entered: ${knownDistance} inches`);

      // Store as pixels per inch for distance calculations
      const pixelsPerInch = pixelDistance / parseFloat(knownDistance);
      console.log(`Calculated pixelsPerInch: ${pixelsPerInch}`);
      console.log('========================');

    const updatedFloorplans = calibrating.isRecalibrating 
      ? floorplans.map(fp => 
          fp.id === calibrating.id ? { ...fp, pixelsPerInch } : fp
        )
      : (() => {
          const imageWidth = calibrating.naturalWidth;
          const imageHeight = calibrating.naturalHeight;
          const lastFloorplan = floorplans[floorplans.length - 1];
          const position = lastFloorplan && lastFloorplan.position
            ? { x: lastFloorplan.position.x + 200, y: lastFloorplan.position.y }
            : { x: 0, y: 0 };

          return [...floorplans, {
            id: calibrating.id,
            name: calibrating.name,
            url: calibrating.url,
            originalUrl: calibrating.originalUrl || calibrating.url,
            isPdf: calibrating.isPdf,
            pixelsPerInch: pixelsPerInch,
            imageWidth: imageWidth,
            imageHeight: imageHeight,
            scale: 1,
            calibrationScale: 1,
            position: position,
            visible: true,
            opacity: 0.3
          }];
        })();

    onUpdate(updatedFloorplans);
    setUploadForm({ name: '' });
    toast.success(calibrating.isRecalibrating ? 'Floorplan recalibrated' : 'Floorplan calibrated and added');
    
    setCalibrating(null);
    setCalibrationPoints([]);
    setKnownDistance('');
  };

  const handleCancelCalibration = () => {
    setCalibrating(null);
    setCalibrationPoints([]);
    setKnownDistance('');
  };

  const handleAddRoom = (floorplanId) => {
    if (!newRoomName.trim()) {
      toast.error('Please enter a room name');
      return;
    }
    onAddRoom(newRoomName, floorplanId);
    setNewRoomName('');
    toast.success(`Room "${newRoomName}" added to ${floorplans.find(fp => fp.id === floorplanId)?.name}`);
  };

  const handleRenameRoom = (roomId, newName) => {
    if (!newName.trim()) {
      toast.error('Room name cannot be empty');
      return;
    }
    if (onRenameRoom) {
      onRenameRoom(roomId, newName);
    }
    setEditingRoomId(null);
    setEditingRoomName('');
    toast.success(`Room renamed to "${newName}"`);
  };

  const getFloorplanRooms = (floorplanId) => {
    return rooms.filter(room => room.floorplanId === floorplanId);
  };

  const getRoomDevices = (roomId) => {
    return canvasProducts.filter(cp => cp.room === roomId);
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

  // Fabric Editor Modal
  if (editingFloorplan) {
    return (
      <div className="fixed inset-0 bg-black/95 z-[60] flex items-center justify-center p-4">
        <div className="bg-gray-900 rounded-xl border border-gray-800 w-full max-w-7xl h-[90vh] flex flex-col">
          <div className="p-4 border-b border-gray-800 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-white">Edit Floorplan: {editingFloorplan.name}</h2>
              <p className="text-sm text-gray-400">Draw annotations, add labels, and mark important areas</p>
            </div>
            <Button
              size="icon"
              variant="ghost"
              onClick={() => {
                setEditingFloorplan(null);
                setEditorActiveTool(null);
              }}
              className="text-gray-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          {/* Toolbar */}
          <div className="px-6 py-3 border-b border-gray-800 flex items-center gap-3 bg-gray-900/50">
            <span className="text-sm font-medium text-gray-400">Tools:</span>
            <Button
              size="sm"
              variant={editorActiveTool === 'text' ? 'default' : 'outline'}
              onClick={() => setEditorActiveTool(editorActiveTool === 'text' ? null : 'text')}
              className={editorActiveTool === 'text' ? 'bg-blue-600' : 'bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700'}
            >
              <Type className="w-4 h-4 mr-2" />
              Text
            </Button>
            <Button
              size="sm"
              variant={editorActiveTool === 'rect' ? 'default' : 'outline'}
              onClick={() => setEditorActiveTool(editorActiveTool === 'rect' ? null : 'rect')}
              className={editorActiveTool === 'rect' ? 'bg-blue-600' : 'bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700'}
            >
              <Square className="w-4 h-4 mr-2" />
              Rectangle
            </Button>
            <Button
              size="sm"
              variant={editorActiveTool === 'circle' ? 'default' : 'outline'}
              onClick={() => setEditorActiveTool(editorActiveTool === 'circle' ? null : 'circle')}
              className={editorActiveTool === 'circle' ? 'bg-blue-600' : 'bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700'}
            >
              <Circle className="w-4 h-4 mr-2" />
              Circle
            </Button>
            <Button
              size="sm"
              variant={editorActiveTool === 'line' ? 'default' : 'outline'}
              onClick={() => setEditorActiveTool(editorActiveTool === 'line' ? null : 'line')}
              className={editorActiveTool === 'line' ? 'bg-blue-600' : 'bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700'}
            >
              <Minus className="w-4 h-4 mr-2" />
              Line
            </Button>

            <div className="h-6 w-px bg-gray-700 mx-2" />

            {/* Style settings */}
            {editorActiveTool && (
              <Popover>
                <PopoverTrigger asChild>
                  <Button size="sm" variant="outline" className="bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700">
                    Style
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-64 bg-gray-800 border-gray-700">
                  <div className="space-y-4">
                    <div>
                      <Label className="text-gray-300 text-xs mb-2 block">Color</Label>
                      <div className="flex gap-2 flex-wrap">
                        {COLORS.map(color => (
                          <button
                            key={color}
                            onClick={() => setEditorColor(color)}
                            className="w-8 h-8 rounded border-2 transition-all"
                            style={{
                              backgroundColor: color,
                              borderColor: editorColor === color ? '#3b82f6' : 'transparent'
                            }}
                          />
                        ))}
                      </div>
                    </div>
                    
                    {editorActiveTool !== 'text' && (
                      <div>
                        <Label className="text-gray-300 text-xs mb-2 block">Stroke Width</Label>
                        <div className="flex gap-2">
                          {STROKE_WIDTHS.map(width => (
                            <button
                              key={width}
                              onClick={() => setEditorStrokeWidth(width)}
                              className={`px-3 py-1.5 rounded text-xs transition-all ${
                                editorStrokeWidth === width 
                                  ? 'bg-blue-600 text-white' 
                                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                              }`}
                            >
                              {width}px
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {editorActiveTool === 'text' && (
                      <div>
                        <Label className="text-gray-300 text-xs mb-2 block">Font Size</Label>
                        <RadioGroup value={String(editorFontSize)} onValueChange={(v) => setEditorFontSize(Number(v))}>
                          {[12, 16, 20, 24, 32, 48].map(size => (
                            <div key={size} className="flex items-center space-x-2">
                              <RadioGroupItem value={String(size)} id={`font-${size}`} />
                              <Label htmlFor={`font-${size}`} className="text-gray-300">{size}px</Label>
                            </div>
                          ))}
                        </RadioGroup>
                      </div>
                    )}
                  </div>
                </PopoverContent>
              </Popover>
            )}

            {editorActiveTool && (
              <span className="text-xs text-blue-400 font-medium ml-auto animate-pulse">
                ✏️ Click on canvas to draw {editorActiveTool}
              </span>
            )}
          </div>

          <div className="flex-1 overflow-auto p-6 bg-gray-950">
            <FabricFloorplanCanvas
              floorplanUrl={editingFloorplan.url}
              annotations={annotations.filter(a => a.floorplanId === editingFloorplan.id)}
              onAnnotationsChange={(newAnnotations) => {
                // Merge with annotations from other floorplans
                const updatedAnnotations = [
                  ...annotations.filter(a => a.floorplanId !== editingFloorplan.id),
                  ...newAnnotations.map(a => ({ ...a, floorplanId: editingFloorplan.id }))
                ];
                if (onAnnotationsChange) {
                  onAnnotationsChange(updatedAnnotations);
                }
              }}
              width={1400}
              height={900}
              readOnly={false}
              activeTool={editorActiveTool}
              onToolUsed={() => setEditorActiveTool(null)}
            />
          </div>
          <div className="p-4 border-t border-gray-800 flex justify-end">
            <Button
              onClick={() => {
                setEditingFloorplan(null);
                setEditorActiveTool(null);
              }}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Done Editing
            </Button>
          </div>
        </div>
      </div>
    );
  }

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
    <div className="fixed right-0 top-[87px] bottom-0 w-80 bg-gray-900 border-l border-gray-800 z-40 flex flex-col overflow-hidden">
      <div className="p-4 border-b border-gray-800 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">Floorplans</h2>
        <div className="flex gap-1">
          <Button
            size="sm"
            variant="ghost"
            onClick={handleLockAll}
            className="text-xs text-gray-400 hover:text-white h-8 px-2"
          >
            <Lock className="w-3 h-3 mr-1" />
            Lock All
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={handleUnlockAll}
            className="text-xs text-gray-400 hover:text-white h-8 px-2"
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

      <div className="flex-1 overflow-y-auto">
        <div className="p-4 space-y-4">
          {/* Upload Form */}
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-3">
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
              disabled={!uploadForm.name.trim() || uploading}
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
                          setEditingFloorplan(fp);
                        }}
                        className="h-7 w-7 text-blue-400 hover:text-blue-300"
                        title="Edit with Fabric Canvas"
                      >
                        <Edit3 className="w-3 h-3" />
                      </Button>
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

                {/* Rooms Section */}
                <div className="pt-3 border-t border-gray-700" onClick={(e) => e.stopPropagation()}>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      setExpandedFloorplan(expandedFloorplan === fp.id ? null : fp.id);
                    }}
                    className="flex items-center gap-2 text-xs font-medium text-gray-400 hover:text-white mb-2 w-full"
                  >
                    <Home className="w-3 h-3" />
                    Rooms ({getFloorplanRooms(fp.id).length})
                    {expandedFloorplan === fp.id ? <ChevronUp className="w-3 h-3 ml-auto" /> : <ChevronDown className="w-3 h-3 ml-auto" />}
                  </button>

                  {expandedFloorplan === fp.id && (
                    <div className="space-y-2 mt-2">
                      <div className="flex gap-1">
                        <Input
                          value={newRoomName}
                          onChange={(e) => setNewRoomName(e.target.value)}
                          placeholder="Room name"
                          className="h-7 text-xs bg-gray-900 border-gray-700 text-white"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleAddRoom(fp.id);
                          }}
                        />
                        <Button
                          size="sm"
                          onClick={() => handleAddRoom(fp.id)}
                          disabled={!newRoomName.trim()}
                          className="h-7 px-2 text-xs bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Add
                        </Button>
                      </div>

                      <div className="space-y-1">
                        {getFloorplanRooms(fp.id).length === 0 ? (
                          <p className="text-xs text-gray-500 py-1">No rooms</p>
                        ) : (
                          getFloorplanRooms(fp.id).map(room => {
                            const roomDevices = getRoomDevices(room.id);
                            return (
                              <div 
                                 key={room.id} 
                                 className={`bg-gray-900 rounded p-2 transition-colors ${
                                   dragOverRoom === room.id ? 'ring-2 ring-green-500 bg-green-500/10' : ''
                                 }`}
                                 onDragOver={(e) => {
                                   e.preventDefault();
                                   if (draggedDevice && draggedDevice.fromRoom !== room.id) {
                                     setDragOverRoom(room.id);
                                   }
                                 }}
                                 onDragLeave={() => setDragOverRoom(null)}
                                 onDrop={(e) => {
                                   e.preventDefault();
                                   if (draggedDevice && draggedDevice.fromRoom !== room.id && onDeviceRoomChange) {
                                     onDeviceRoomChange(draggedDevice.device.instanceId, room.id);
                                     toast.success(`Moved ${draggedDevice.device.label} to ${room.name}`);
                                   }
                                   setDraggedDevice(null);
                                   setDragOverRoom(null);
                                 }}
                               >
                               <div className="flex items-center justify-between mb-1">
                                 {editingRoomId === room.id ? (
                                   <div className="flex items-center gap-1 flex-1">
                                     <Input
                                       value={editingRoomName}
                                       onChange={(e) => setEditingRoomName(e.target.value)}
                                       className="h-6 text-xs bg-gray-800 border-gray-700 text-white"
                                       autoFocus
                                       onKeyDown={(e) => {
                                         if (e.key === 'Enter') handleRenameRoom(room.id, editingRoomName);
                                         if (e.key === 'Escape') {
                                           setEditingRoomId(null);
                                           setEditingRoomName('');
                                         }
                                       }}
                                     />
                                     <Button
                                       size="icon"
                                       variant="ghost"
                                       onClick={(e) => {
                                         e.stopPropagation();
                                         handleRenameRoom(room.id, editingRoomName);
                                       }}
                                       className="h-6 w-6 text-green-400 hover:text-green-300"
                                     >
                                       <Check className="w-3 h-3" />
                                     </Button>
                                   </div>
                                 ) : (
                                   <>
                                     <span className="text-xs text-gray-300 font-medium">{room.name}</span>
                                     <div className="flex gap-1">
                                       <Button
                                         size="icon"
                                         variant="ghost"
                                         onClick={(e) => {
                                           e.stopPropagation();
                                           setEditingRoomId(room.id);
                                           setEditingRoomName(room.name);
                                         }}
                                         className="h-5 w-5 text-blue-400 hover:text-blue-300"
                                       >
                                         <Pencil className="w-3 h-3" />
                                       </Button>
                                       <Button
                                         size="icon"
                                         variant="ghost"
                                         onClick={(e) => {
                                           e.stopPropagation();
                                           onDeleteRoom(room.id);
                                         }}
                                         className="h-5 w-5 text-red-400 hover:text-red-300"
                                       >
                                         <X className="w-3 h-3" />
                                       </Button>
                                     </div>
                                   </>
                                 )}
                               </div>
                                {roomDevices.length > 0 && (
                                 <div className="ml-2 space-y-0.5 mt-1">
                                   {roomDevices.map(device => {
                                     const CategoryIcon = categoryIcons[device.product.category] || Box;
                                     const networkInfo = device.networkInfo || {};
                                     const hasNetworkInfo = networkInfo.ip && networkInfo.ip !== '000.000.000.000' && networkInfo.ip !== '';
                                     return (
                                       <div 
                                         key={device.instanceId} 
                                         draggable
                                         onClick={() => onCenterDevice?.(device)}
                                         onDragStart={() => setDraggedDevice({ device, fromRoom: room.id })}
                                         onDragEnd={() => {
                                           setDraggedDevice(null);
                                           setDragOverRoom(null);
                                         }}
                                         onMouseEnter={() => onDeviceHover?.(device.instanceId)}
                                         onMouseLeave={() => onDeviceHover?.(null)}
                                         className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-300 cursor-pointer transition-colors"
                                       >
                                         <GripVertical className="w-3 h-3 text-gray-600 flex-shrink-0" />
                                         <CategoryIcon className="w-3 h-3 flex-shrink-0" />
                                         <span className="truncate flex-1">{device.product.brand} {device.product.model} ({device.label})</span>
                                         <Circle className={`w-2 h-2 flex-shrink-0 ${hasNetworkInfo ? 'fill-green-500 text-green-500' : 'fill-red-500 text-red-500'}`} />
                                       </div>
                                     );
                                   })}
                                 </div>
                                )}
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  )}
                </div>
                </div>
                ))
                )}
                </div>
                </div>
                </div>
                </div>
                );
                }