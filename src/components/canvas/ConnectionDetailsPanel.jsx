import React from 'react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { X, Trash2 } from "lucide-react";

const connectionTypes = {
  hdmi: { 
    name: "HDMI", 
    color: "bg-[#E74C3C]/10 text-[#E74C3C] border-[#E74C3C]/20",
    signals: ["Video", "Audio", "Control"],
    description: "High-Definition Multimedia Interface for digital audio/video"
  },
  optical: { 
    name: "Optical/TOSLINK", 
    color: "bg-[#2A7FDB]/10 text-[#2A7FDB] border-[#2A7FDB]/20",
    signals: ["Audio"],
    description: "Digital optical audio connection"
  },
  rca: { 
    name: "RCA", 
    color: "bg-[#FFB300]/10 text-[#FFB300] border-[#FFB300]/20",
    signals: ["Audio", "Video"],
    description: "Analog audio/video connection"
  },
  xlr: { 
    name: "XLR", 
    color: "bg-[#1ABC9C]/10 text-[#1ABC9C] border-[#1ABC9C]/20",
    signals: ["Audio"],
    description: "Balanced audio connection, professional grade"
  },
  speaker_wire: { 
    name: "Speaker Wire", 
    color: "bg-[#8E5C2C]/10 text-[#8E5C2C] border-[#8E5C2C]/20",
    signals: ["Audio"],
    description: "Direct speaker connection from amplifier"
  },
  ethernet: { 
    name: "Ethernet", 
    color: "bg-[#27AE60]/10 text-[#27AE60] border-[#27AE60]/20",
    signals: ["Data", "Audio", "Video"],
    description: "Network connection for streaming and control"
  },
  usb: { 
    name: "USB", 
    color: "bg-[#2A7FDB]/10 text-[#2A7FDB] border-[#2A7FDB]/20",
    signals: ["Data", "Audio"],
    description: "Universal Serial Bus for digital audio and data"
  },
  coaxial: { 
    name: "Coaxial", 
    color: "bg-[#2A7FDB]/10 text-[#2A7FDB] border-[#2A7FDB]/20",
    signals: ["Audio"],
    description: "Digital coaxial audio connection"
  }
};

export default function ConnectionDetailsPanel({ connection, fromProduct, toProduct, fromLabel, toLabel, allConnections, onClose, onDelete }) {
  // Normalize connection type - handle both "Speaker Wire" and "speaker_wire"
  const normalizeTypeKey = (type) => type.toLowerCase().replace(/[^a-z0-9]/g, '_');
  const typeKey = normalizeTypeKey(connection.type);
  
  // Try to find by normalized key, fallback to hdmi
  const connectionInfo = Object.entries(connectionTypes).find(([key]) => 
    normalizeTypeKey(key) === typeKey || key === typeKey
  )?.[1] || connectionTypes.speaker_wire;

  const isEmpty = connection.isEmpty;

  return (
    <div className="fixed right-0 top-[87px] bottom-0 w-80 bg-gray-900 border-l border-gray-800 z-40 flex flex-col overflow-hidden">
      <div className="p-4 border-b border-gray-800 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">
          {isEmpty ? 'Port Details' : 'Connection Details'}
        </h2>
        <Button
          size="icon"
          variant="ghost"
          onClick={onClose}
          className="text-gray-400 hover:text-white"
        >
          <X className="w-4 h-4" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {!isEmpty && (
          <div>
            <p className="text-sm text-gray-500 mb-2">Wire Label</p>
            <div className="bg-gray-800 rounded-lg p-3 border border-gray-700">
              <p className="text-lg font-mono font-bold text-white">
                {connection.wireId || `W${allConnections.indexOf(connection) + 1}`}
              </p>
              <p className="text-xs text-gray-500 mt-1">Wire identifier</p>
            </div>
          </div>
        )}

        <div>
          <p className="text-sm text-gray-500 mb-2">Connection Type</p>
          <Badge className={`${connectionInfo.color} border text-base px-3 py-1`}>
            {connectionInfo.name}
          </Badge>
        </div>

        <div>
          <p className="text-sm text-gray-500 mb-2">Description</p>
          <p className="text-sm text-gray-300">{connectionInfo.description}</p>
        </div>

        <div>
          <p className="text-sm text-gray-500 mb-2">Signal Types</p>
          <div className="flex flex-wrap gap-2">
            {connectionInfo.signals.map(signal => (
              <Badge key={signal} variant="outline" className="text-xs">
                {signal}
              </Badge>
            ))}
          </div>
        </div>

        <div className="border-t border-gray-800 pt-4">
          <p className="text-sm text-gray-500 mb-3">
            {isEmpty ? 'Port Status' : 'Connected Devices'}
          </p>
          {isEmpty ? (
            <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
              <p className="text-sm font-medium text-white mb-1">
                {fromProduct?.brand || toProduct?.brand || 'Device'}
              </p>
              <p className="text-xs text-gray-400 mb-3">
                {fromProduct?.model || toProduct?.model || 'N/A'}
              </p>
              {(connection.fromPort || connection.toPort) && (
                <div className="mb-3">
                  <Badge className="bg-gray-700 text-gray-300 border-gray-600 text-xs">
                    {connection.fromPort || connection.toPort}
                  </Badge>
                </div>
              )}
              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 text-center">
                <p className="text-yellow-400 text-sm font-medium">No Device Connected</p>
                <p className="text-yellow-300/60 text-xs mt-1">This port is available</p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="bg-gray-800 rounded-lg p-3">
                <p className="text-xs text-gray-400 mb-1">From</p>
                <p className="text-sm font-medium text-white">{fromProduct?.brand || 'Unknown Device'}</p>
                <p className="text-xs text-gray-400">{fromProduct?.model || 'N/A'}</p>
                {connection.fromPort && (
                  <div className="mt-2 inline-block">
                    <Badge className="bg-purple-500/10 text-purple-300 border-purple-500/30 text-xs">
                      {connection.fromPort}
                    </Badge>
                  </div>
                )}
              </div>
              <div className="text-center">
                <div className="w-px h-6 bg-gray-700 mx-auto"></div>
              </div>
              <div className="bg-gray-800 rounded-lg p-3">
                <p className="text-xs text-gray-400 mb-1">To</p>
                <p className="text-sm font-medium text-white">{toProduct?.brand || 'Unknown Device'}</p>
                <p className="text-xs text-gray-400">{toProduct?.model || 'N/A'}</p>
                {connection.toPort && (
                  <div className="mt-2 inline-block">
                    <Badge className="bg-blue-500/10 text-blue-300 border-blue-500/30 text-xs">
                      {connection.toPort}
                    </Badge>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="border-t border-gray-800 pt-4">
          <p className="text-sm text-gray-500 mb-2">Available Connection Types</p>
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(connectionTypes).map(([key, info]) => (
              <div 
                key={key}
                className="bg-gray-800 rounded p-2 text-xs text-gray-300 hover:bg-gray-750 transition-colors"
              >
                {info.name}
              </div>
            ))}
          </div>
        </div>
      </div>

      {!isEmpty && (
        <div className="p-4 border-t border-gray-800">
          <Button
            variant="outline"
            onClick={onDelete}
            className="w-full border-red-500/20 text-red-400 hover:bg-red-500/10 hover:text-red-300 hover:border-red-500"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Delete Connection
          </Button>
        </div>
      )}
    </div>
  );
}