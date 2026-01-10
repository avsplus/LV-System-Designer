import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Link2, Search, Wrench } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
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
  { value: 'hdmi_extenders', label: 'HDMI Extenders' },
];

export default function EnrichConnectionsDialog({ open, onClose, onEnrich, isEnriching, products = [] }) {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchMode, setSearchMode] = useState('category');
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [isCleaning, setIsCleaning] = useState(false);

  const handleCleanup = async () => {
    setIsCleaning(true);
    try {
      const { data } = await base44.functions.invoke('cleanupConnections', {});
      toast.success(`Cleaned up ${data.fixed} products with mismatched connections`);
      if (data.fixed > 0) {
        setTimeout(() => window.location.reload(), 1500);
      }
    } catch (error) {
      toast.error('Cleanup failed: ' + (error.message || 'Unknown error'));
    } finally {
      setIsCleaning(false);
    }
  };

  const handleEnrich = () => {
    if (searchMode === 'category') {
      onEnrich({ mode: 'category', category: selectedCategory === 'all' ? null : selectedCategory });
    } else {
      onEnrich({ mode: 'search', brand: brand.trim(), model: model.trim() });
    }
  };

  const canEnrich = searchMode === 'category' || brand.trim().length > 0;

  // Count products in selected category
  const productCount = selectedCategory === 'all' 
    ? products.length 
    : products.filter(p => p.category === selectedCategory).length;

  // Find matching products for brand/model search
  const matchingProducts = products.filter(p => {
    if (!brand.trim()) return false;
    const brandMatch = p.brand?.toLowerCase().includes(brand.toLowerCase().trim());
    if (!model.trim()) return brandMatch;
    const modelMatch = p.model?.toLowerCase().includes(model.toLowerCase().trim());
    return brandMatch && modelMatch;
  });

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-gray-900 border-gray-700 sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <Link2 className="w-5 h-5 text-blue-400" />
            Enrich Product Connections
          </DialogTitle>
        </DialogHeader>

        <p className="text-gray-400 text-sm">
          Search the web for actual connection ports for products in your database.
        </p>

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
              <label className="text-sm text-gray-400">Category to Enrich</label>
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
                {productCount} product{productCount !== 1 ? 's' : ''} will be enriched.
              </p>
              <p className="text-gray-400 text-xs mt-1">
                This may take several minutes for large categories.
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
                {matchingProducts.length > 0 
                  ? `${matchingProducts.length} matching product${matchingProducts.length !== 1 ? 's' : ''} found in database.`
                  : brand.trim() 
                    ? 'No matching products in database.'
                    : 'Enter a brand to search.'
                }
              </p>
              {matchingProducts.length > 0 && matchingProducts.length <= 5 && (
                <div className="text-gray-400 text-xs mt-2 space-y-1">
                  {matchingProducts.map(p => (
                    <button
                      key={p.id}
                      onClick={() => {
                        setBrand(p.brand);
                        setModel(p.model);
                      }}
                      className="block w-full text-left px-2 py-1 rounded hover:bg-blue-500/20 transition-colors text-blue-300 hover:text-blue-200"
                    >
                      {p.brand} {p.model}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex justify-between pt-2">
          <Button
            variant="outline"
            onClick={handleCleanup}
            className="border-yellow-600 text-yellow-400 hover:bg-yellow-600/20"
            disabled={isEnriching || isCleaning}
          >
            {isCleaning ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Cleaning...
              </>
            ) : (
              <>
                <Wrench className="w-4 h-4 mr-2" />
                Fix Mismatched
              </>
            )}
          </Button>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={onClose}
              className="border-gray-700 text-gray-300"
              disabled={isEnriching || isCleaning}
            >
              Cancel
            </Button>
            <Button
              onClick={handleEnrich}
              className="bg-blue-600 hover:bg-blue-700"
              disabled={isEnriching || isCleaning || !canEnrich || (searchMode === 'search' && matchingProducts.length === 0)}
            >
              {isEnriching ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Enriching...
                </>
              ) : (
                <>
                  <Link2 className="w-4 h-4 mr-2" />
                  Start Enrichment
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}