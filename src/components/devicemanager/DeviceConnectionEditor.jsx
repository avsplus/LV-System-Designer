import React, { useState, useEffect } from 'react';
import { Droppable, Draggable } from '@hello-pangea/dnd';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Trash2, Plus, X, ChevronDown, ChevronUp, FileText, ExternalLink, Search, Loader2, Save, AlertTriangle } from "lucide-react";
import { connectionTypes } from "./ConnectionsSidebar";
import { base44 } from "@/api/base44Client";

const getConnectionColor = (type) => {
  const conn = connectionTypes.find(c => c.type === type);
  return conn?.color || "#6b7280";
};

export default function DeviceConnectionEditor({ 
  device, 
  inputConnections, 
  outputConnections, 
  onInputsChange, 
  onOutputsChange,
  onClose,
  onFinish,
  onDeviceUpdate,
  hasChanges,
  isSaving
}) {
  const [expandedInputs, setExpandedInputs] = useState({});
  const [expandedOutputs, setExpandedOutputs] = useState({});
  const [newPortInputs, setNewPortInputs] = useState({});
  const [newPortOutputs, setNewPortOutputs] = useState({});
  const [isSearchingManuals, setIsSearchingManuals] = useState(false);
  const [previewManual, setPreviewManual] = useState(null);
  const [installationManualUrl, setInstallationManualUrl] = useState(device.installation_manual_url || '');
  const [userManualUrl, setUserManualUrl] = useState(device.user_manual_url || '');
  const [isSavingManuals, setIsSavingManuals] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [showReplaceConfirm, setShowReplaceConfirm] = useState(false);

  useEffect(() => {
    base44.auth.me().then(user => setCurrentUser(user)).catch(() => {});
  }, []);

  const isAdminOrOwner = currentUser?.role === 'admin' || currentUser?.role === 'owner';
  const hasExistingManuals = device.installation_manual_url || device.user_manual_url;

  const saveManualUrls = async () => {
    setIsSavingManuals(true);
    try {
      const updateData = {};
      if (installationManualUrl !== device.installation_manual_url) {
        updateData.installation_manual_url = installationManualUrl || null;
      }
      if (userManualUrl !== device.user_manual_url) {
        updateData.user_manual_url = userManualUrl || null;
      }
      
      if (Object.keys(updateData).length > 0) {
        await base44.entities.AVProduct.update(device.id, updateData);
        
        if (onDeviceUpdate) {
          onDeviceUpdate({
            ...device,
            ...updateData
          });
        }
      }
    } catch (error) {
      console.error('Failed to save manual URLs:', error);
    }
    setIsSavingManuals(false);
  };

  const handleSearchClick = () => {
    if (hasExistingManuals) {
      setShowReplaceConfirm(true);
    } else {
      searchForManuals();
    }
  };

  const searchForManuals = async () => {
    setShowReplaceConfirm(false);
    setIsSearchingManuals(true);
    try {
      const response = await base44.integrations.Core.InvokeLLM({
            prompt: `Find the official PDF manuals for this AV product:
      Brand: ${device.brand}
      Model: ${device.model}

      Search for INSTALLATION documentation (any of these terms):
      - Installation manual / Installation guide
      - Setup guide / Quick start guide
      - Assembly instructions

      Search for USER documentation (any of these terms):
      - User manual / User guide
      - Owner's manual / Operator's manual
      - Instruction manual
      - Technical documentation
      - Operations manual
      - Maintenance manual / Service manual

      Search patterns:
      - site:${device.brand.toLowerCase().replace(/\s+/g, '')}.com "${device.model}" filetype:pdf
      - "${device.brand} ${device.model}" installation guide pdf
      - "${device.brand} ${device.model}" setup guide pdf
      - "${device.brand} ${device.model}" user manual pdf
      - "${device.brand} ${device.model}" owner's manual pdf
      - "${device.brand} ${device.model}" quick start pdf

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

      // Only save URLs that actually end with .pdf
      const installManual = response.installation_manual_url?.toLowerCase().endsWith('.pdf') 
        ? response.installation_manual_url 
        : null;
      const userManual = response.user_manual_url?.toLowerCase().endsWith('.pdf') 
        ? response.user_manual_url 
        : null;
      
      // Always update with new search results (replace existing)
      const updateData = {};
      if (installManual) updateData.installation_manual_url = installManual;
      if (userManual) updateData.user_manual_url = userManual;
      
      if (Object.keys(updateData).length > 0) {
        await base44.entities.AVProduct.update(device.id, updateData);
        
        // Update local state
        if (updateData.installation_manual_url) setInstallationManualUrl(updateData.installation_manual_url);
        if (updateData.user_manual_url) setUserManualUrl(updateData.user_manual_url);
        
        if (onDeviceUpdate) {
          onDeviceUpdate({
            ...device,
            ...updateData
          });
        }
      }
    } catch (error) {
      console.error('Failed to search for manuals:', error);
    }
    setIsSearchingManuals(false);
  };

  const toggleExpanded = (type, isInput) => {
    if (isInput) {
      setExpandedInputs(prev => ({ ...prev, [type]: !prev[type] }));
    } else {
      setExpandedOutputs(prev => ({ ...prev, [type]: !prev[type] }));
    }
  };

  const addPort = (connectionType, isInput) => {
    const portName = isInput ? newPortInputs[connectionType] : newPortOutputs[connectionType];
    if (!portName?.trim()) return;

    if (isInput) {
      const updated = inputConnections.map(conn => {
        if (conn.type === connectionType) {
          return { ...conn, ports: [...conn.ports, portName.trim()] };
        }
        return conn;
      });
      onInputsChange(updated);
      setNewPortInputs(prev => ({ ...prev, [connectionType]: '' }));
    } else {
      const updated = outputConnections.map(conn => {
        if (conn.type === connectionType) {
          return { ...conn, ports: [...conn.ports, portName.trim()] };
        }
        return conn;
      });
      onOutputsChange(updated);
      setNewPortOutputs(prev => ({ ...prev, [connectionType]: '' }));
    }
  };

  const removePort = (connectionType, portIndex, isInput) => {
    if (isInput) {
      const updated = inputConnections.map(conn => {
        if (conn.type === connectionType) {
          return { ...conn, ports: conn.ports.filter((_, i) => i !== portIndex) };
        }
        return conn;
      });
      onInputsChange(updated);
    } else {
      const updated = outputConnections.map(conn => {
        if (conn.type === connectionType) {
          return { ...conn, ports: conn.ports.filter((_, i) => i !== portIndex) };
        }
        return conn;
      });
      onOutputsChange(updated);
    }
  };

  const removeConnectionType = (connectionType, isInput) => {
    if (isInput) {
      onInputsChange(inputConnections.filter(c => c.type !== connectionType));
    } else {
      onOutputsChange(outputConnections.filter(c => c.type !== connectionType));
    }
  };

  const renderConnectionList = (connections, isInput) => {
    const expanded = isInput ? expandedInputs : expandedOutputs;
    const newPorts = isInput ? newPortInputs : newPortOutputs;
    const setNewPorts = isInput ? setNewPortInputs : setNewPortOutputs;

    return (
      <Droppable droppableId={isInput ? "inputs-drop" : "outputs-drop"}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`min-h-[200px] p-3 rounded-lg border-2 border-dashed transition-colors ${
              snapshot.isDraggingOver 
                ? 'border-blue-500 bg-blue-500/10' 
                : 'border-gray-700 bg-gray-800/50'
            }`}
          >
            {connections.length === 0 ? (
              <div className="h-full flex items-center justify-center text-gray-500 text-sm">
                Drag connection types here
              </div>
            ) : (
              <div className="space-y-2">
                {connections.map((conn, idx) => (
                  <Draggable
                    key={`${isInput ? 'input' : 'output'}-${conn.type}`}
                    draggableId={`${isInput ? 'input' : 'output'}-${conn.type}`}
                    index={idx}
                  >
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        {...provided.dragHandleProps}
                        className={`bg-gray-800 rounded-lg border transition-all ${
                          snapshot.isDragging ? 'border-blue-500 shadow-lg' : 'border-gray-700'
                        }`}
                      >
                        <div 
                          className="flex items-center justify-between p-3 cursor-pointer"
                          onClick={() => toggleExpanded(conn.type, isInput)}
                        >
                          <div className="flex items-center gap-2">
                            <div 
                              className="w-4 h-4 rounded-full"
                              style={{ backgroundColor: getConnectionColor(conn.type) }}
                            />
                            <span className="text-white font-medium">{conn.type}</span>
                            <Badge variant="outline" className="text-xs border-gray-600">
                              {conn.ports.length} port{conn.ports.length !== 1 ? 's' : ''}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={(e) => {
                                e.stopPropagation();
                                removeConnectionType(conn.type, isInput);
                              }}
                              className="h-6 w-6 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                            {expanded[conn.type] ? (
                              <ChevronUp className="w-4 h-4 text-gray-400" />
                            ) : (
                              <ChevronDown className="w-4 h-4 text-gray-400" />
                            )}
                          </div>
                        </div>

                        {expanded[conn.type] && (
                          <div className="px-3 pb-3 border-t border-gray-700 pt-3">
                            <div className="space-y-1 mb-2">
                              {conn.ports.map((port, portIdx) => (
                                <div 
                                  key={portIdx}
                                  className="flex items-center justify-between bg-gray-900 rounded px-2 py-1"
                                >
                                  <span className="text-sm text-gray-300">{port}</span>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    onClick={() => removePort(conn.type, portIdx, isInput)}
                                    className="h-5 w-5 text-gray-500 hover:text-red-400"
                                  >
                                    <X className="w-3 h-3" />
                                  </Button>
                                </div>
                              ))}
                            </div>
                            <div className="flex gap-2">
                              <Input
                                value={newPorts[conn.type] || ''}
                                onChange={(e) => setNewPorts(prev => ({ 
                                  ...prev, 
                                  [conn.type]: e.target.value 
                                }))}
                                placeholder="Add port name..."
                                className="bg-gray-900 border-gray-700 text-white text-sm h-8"
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    addPort(conn.type, isInput);
                                  }
                                }}
                              />
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => addPort(conn.type, isInput)}
                                className="border-gray-700 h-8"
                              >
                                <Plus className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </Draggable>
                ))}
              </div>
            )}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    );
  };

  return (
    <>
    {/* Replace Manuals Confirmation Modal */}
    {showReplaceConfirm && (
      <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
        <div className="bg-gray-900 border border-gray-700 rounded-xl w-full max-w-md p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-yellow-500/20 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-yellow-500" />
            </div>
            <h3 className="text-lg font-semibold text-white">Replace Existing Manuals?</h3>
          </div>
          <p className="text-gray-400 text-sm mb-6">
            This device already has manual URLs saved. Searching for new manuals will replace the existing URLs with any new ones found. This action cannot be undone.
          </p>
          <div className="flex gap-3 justify-end">
            <Button
              variant="outline"
              onClick={() => setShowReplaceConfirm(false)}
              className="border-gray-700 text-gray-300"
            >
              Cancel
            </Button>
            <Button
              onClick={searchForManuals}
              className="bg-yellow-600 hover:bg-yellow-700"
            >
              Replace Manuals
            </Button>
          </div>
        </div>
      </div>
    )}

    {/* Manual Preview Modal */}
    {previewManual && (
      <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
        <div className="bg-gray-900 border border-gray-700 rounded-xl w-full max-w-5xl h-[90vh] flex flex-col">
          <div className="p-4 border-b border-gray-700 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-white">
              {previewManual.type === 'installation' ? 'Installation Manual' : 'User Manual'}
            </h3>
            <Button
              size="icon"
              variant="ghost"
              onClick={() => setPreviewManual(null)}
              className="text-gray-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
          <div className="flex-1 p-4">
            <iframe 
              src={previewManual.url}
              className="w-full h-full rounded border border-gray-600"
              title={previewManual.type === 'installation' ? 'Installation Manual' : 'User Manual'}
            />
          </div>
          <div className="p-4 border-t border-gray-700 flex justify-end">
            <a
              href={previewManual.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
              Open in New Tab
            </a>
          </div>
        </div>
      </div>
    )}

    <div className="flex-1 flex flex-col h-full overflow-hidden">
      <div className="p-4 border-b border-gray-800 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white">
            {device.brand} {device.model}
          </h2>
          <p className="text-sm text-gray-400 capitalize">{device.category?.replace(/_/g, ' ')}</p>
        </div>
        <div className="flex items-center gap-3">
          {hasChanges && (
            <span className="text-xs text-yellow-400">• Unsaved changes</span>
          )}
          <Button
            variant="outline"
            onClick={onClose}
            className="border-gray-700 text-gray-300"
          >
            Cancel
          </Button>
          <Button
            onClick={onFinish}
            disabled={!hasChanges || isSaving}
            className="bg-green-600 hover:bg-green-700"
          >
            {isSaving ? 'Saving...' : 'Finish'}
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {/* Manuals Section */}
        <div className="mb-6 space-y-4">
          <div className="flex items-center gap-3">
            {(!hasExistingManuals || isAdminOrOwner) && (
              <Button
                onClick={handleSearchClick}
                disabled={isSearchingManuals}
                variant="outline"
                className="border-blue-500/50 text-blue-400 hover:text-white hover:bg-blue-600 hover:border-blue-600 whitespace-nowrap"
              >
                {isSearchingManuals ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Searching...
                  </>
                ) : (
                  <>
                    <Search className="w-4 h-4 mr-2" />
                    Search for Manuals
                  </>
                )}
              </Button>
            )}

            <Button
              onClick={() => installationManualUrl && setPreviewManual({ type: 'installation', url: installationManualUrl })}
              disabled={!installationManualUrl}
              variant="outline"
              size="icon"
              className={`${installationManualUrl 
                ? 'border-orange-500/50 text-orange-400 hover:text-white hover:bg-orange-600 hover:border-orange-600' 
                : 'border-gray-700 text-gray-500 cursor-not-allowed'}`}
              title="Preview Installation Manual"
            >
              <FileText className="w-4 h-4" />
            </Button>

            <Button
              onClick={() => userManualUrl && setPreviewManual({ type: 'user', url: userManualUrl })}
              disabled={!userManualUrl}
              variant="outline"
              size="icon"
              className={`${userManualUrl 
                ? 'border-green-500/50 text-green-400 hover:text-white hover:bg-green-600 hover:border-green-600' 
                : 'border-gray-700 text-gray-500 cursor-not-allowed'}`}
              title="Preview User Manual"
            >
              <FileText className="w-4 h-4" />
            </Button>
          </div>

          <div className="space-y-3">
            <div>
              <label className="text-xs text-orange-400 mb-1 block">Installation Manual URL</label>
              <div className="flex gap-2">
                <Input
                  value={installationManualUrl}
                  onChange={(e) => setInstallationManualUrl(e.target.value)}
                  placeholder="https://example.com/installation-manual.pdf"
                  className="bg-gray-800 border-gray-700 text-white text-sm flex-1"
                />
              </div>
            </div>
            <div>
              <label className="text-xs text-green-400 mb-1 block">User Manual URL</label>
              <div className="flex gap-2">
                <Input
                  value={userManualUrl}
                  onChange={(e) => setUserManualUrl(e.target.value)}
                  placeholder="https://example.com/user-manual.pdf"
                  className="bg-gray-800 border-gray-700 text-white text-sm flex-1"
                />
              </div>
            </div>
            {(installationManualUrl !== device.installation_manual_url || userManualUrl !== device.user_manual_url) && (
              <Button
                onClick={saveManualUrls}
                disabled={isSavingManuals}
                className="bg-green-600 hover:bg-green-700 w-full"
              >
                {isSavingManuals ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Save Manual URLs
                  </>
                )}
              </Button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6">
          {/* Inputs */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-3 h-3 rounded-full bg-green-500" />
              <h3 className="text-lg font-medium text-white">Inputs</h3>
              <span className="text-xs text-gray-500">
                ({inputConnections.reduce((sum, c) => sum + c.ports.length, 0)} total ports)
              </span>
            </div>
            {renderConnectionList(inputConnections, true)}
          </div>

          {/* Outputs */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-3 h-3 rounded-full bg-blue-500" />
              <h3 className="text-lg font-medium text-white">Outputs</h3>
              <span className="text-xs text-gray-500">
                ({outputConnections.reduce((sum, c) => sum + c.ports.length, 0)} total ports)
              </span>
            </div>
            {renderConnectionList(outputConnections, false)}
          </div>
        </div>
      </div>
    </div>
    </>
  );
}