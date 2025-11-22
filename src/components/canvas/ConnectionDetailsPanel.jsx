import React from 'react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { X, Trash2 } from "lucide-react";

const connectionTypes = {
  hdmi: { 
    name: "HDMI", 
    color: "bg-purple-500/10 text-purple-400 border-purple-500/20",
    signals: ["Video", "Audio", "Control"],
    description: "High-Definition Multimedia Interface for digital audio/video"
  },
  optical: { 
    name: "Optical/TOSLINK", 
    color: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
    signals: ["Audio"],
    description: "Digital optical audio connection"
  },
  rca: { 
    name: "RCA", 
    color: "bg-red-500/10 text-red-400 border-red-500/20",
    signals: ["Audio", "Video"],
    description: "Analog audio/video connection"
  },
  xlr: { 
    name: "XLR", 
    color: "bg-green-500/10 text-green-400 border-green-500/20",
    signals: ["Audio"],
    description: "Balanced audio connection, professional grade"
  },
  speaker_wire: { 
    name: "Speaker Wire", 
    color: "bg-orange-500/10 text-orange-400 border-orange-500/20",
    signals: ["Audio"],
    description: "Direct speaker connection from amplifier"
  },
  ethernet: { 
    name: "Ethernet", 
    color: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    signals: ["Data", "Audio", "Video"],
    description: "Network connection for streaming and control"
  },
  usb: { 
    name: "USB", 
    color: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
    signals: ["Data", "Audio"],
    description: "Universal Serial Bus for digital audio and data"
  },
  coaxial: { 
    name: "Coaxial", 
    color: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
    signals: ["Audio"],
    description: "Digital coaxial audio connection"
  }
};

export default function ConnectionDetailsPanel({ connection, fromProduct, toProduct, onClose, onDelete }) {
  // Normalize connection type - handle both "Speaker Wire" and "speaker_wire"
  const normalizeTypeKey = (type) => type.toLowerCase().replace(/[^a-z0-9]/g, '_');
  const typeKey = normalizeTypeKey(connection.type);
  
  // Try to find by normalized key, fallback to hdmi
  const connectionInfo = Object.entries(connectionTypes).find(([key]) => 
    normalizeTypeKey(key) === typeKey || key === typeKey
  )?.[1] || connectionTypes.speaker_wire;

  return (
    <div className="w-80 bg-gray-900 border-l border-gray-800 flex flex-col h-full">
      <div className="p-4 border-b border-gray-800 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">Connection Details</h2>
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
          <p className="text-sm text-gray-500 mb-3">Connected Devices</p>
          <div className="space-y-3">
            <div className="bg-gray-800 rounded-lg p-3">
              <p className="text-xs text-gray-400 mb-1">From</p>
              <p className="text-sm font-medium text-white">{fromProduct.brand}</p>
              <p className="text-xs text-gray-400">{fromProduct.model}</p>
            </div>
            <div className="text-center">
              <div className="w-px h-6 bg-gray-700 mx-auto"></div>
            </div>
            <div className="bg-gray-800 rounded-lg p-3">
              <p className="text-xs text-gray-400 mb-1">To</p>
              <p className="text-sm font-medium text-white">{toProduct.brand}</p>
              <p className="text-xs text-gray-400">{toProduct.model}</p>
            </div>
          </div>
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
    </div>
  );
}