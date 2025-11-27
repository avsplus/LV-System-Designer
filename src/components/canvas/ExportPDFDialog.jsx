import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FileText, Download, Loader2, Wrench, User, BookOpen } from "lucide-react";
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

export default function ExportPDFDialog({ 
  open, 
  onClose, 
  onExport, 
  projectName,
  isExporting,
  exportEngine = 'jspdf',
  onExportEngineChange,
  canvasProducts = [],
  connections = [],
  rooms = []
}) {
  const [clientName, setClientName] = useState('');
  const [location, setLocation] = useState('');
  const [exportType, setExportType] = useState('installer'); // 'installer', 'client', 'documentation'

  const handleExport = () => {
    onExport({ clientName, location, engine: exportEngine, exportType });
  };

  const exportTypeInfo = {
    installer: {
      title: 'Installer Package',
      icon: Wrench,
      color: 'blue',
      description: 'Complete technical documentation for installation',
      contents: [
        'Cover page with project details',
        'Device documentation with network info',
        'Wire schedule with specifications',
        'Room-by-room device breakdown',
        'Installation sign-off page'
      ],
      excludes: ['BOM pricing', 'Labor costs']
    },
    client: {
      title: 'Client Proposal',
      icon: User,
      color: 'green',
      description: 'Professional proposal for client review',
      contents: [
        'Cover page with project details',
        'Scope of work summary',
        'Devices per room overview',
        'Bill of Materials with pricing',
        'Labor costs breakdown',
        'Project total and sign-off'
      ],
      excludes: ['Wire schedule', 'Device connections', 'Network info']
    },
    documentation: {
      title: 'Full Documentation',
      icon: BookOpen,
      color: 'purple',
      description: 'Complete package with all details',
      contents: [
        'Everything from Installer Package',
        'Everything from Client Proposal',
        'Complete system documentation'
      ],
      excludes: []
    }
  };

  const currentInfo = exportTypeInfo[exportType];
  const IconComponent = currentInfo.icon;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-gray-900 border-gray-700 sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-400" />
            Export to PDF
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Project Info */}
          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
            <p className="text-sm text-gray-400 mb-1">Project</p>
            <p className="text-white font-medium">{projectName || 'Untitled Project'}</p>
            <div className="flex gap-4 mt-2 text-xs text-gray-500">
              <span>{canvasProducts.length} Devices</span>
              <span>{connections.length} Connections</span>
              <span>{rooms.length} Rooms</span>
            </div>
          </div>

          {/* Export Type Selection */}
          <div className="space-y-2">
            <Label className="text-gray-300">Export Type</Label>
            <div className="grid grid-cols-3 gap-2">
              {Object.entries(exportTypeInfo).map(([key, info]) => {
                const Icon = info.icon;
                const isSelected = exportType === key;
                const colorClass = {
                  blue: isSelected ? 'border-blue-500 bg-blue-500/20' : 'border-gray-700 hover:border-blue-500/50',
                  green: isSelected ? 'border-green-500 bg-green-500/20' : 'border-gray-700 hover:border-green-500/50',
                  purple: isSelected ? 'border-purple-500 bg-purple-500/20' : 'border-gray-700 hover:border-purple-500/50'
                }[info.color];
                const textColor = {
                  blue: 'text-blue-400',
                  green: 'text-green-400',
                  purple: 'text-purple-400'
                }[info.color];

                return (
                  <button
                    key={key}
                    onClick={() => setExportType(key)}
                    className={`p-3 rounded-lg border-2 transition-all ${colorClass}`}
                  >
                    <Icon className={`w-5 h-5 mx-auto mb-1 ${isSelected ? textColor : 'text-gray-400'}`} />
                    <p className={`text-xs font-medium ${isSelected ? 'text-white' : 'text-gray-400'}`}>
                      {key === 'installer' ? 'Installer' : key === 'client' ? 'Client' : 'Full Doc'}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* PDF Engine */}
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
            </div>
          )}

          {/* Client Info */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="text-gray-300">Client Name</Label>
              <Input
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="e.g., John Smith"
                className="bg-gray-800 border-gray-700 text-white"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-gray-300">Location</Label>
              <Input
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g., 123 Main St"
                className="bg-gray-800 border-gray-700 text-white"
              />
            </div>
          </div>

          {/* Export Type Details */}
          <div className={`rounded-lg p-3 border ${
            currentInfo.color === 'blue' ? 'bg-blue-500/10 border-blue-500/30' :
            currentInfo.color === 'green' ? 'bg-green-500/10 border-green-500/30' :
            'bg-purple-500/10 border-purple-500/30'
          }`}>
            <div className="flex items-center gap-2 mb-2">
              <IconComponent className={`w-4 h-4 ${
                currentInfo.color === 'blue' ? 'text-blue-400' :
                currentInfo.color === 'green' ? 'text-green-400' :
                'text-purple-400'
              }`} />
              <p className={`text-sm font-medium ${
                currentInfo.color === 'blue' ? 'text-blue-400' :
                currentInfo.color === 'green' ? 'text-green-400' :
                'text-purple-400'
              }`}>{currentInfo.title}</p>
            </div>
            <p className="text-xs text-gray-400 mb-2">{currentInfo.description}</p>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <p className="text-xs text-gray-500 mb-1">Includes:</p>
                <ul className="text-xs text-gray-400 space-y-0.5">
                  {currentInfo.contents.slice(0, 4).map((item, i) => (
                    <li key={i}>• {item}</li>
                  ))}
                  {currentInfo.contents.length > 4 && (
                    <li className="text-gray-500">+{currentInfo.contents.length - 4} more</li>
                  )}
                </ul>
              </div>
              {currentInfo.excludes.length > 0 && (
                <div>
                  <p className="text-xs text-gray-500 mb-1">Excludes:</p>
                  <ul className="text-xs text-red-400/70 space-y-0.5">
                    {currentInfo.excludes.map((item, i) => (
                      <li key={i}>✕ {item}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
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
              className={`${
                currentInfo.color === 'blue' ? 'bg-blue-600 hover:bg-blue-700' :
                currentInfo.color === 'green' ? 'bg-green-600 hover:bg-green-700' :
                'bg-purple-600 hover:bg-purple-700'
              }`}
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
                  Export {currentInfo.title}
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}