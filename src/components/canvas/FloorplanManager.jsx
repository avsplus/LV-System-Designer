import React from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { X, Eye, EyeOff, Trash2, Upload } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

export default function FloorplanManager({ floorplans = [], onUpdate, onClose }) {
  const [uploading, setUploading] = React.useState(false);
  const [uploadForm, setUploadForm] = React.useState({ name: '', scale: 1 });
  const fileInputRef = React.useRef(null);

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!uploadForm.name.trim()) {
      toast.error('Please enter a floorplan name');
      return;
    }

    if (!uploadForm.scale || uploadForm.scale <= 0) {
      toast.error('Please enter a valid scale factor');
      return;
    }

    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      const newFloorplan = {
        id: Date.now().toString(),
        name: uploadForm.name,
        url: file_url,
        scale: parseFloat(uploadForm.scale),
        visible: true,
        opacity: 0.3
      };
      onUpdate([...floorplans, newFloorplan]);
      setUploadForm({ name: '', scale: 1 });
      if (fileInputRef.current) fileInputRef.current.value = '';
      toast.success('Floorplan uploaded');
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

  return (
    <div className="fixed right-0 top-[72px] bottom-0 w-80 bg-gray-900 border-l border-gray-800 z-40 overflow-y-auto">
      <div className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">Floorplans</h3>
          <Button
            size="icon"
            variant="ghost"
            onClick={onClose}
            className="text-gray-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </Button>
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
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Scale Factor</label>
              <Input
                type="number"
                value={uploadForm.scale}
                onChange={(e) => setUploadForm({ ...uploadForm, scale: e.target.value })}
                placeholder="e.g., 1 = 100%"
                step="0.1"
                min="0.1"
                className="bg-gray-900 border-gray-700 text-white text-sm"
              />
              <p className="text-xs text-gray-500 mt-1">1 = actual size, 2 = double size</p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
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
              <div key={fp.id} className="bg-gray-800 border border-gray-700 rounded-lg p-3">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <h4 className="text-sm font-medium text-white">{fp.name}</h4>
                    <p className="text-xs text-gray-500">Scale: {fp.scale}x</p>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleToggleVisibility(fp.id)}
                      className="h-7 w-7 text-gray-400 hover:text-white"
                    >
                      {fp.visible ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleDelete(fp.id)}
                      className="h-7 w-7 text-gray-400 hover:text-red-400"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
                
                {fp.visible && (
                  <div className="space-y-1">
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

                {/* Preview */}
                <div className="mt-2 rounded overflow-hidden">
                  <img 
                    src={fp.url} 
                    alt={fp.name}
                    className="w-full h-20 object-cover"
                  />
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}