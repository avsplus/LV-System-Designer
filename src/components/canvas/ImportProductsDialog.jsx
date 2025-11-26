import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Loader2, Download, Package } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const CATEGORIES = [
  { value: 'all', label: 'All Categories' },
  { value: 'televisions', label: 'Televisions' },
  { value: 'projectors', label: 'Projectors' },
  { value: 'projector_screens', label: 'Projector Screens' },
  { value: 'video_distribution', label: 'Video Distribution' },
  { value: 'matrix_switchers', label: 'Matrix Switchers' },
  { value: 'audio_streamers', label: 'Audio Streamers' },
  { value: 'media_streamers', label: 'Media Streamers' },
  { value: 'speakers', label: 'Speakers' },
  { value: 'soundbars', label: 'Soundbars' },
  { value: 'subwoofers', label: 'Subwoofers' },
  { value: 'stereo_amps', label: 'Stereo Amps' },
  { value: 'multizone_amps', label: 'Multi-Zone Amps' },
  { value: 'surround_processors', label: 'Surround Processors' },
  { value: 'av_receivers', label: 'AV Receivers' },
  { value: 'network_switches', label: 'Network Switches' },
  { value: 'control_processors', label: 'Control Processors' },
  { value: 'hdmi_extenders', label: 'HDMI Extenders' },
];

export default function ImportProductsDialog({ open, onClose, onImport, isImporting }) {
  const [selectedCategory, setSelectedCategory] = useState('all');

  const handleImport = () => {
    onImport(selectedCategory);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-gray-900 border-gray-700 sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <Package className="w-5 h-5 text-blue-400" />
            Import AV Products
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label className="text-sm text-gray-400">Category to Import</label>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent className="bg-gray-800 border-gray-700">
                {CATEGORIES.map(cat => (
                  <SelectItem 
                    key={cat.value} 
                    value={cat.value}
                    className="text-white hover:bg-gray-700"
                  >
                    {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
            <p className="text-blue-400 text-sm">
              {selectedCategory === 'all' 
                ? 'This will search for ~34 products across all categories.'
                : `This will search for ~10 products in the ${CATEGORIES.find(c => c.value === selectedCategory)?.label} category.`
              }
            </p>
            <p className="text-gray-400 text-xs mt-1">
              Duplicates will be automatically skipped.
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={onClose}
            className="border-gray-700 text-gray-300"
            disabled={isImporting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleImport}
            className="bg-blue-600 hover:bg-blue-700"
            disabled={isImporting}
          >
            {isImporting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Importing...
              </>
            ) : (
              <>
                <Download className="w-4 h-4 mr-2" />
                Import Products
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}