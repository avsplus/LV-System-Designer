import React, { useRef } from 'react';
import { X, Trash2, Copy, Upload, Plus, ImageOff, Camera } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { useMediaQuery } from "@/components/mobile/useMediaQuery";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

export default function SnapshotDetailsPanel({ annotation, index, onClose, onUpdate, onDelete, onDuplicate }) {
  const [showDelete, setShowDelete] = React.useState(false);
  const [uploading, setUploading] = React.useState(false);
  const [lightboxUrl, setLightboxUrl] = React.useState(null);
  const isMobile = !useMediaQuery('(min-width: 768px)');
  const fileInputRef = useRef(null);

  if (!annotation) return null;

  const images = annotation.images || [];

  const handleTitleChange = (e) => {
    onUpdate(index, { ...annotation, title: e.target.value });
  };

  const handleCaptionChange = (e) => {
    onUpdate(index, { ...annotation, caption: e.target.value });
  };

  const handleScaleChange = (value) => {
    onUpdate(index, { ...annotation, scale: value[0] });
  };

  const handleUploadImage = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setUploading(true);
    try {
      const urls = await Promise.all(
        files.map(async (file) => {
          const { file_url } = await base44.integrations.Core.UploadFile({ file });
          return file_url;
        })
      );
      const updatedImages = [...images, ...urls];
      onUpdate(index, { ...annotation, images: updatedImages });
      toast.success(`${urls.length} image(s) uploaded`);
    } catch (err) {
      toast.error('Failed to upload image');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleRemoveImage = (imgIdx) => {
    const updated = images.filter((_, i) => i !== imgIdx);
    onUpdate(index, { ...annotation, images: updated });
  };

  const content = (
    <div className="space-y-4">
      {/* Title */}
      <div>
        <p className="text-sm text-gray-500 mb-2">Title</p>
        <input
          type="text"
          value={annotation.title || ''}
          onChange={handleTitleChange}
          placeholder="Snapshot title..."
          className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none"
        />
      </div>

      {/* Caption / Notes */}
      <div>
        <p className="text-sm text-gray-500 mb-2">Notes</p>
        <Textarea
          value={annotation.caption || ''}
          onChange={handleCaptionChange}
          placeholder="Add notes or description..."
          className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none resize-none"
          rows={3}
        />
      </div>

      {/* Scale */}
      <div>
        <div className="flex justify-between items-center mb-2">
          <p className="text-sm text-gray-500">Icon Size</p>
          <span className="text-sm text-blue-400 font-medium">{Math.round((annotation.scale || 1) * 100)}%</span>
        </div>
        <Slider
          value={[annotation.scale || 1]}
          onValueChange={handleScaleChange}
          min={0.25}
          max={3}
          step={0.25}
          className="w-full"
        />
      </div>

      {/* Images */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm text-gray-500">Photos ({images.length})</p>
          <Button
            size="sm"
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="h-7 px-2 bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700 text-xs"
          >
            {uploading ? (
              <span className="animate-pulse">Uploading...</span>
            ) : (
              <>
                <Upload className="w-3 h-3 mr-1" />
                Add Photo
              </>
            )}
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handleUploadImage}
          />
        </div>

        {images.length === 0 ? (
          <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4 flex flex-col items-center justify-center gap-2 text-gray-500">
            <ImageOff className="w-6 h-6" />
            <p className="text-xs">No photos yet</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {images.map((url, imgIdx) => (
              <div key={imgIdx} className="relative group rounded overflow-hidden border border-gray-700 aspect-video bg-gray-800 cursor-pointer" onClick={() => setLightboxUrl(url)}>
                <img src={url} alt={`Photo ${imgIdx + 1}`} className="w-full h-full object-cover" />
                <button
                  onClick={(e) => { e.stopPropagation(); handleRemoveImage(imgIdx); }}
                  className="absolute top-1 right-1 w-5 h-5 bg-red-600 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="w-3 h-3 text-white" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

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
  );

  const actions = (
    <div className="space-y-2">
      <Button
        onClick={onDuplicate}
        variant="outline"
        className="w-full bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700 hover:text-white"
      >
        <Copy className="w-4 h-4 mr-2" />
        Duplicate
      </Button>
      <Button
        onClick={() => setShowDelete(true)}
        className="w-full bg-red-600 hover:bg-red-700 text-white"
      >
        <Trash2 className="w-4 h-4 mr-2" />
        Delete Snapshot
      </Button>
    </div>
  );

  const deleteConfirm = showDelete && (
    <div className="absolute inset-0 bg-black/50 rounded-lg flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg p-4 border border-gray-700 mx-4">
        <p className="text-white mb-4 text-sm">Delete this snapshot?</p>
        <div className="flex gap-2">
          <Button
            onClick={() => setShowDelete(false)}
            variant="outline"
            className="flex-1 bg-gray-700 hover:bg-gray-600 text-white border-gray-600"
          >
            Cancel
          </Button>
          <Button
            onClick={() => { onDelete(index); onClose(); }}
            className="flex-1 bg-red-600 hover:bg-red-700"
          >
            Delete
          </Button>
        </div>
      </div>
    </div>
  );

  const lightbox = lightboxUrl && (
    <div
      className="fixed inset-0 bg-black/90 z-[9999] flex items-center justify-center p-4"
      onClick={() => setLightboxUrl(null)}
    >
      <button className="absolute top-4 right-4 text-white bg-gray-800 rounded-full p-2 hover:bg-gray-700" onClick={() => setLightboxUrl(null)}>
        <X className="w-5 h-5" />
      </button>
      <img src={lightboxUrl} alt="Full size" className="max-w-full max-h-full object-contain rounded shadow-2xl" onClick={(e) => e.stopPropagation()} />
    </div>
  );

  if (isMobile) {
    return (
      <Drawer open={true} onOpenChange={(open) => !open && onClose()}>
        <DrawerContent className="bg-gray-900 border-t border-gray-800">
          <DrawerHeader className="border-b border-gray-800">
            <div className="flex items-center justify-between">
              <DrawerTitle className="text-lg font-semibold text-white">Snapshot Properties</DrawerTitle>
              <Button size="icon" variant="ghost" onClick={onClose} className="text-gray-400 hover:text-white hover:bg-gray-700">
                <X className="w-4 h-4" />
              </Button>
            </div>
          </DrawerHeader>
          <div className="max-h-[70vh] overflow-y-auto p-4">{content}</div>
          <div className="border-t border-gray-800 p-4 pb-8">{actions}</div>
          {deleteConfirm}
          {lightbox}
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <>
      <div className="fixed right-0 top-[87px] bottom-0 w-80 bg-gray-900 border-l border-gray-800 z-40 flex flex-col overflow-hidden">
        <div className="p-4 border-b border-gray-800 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <Camera className="w-4 h-4 text-yellow-400" />
            Snapshot Properties
          </h2>
          <Button size="icon" variant="ghost" onClick={onClose} className="text-gray-400 hover:text-white hover:bg-gray-700">
            <X className="w-4 h-4" />
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto p-4">{content}</div>
        <div className="border-t border-gray-800 p-4">{actions}</div>
        {deleteConfirm}
      </div>
      {lightbox}
    </>
  );
}