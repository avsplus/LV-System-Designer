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
    onExport({ clientName, location, engine: exportEngine });
  };

  const handleGenerateLabel = () => {
    if (labelType === 'device' && selectedDevice) {
      const device = canvasProducts.find(cp => cp.instanceId === selectedDevice);
      onGenerateLabels?.({ type: 'device', device });
    } else if (labelType === 'cable' && selectedConnection) {
      const conn = connections[parseInt(selectedConnection)];
      const fromDevice = canvasProducts.find(cp => cp.instanceId === conn?.from);
      const toDevice = canvasProducts.find(cp => cp.instanceId === conn?.to);
      onGenerateLabels?.({ type: 'cable', connection: conn, fromDevice, toDevice });
    }
  };

  const handleGenerateRoomDiagram = () => {
    if (selectedRoom) {
      const roomDevices = canvasProducts.filter(cp => cp.room === selectedRoom);
      const roomConnections = connections.filter(c => {
        const from = canvasProducts.find(cp => cp.instanceId === c.from);
        const to = canvasProducts.find(cp => cp.instanceId === c.to);
        return from?.room === selectedRoom || to?.room === selectedRoom;
      });
      onGenerateRoomDiagram?.({ room: selectedRoom, devices: roomDevices, connections: roomConnections });
    }
  };

  const uniqueRooms = [...new Set(canvasProducts.map(cp => cp.room).filter(Boolean))];

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
            <TabsTrigger value="labels" className="data-[state=active]:bg-blue-600">
              <Tag className="w-4 h-4 mr-1" /> Labels
            </TabsTrigger>
            <TabsTrigger value="diagrams" className="data-[state=active]:bg-blue-600">
              <Layers className="w-4 h-4 mr-1" /> Diagrams
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

          {/* Labels Tab */}
          <TabsContent value="labels" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label className="text-gray-300">Label Type</Label>
              <Select value={labelType} onValueChange={setLabelType}>
                <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-700">
                  <SelectItem value="device" className="text-white">Device Label</SelectItem>
                  <SelectItem value="cable" className="text-white">Cable Label</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {labelType === 'device' && (
              <div className="space-y-2">
                <Label className="text-gray-300">Select Device</Label>
                <Select value={selectedDevice} onValueChange={setSelectedDevice}>
                  <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                    <SelectValue placeholder="Choose a device..." />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-700 max-h-60">
                    {canvasProducts.map(cp => (
                      <SelectItem key={cp.instanceId} value={cp.instanceId} className="text-white">
                        {cp.label || cp.product.brand} - {cp.product.model}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {labelType === 'cable' && (
              <div className="space-y-2">
                <Label className="text-gray-300">Select Connection</Label>
                <Select value={selectedConnection} onValueChange={setSelectedConnection}>
                  <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                    <SelectValue placeholder="Choose a connection..." />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-700 max-h-60">
                    {connections.map((conn, i) => {
                      const from = canvasProducts.find(cp => cp.instanceId === conn.from);
                      const to = canvasProducts.find(cp => cp.instanceId === conn.to);
                      return (
                        <SelectItem key={i} value={i.toString()} className="text-white">
                          {conn.wireId || `C${i+1}`}: {from?.label || 'Unknown'} → {to?.label || 'Unknown'}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-3">
              <p className="text-purple-400 text-sm font-medium mb-1">
                <Image className="w-4 h-4 inline mr-1" />
                Label Output:
              </p>
              <p className="text-xs text-gray-400">
                {labelType === 'device' 
                  ? 'Generates a printable device label with name, model, room, and network info.'
                  : 'Generates a cable label with wire ID, route, and connection type.'}
              </p>
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
                onClick={handleGenerateLabel}
                className="bg-purple-600 hover:bg-purple-700"
                disabled={isExporting || (labelType === 'device' ? !selectedDevice : !selectedConnection)}
              >
                {isExporting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Image className="w-4 h-4 mr-2" />
                    Generate Label
                  </>
                )}
              </Button>
            </div>
          </TabsContent>

          {/* Diagrams Tab */}
          <TabsContent value="diagrams" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label className="text-gray-300">Select Room</Label>
              <Select value={selectedRoom} onValueChange={setSelectedRoom}>
                <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                  <SelectValue placeholder="Choose a room..." />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-700">
                  {uniqueRooms.map(room => (
                    <SelectItem key={room} value={room} className="text-white">
                      {room} ({canvasProducts.filter(cp => cp.room === room).length} devices)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3">
              <p className="text-green-400 text-sm font-medium mb-1">
                <Layers className="w-4 h-4 inline mr-1" />
                Room Diagram:
              </p>
              <p className="text-xs text-gray-400">
                Generates a visual diagram showing all devices in the selected room with their connections.
              </p>
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
                onClick={handleGenerateRoomDiagram}
                className="bg-green-600 hover:bg-green-700"
                disabled={isExporting || !selectedRoom}
              >
                {isExporting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Image className="w-4 h-4 mr-2" />
                    Generate Diagram
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