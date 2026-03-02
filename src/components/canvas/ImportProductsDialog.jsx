import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Download, Package, Search } from "lucide-react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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
  { value: 'touch_panels', label: 'Touch Panels' },
  { value: 'remotes', label: 'Remotes' },
  { value: 'hdmi_extenders', label: 'HDMI Extenders' },
  { value: 'access_points', label: 'Access Points' },
  { value: 'patch_panels', label: 'Patch Panels' },
  { value: 'data_jacks', label: 'Data Jacks' },
  { value: 'telephones', label: 'Telephones' },
  { value: 'phone_jacks', label: 'Phone Jacks' },
  { value: 'intercoms', label: 'Intercoms' },
  { value: 'nvrs', label: 'NVRs' },
  { value: 'ip_cameras', label: 'IP Cameras' },
  { value: 'power_conditioner', label: 'Power Conditioner' },
  { value: 'smart_power_conditioner', label: 'Smart Power Conditioner' },
  { value: 'power_strip', label: 'Power Strip' },
  { value: 'ups_backup', label: 'UPS Backup' },
];

export default function ImportProductsDialog({ open, onClose, onImport, isImporting }) {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchMode, setSearchMode] = useState('category');
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');

  const handleImport = () => {
    if (searchMode === 'category') {
      onImport({ mode: 'category', category: selectedCategory });
    } else {
      onImport({ mode: 'search', brand: brand.trim(), model: model.trim() });
    }
  };

  const canImport = searchMode === 'category' || brand.trim().length > 0;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-gray-900 border-gray-700 sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <Package className="w-5 h-5 text-blue-400" />
            Import AV Products
          </DialogTitle>
        </DialogHeader>

        <Tabs value={searchMode} onValueChange={setSearchMode} className="w-full">
          <TabsList className="grid w-full grid-cols-2 bg-gray-800">
            <TabsTrigger value="category" className="data-[state=active]:bg-gray-700">
              By Category
            </TabsTrigger>
            <TabsTrigger value="search" className="data-[state=active]:bg-gray-700">
              <Search className="w-3 h-3 mr-1" />
              By Brand/Model
            </TabsTrigger>
          </TabsList>

          <TabsContent value="category" className="space-y-4 mt-4">
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
          </TabsContent>

          <TabsContent value="search" className="space-y-4 mt-4">
            <div className="space-y-2">
              <label className="text-sm text-gray-400">Brand Name <span className="text-red-400">*</span></label>
              <Input
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                placeholder="e.g., Sony, Denon, Crestron..."
                className="bg-gray-800 border-gray-700 text-white"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm text-gray-400">Model (optional)</label>
              <Input
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder="e.g., AVR-X3800H, XBR-85X95L..."
                className="bg-gray-800 border-gray-700 text-white"
              />
            </div>

            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
              <p className="text-blue-400 text-sm">
                {model.trim() 
                  ? `Will search for: ${brand.trim()} ${model.trim()}`
                  : brand.trim()
                    ? `Will search for multiple ${brand.trim()} products.`
                    : 'Enter a brand to search.'
                }
              </p>
              <p className="text-gray-400 text-xs mt-1">
                Searches web for official product specs.
              </p>
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-2 pt-2">
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
            disabled={isImporting || !canImport}
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