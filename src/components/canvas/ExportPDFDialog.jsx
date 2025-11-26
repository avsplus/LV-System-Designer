import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FileText, Download, Loader2, Cable, Package } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function ExportPDFDialog({ 
  open, 
  onClose, 
  onExport, 
  projectName,
  isExporting,
  exportEngine = 'jspdf', // 'jspdf' or 'apitemplate'
  onExportEngineChange,
  onGenerateWireSchedule,
  onGenerateBOM,
  canvasProducts = [],
  connections = [],
  rooms = []
}) {
  const [clientName, setClientName] = useState('');
  const [location, setLocation] = useState('');
  const [selectedTab, setSelectedTab] = useState('pdf');

  const handleExport = () => {
    onExport({ clientName, location, engine: exportEngine });
  };

  const handleGenerateWireSchedule = () => {
    onGenerateWireSchedule?.({ canvasProducts, connections, projectName, clientName });
  };

  const handleGenerateBOM = () => {
    onGenerateBOM?.({ canvasProducts, connections, projectName, clientName });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-gray-900 border-gray-700 sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-400" />
            Export Options
          </DialogTitle>
        </DialogHeader>

        <Tabs value={selectedTab} onValueChange={setSelectedTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 bg-gray-800">
            <TabsTrigger value="pdf" className="data-[state=active]:bg-blue-600">
              <FileText className="w-4 h-4 mr-1" /> PDF
            </TabsTrigger>
            <TabsTrigger value="wireschedulse" className="data-[state=active]:bg-blue-600">
              <Cable className="w-4 h-4 mr-1" /> Wire Schedule
            </TabsTrigger>
            <TabsTrigger value="bom" className="data-[state=active]:bg-blue-600">
              <Package className="w-4 h-4 mr-1" /> BOM
            </TabsTrigger>
          </TabsList>

          {/* PDF Export Tab */}
          <TabsContent value="pdf" className="space-y-4 mt-4">
            <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
              <p className="text-sm text-gray-400 mb-1">Project</p>
              <p className="text-white font-medium">{projectName || 'Untitled Project'}</p>
            </div>

            {onExportEngineChange && (
              <div className="space-y-2">
                <Label className="text-gray-300">PDF Engine</Label>
                <Select value={exportEngine} onValueChange={onExportEngineChange}>
                  <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-700">
                    <SelectItem value="jspdf" className="text-white">jsPDF (Built-in)</SelectItem>
                    <SelectItem value="apitemplate" className="text-white">APITemplate.io (Cloud)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500">
                  {exportEngine === 'apitemplate' 
                    ? 'Uses cloud rendering for higher quality output' 
                    : 'Fast local generation'}
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label className="text-gray-300">Client Name (optional)</Label>
              <Input
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="e.g., John Smith"
                className="bg-gray-800 border-gray-700 text-white"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-gray-300">Location/Address (optional)</Label>
              <Input
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g., 123 Main St, City, State"
                className="bg-gray-800 border-gray-700 text-white"
              />
            </div>

            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
              <p className="text-blue-400 text-sm font-medium mb-1">PDF Contents:</p>
              <ul className="text-xs text-gray-400 space-y-1">
                <li>• Cover page with project details</li>
                <li>• System overview & legend</li>
                <li>• Device documentation cards</li>
                <li>• Complete cable schedule</li>
                <li>• Room-by-room breakdowns</li>
                <li>• Installation guidelines</li>
                <li>• Sign-off page</li>
              </ul>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                onClick={onClose}
                className="border-gray-700 text-gray-300"
                disabled={isExporting}
              >
                Cancel
              </Button>
              <Button
                onClick={handleExport}
                className="bg-blue-600 hover:bg-blue-700"
                disabled={isExporting}
              >
                {isExporting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4 mr-2" />
                    Export PDF
                  </>
                )}
              </Button>
            </div>
          </TabsContent>

          {/* Wire Schedule Tab */}
          <TabsContent value="wireschedulse" className="space-y-4 mt-4">
            <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
              <p className="text-sm text-gray-400 mb-1">Total Connections</p>
              <p className="text-white font-medium text-2xl">{connections.length}</p>
            </div>

            <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-3">
              <p className="text-purple-400 text-sm font-medium mb-1">
                <Cable className="w-4 h-4 inline mr-1" />
                Wire Schedule Contents:
              </p>
              <ul className="text-xs text-gray-400 space-y-1">
                <li>• Cable ID / Wire ID</li>
                <li>• Source device and port</li>
                <li>• Destination device and port</li>
                <li>• Connection type (HDMI, Ethernet, etc.)</li>
                <li>• Room locations</li>
              </ul>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                onClick={onClose}
                className="border-gray-700 text-gray-300"
              >
                Cancel
              </Button>
              <Button
                onClick={handleGenerateWireSchedule}
                className="bg-purple-600 hover:bg-purple-700"
                disabled={isExporting || connections.length === 0}
              >
                {isExporting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4 mr-2" />
                    Export Wire Schedule
                  </>
                )}
              </Button>
            </div>
          </TabsContent>

          {/* BOM Tab */}
          <TabsContent value="bom" className="space-y-4 mt-4">
            <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
              <p className="text-sm text-gray-400 mb-1">Total Devices</p>
              <p className="text-white font-medium text-2xl">{canvasProducts.length}</p>
            </div>

            <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3">
              <p className="text-green-400 text-sm font-medium mb-1">
                <Package className="w-4 h-4 inline mr-1" />
                Bill of Materials Contents:
              </p>
              <ul className="text-xs text-gray-400 space-y-1">
                <li>• Device brand and model</li>
                <li>• Category</li>
                <li>• Quantity per model</li>
                <li>• Room assignments</li>
                <li>• Unit price and total (if available)</li>
              </ul>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                onClick={onClose}
                className="border-gray-700 text-gray-300"
              >
                Cancel
              </Button>
              <Button
                onClick={handleGenerateBOM}
                className="bg-green-600 hover:bg-green-700"
                disabled={isExporting || canvasProducts.length === 0}
              >
                {isExporting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4 mr-2" />
                    Export BOM
                  </>
                )}
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}