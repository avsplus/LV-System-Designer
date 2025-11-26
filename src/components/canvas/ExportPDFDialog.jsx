import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FileText, Download, Loader2, Image, Tag, Layers } from "lucide-react";
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
  onGenerateLabels,
  onGenerateRoomDiagram,
  canvasProducts = [],
  connections = [],
  rooms = []
}) {
  const [clientName, setClientName] = useState('');
  const [location, setLocation] = useState('');
  const [selectedTab, setSelectedTab] = useState('pdf');
  const [labelType, setLabelType] = useState('device');
  const [selectedDevice, setSelectedDevice] = useState('');
  const [selectedConnection, setSelectedConnection] = useState('');
  const [selectedRoom, setSelectedRoom] = useState('');

  const handleExport = () => {
    onExport({ clientName, location });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-gray-900 border-gray-700 sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-400" />
            Export Installation Package
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
            <p className="text-sm text-gray-400 mb-1">Project</p>
            <p className="text-white font-medium">{projectName || 'Untitled Project'}</p>
          </div>

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
        </div>

        <div className="flex justify-end gap-2">
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
      </DialogContent>
    </Dialog>
  );
}