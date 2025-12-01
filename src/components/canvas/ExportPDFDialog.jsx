import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FileText, Download, Loader2, Wrench, User, BookOpen, Search, CheckCircle2, AlertCircle } from "lucide-react";
import { base44 } from "@/api/base44Client";
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
  const [isCheckingManuals, setIsCheckingManuals] = useState(false);
  const [manualSearchProgress, setManualSearchProgress] = useState(null);

  // Get unique products missing manuals
  const getProductsMissingManuals = () => {
    const seen = new Set();
    const missing = [];
    canvasProducts.forEach(cp => {
      if (!seen.has(cp.product.id)) {
        seen.add(cp.product.id);
        if (!cp.product.installation_manual_url && !cp.product.user_manual_url) {
          missing.push(cp.product);
        }
      }
    });
    return missing;
  };

  const searchManualsForProducts = async (products) => {
    setIsCheckingManuals(true);
    setManualSearchProgress({ current: 0, total: products.length, found: 0 });

    for (let i = 0; i < products.length; i++) {
      const product = products[i];
      setManualSearchProgress(prev => ({ ...prev, current: i + 1, searching: `${product.brand} ${product.model}` }));

      try {
        const response = await base44.integrations.Core.InvokeLLM({
          prompt: `Find the official PDF manuals for this AV product:
Brand: ${product.brand}
Model: ${product.model}

Search for:
1. Installation manual / Quick start guide PDF - direct URL from manufacturer website
2. User manual / Owner's manual PDF - direct URL from manufacturer website

Only return URLs that:
- End in .pdf
- Are from official manufacturer websites or authorized documentation sites
- Are direct download links to the PDF files`,
          add_context_from_internet: true,
          response_json_schema: {
            type: "object",
            properties: {
              installation_manual_url: { type: "string" },
              user_manual_url: { type: "string" }
            }
          }
        });

        if (response.installation_manual_url || response.user_manual_url) {
          await base44.entities.AVProduct.update(product.id, {
            installation_manual_url: response.installation_manual_url || product.installation_manual_url,
            user_manual_url: response.user_manual_url || product.user_manual_url
          });
          setManualSearchProgress(prev => ({ ...prev, found: prev.found + 1 }));
        }
      } catch (error) {
        console.error(`Failed to search manuals for ${product.brand} ${product.model}:`, error);
      }
    }

    setIsCheckingManuals(false);
    setManualSearchProgress(prev => ({ ...prev, completed: true }));
  };

  const handleExport = async () => {
    // For installer package, check for missing manuals first
    if (exportType === 'installer' || exportType === 'documentation') {
      const missingManuals = getProductsMissingManuals();
      if (missingManuals.length > 0 && !manualSearchProgress?.completed) {
        await searchManualsForProducts(missingManuals);
      }
    }
    onExport({ clientName, location, engine: exportEngine, exportType });
  };

  const productsMissingManuals = getProductsMissingManuals();

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
        'AI-generated "How Your System Works" guide',
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

          {/* Manual Search Status - Only show for installer/documentation */}
          {(exportType === 'installer' || exportType === 'documentation') && (
            <div className={`rounded-lg p-3 border ${
              manualSearchProgress?.completed 
                ? 'bg-green-500/10 border-green-500/30' 
                : productsMissingManuals.length > 0 
                  ? 'bg-orange-500/10 border-orange-500/30'
                  : 'bg-green-500/10 border-green-500/30'
            }`}>
              <div className="flex items-center gap-2">
                {isCheckingManuals ? (
                  <>
                    <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />
                    <div className="flex-1">
                      <p className="text-sm text-blue-400 font-medium">Searching for manuals...</p>
                      <p className="text-xs text-gray-400">
                        {manualSearchProgress?.current}/{manualSearchProgress?.total} - {manualSearchProgress?.searching}
                      </p>
                      {manualSearchProgress?.found > 0 && (
                        <p className="text-xs text-green-400">Found {manualSearchProgress.found} manuals</p>
                      )}
                    </div>
                  </>
                ) : manualSearchProgress?.completed ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-green-400" />
                    <div className="flex-1">
                      <p className="text-sm text-green-400 font-medium">Manual search complete</p>
                      <p className="text-xs text-gray-400">
                        Found {manualSearchProgress.found} of {manualSearchProgress.total} product manuals
                      </p>
                    </div>
                  </>
                ) : productsMissingManuals.length > 0 ? (
                  <>
                    <AlertCircle className="w-4 h-4 text-orange-400" />
                    <div className="flex-1">
                      <p className="text-sm text-orange-400 font-medium">
                        {productsMissingManuals.length} devices missing manuals
                      </p>
                      <p className="text-xs text-gray-400">
                        Manuals will be searched automatically before export
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-green-400" />
                    <div className="flex-1">
                      <p className="text-sm text-green-400 font-medium">All devices have manuals</p>
                      <p className="text-xs text-gray-400">Ready to export with documentation links</p>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              onClick={onClose}
              className="border-gray-700 text-gray-300"
              disabled={isExporting || isCheckingManuals}
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
              disabled={isExporting || isCheckingManuals}
            >
              {isCheckingManuals ? (
                <>
                  <Search className="w-4 h-4 mr-2 animate-pulse" />
                  Finding Manuals...
                </>
              ) : isExporting ? (
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