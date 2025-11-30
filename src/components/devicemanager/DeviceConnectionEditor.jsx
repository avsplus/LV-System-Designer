import React, { useState } from 'react';
import { Droppable, Draggable } from '@hello-pangea/dnd';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Trash2, Plus, X, ChevronDown, ChevronUp } from "lucide-react";
import { connectionTypes } from "./ConnectionsSidebar";

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
  hasChanges,
  isSaving
}) {
  const [expandedInputs, setExpandedInputs] = useState({});
  const [expandedOutputs, setExpandedOutputs] = useState({});
  const [newPortInputs, setNewPortInputs] = useState({});
  const [newPortOutputs, setNewPortOutputs] = useState({});

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
  );
}