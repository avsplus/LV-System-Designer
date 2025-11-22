import React from 'react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";

const connectionsByCategory = {
  speakers: {
    inputs: [
      { type: "Speaker Wire", max: 2 },
      { type: "XLR", max: 2 }
    ],
    outputs: [],
    description: "Audio output device"
  },
  amplifiers: {
    inputs: [
      { type: "RCA", max: 4 },
      { type: "XLR", max: 2 },
      { type: "Optical", max: 2 },
      { type: "Coaxial", max: 1 },
      { type: "USB", max: 1 }
    ],
    outputs: [
      { type: "Speaker Wire", max: 4 },
      { type: "RCA", max: 2 },
      { type: "XLR", max: 2 }
    ],
    description: "Power amplification for speakers"
  },
  receivers: {
    inputs: [
      { type: "HDMI", max: 6 },
      { type: "RCA", max: 4 },
      { type: "Optical", max: 2 },
      { type: "Coaxial", max: 1 },
      { type: "USB", max: 2 },
      { type: "Ethernet", max: 1 }
    ],
    outputs: [
      { type: "HDMI", max: 2 },
      { type: "Speaker Wire", max: 7 },
      { type: "RCA", max: 2 },
      { type: "Optical", max: 1 }
    ],
    description: "Central hub for audio/video"
  },
  subwoofers: {
    inputs: [
      { type: "RCA", max: 2 },
      { type: "Speaker Wire", max: 1 },
      { type: "XLR", max: 1 }
    ],
    outputs: [],
    description: "Low-frequency audio output"
  },
  turntables: {
    inputs: [],
    outputs: [
      { type: "RCA", max: 1 },
      { type: "USB", max: 1 }
    ],
    description: "Analog audio source"
  },
  dacs: {
    inputs: [
      { type: "USB", max: 2 },
      { type: "Optical", max: 2 },
      { type: "Coaxial", max: 1 },
      { type: "Ethernet", max: 1 }
    ],
    outputs: [
      { type: "RCA", max: 2 },
      { type: "XLR", max: 2 }
    ],
    description: "Digital to analog conversion"
  },
  streamers: {
    inputs: [
      { type: "Ethernet", max: 1 },
      { type: "USB", max: 1 }
    ],
    outputs: [
      { type: "RCA", max: 2 },
      { type: "Optical", max: 1 },
      { type: "Coaxial", max: 1 },
      { type: "XLR", max: 2 }
    ],
    description: "Network audio streaming"
  },
  headphones: {
    inputs: [
      { type: "3.5mm Jack", max: 1 },
      { type: "XLR", max: 1 },
      { type: "USB", max: 1 }
    ],
    outputs: [],
    description: "Personal audio output"
  },
  processors: {
    inputs: [
      { type: "HDMI", max: 4 },
      { type: "RCA", max: 4 },
      { type: "XLR", max: 2 },
      { type: "Optical", max: 2 },
      { type: "Ethernet", max: 1 }
    ],
    outputs: [
      { type: "HDMI", max: 2 },
      { type: "RCA", max: 4 },
      { type: "XLR", max: 2 },
      { type: "Optical", max: 1 }
    ],
    description: "Audio/video signal processing"
  },
  cables: {
    inputs: [{ type: "Various", max: 999 }],
    outputs: [{ type: "Various", max: 999 }],
    description: "Signal transmission"
  },
  microphones: {
    inputs: [],
    outputs: [
      { type: "XLR", max: 1 },
      { type: "USB", max: 1 }
    ],
    description: "Audio input device"
  },
  mixers: {
    inputs: [
      { type: "XLR", max: 8 },
      { type: "RCA", max: 4 },
      { type: "USB", max: 1 }
    ],
    outputs: [
      { type: "XLR", max: 2 },
      { type: "RCA", max: 2 },
      { type: "USB", max: 1 }
    ],
    description: "Multi-channel audio mixing"
  }
};

const connectionTypeInfo = {
  "HDMI": { color: "bg-purple-500/10 text-purple-400 border-purple-500/20", signals: "Video, Audio, Control" },
  "Optical": { color: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20", signals: "Digital Audio" },
  "RCA": { color: "bg-red-500/10 text-red-400 border-red-500/20", signals: "Analog Audio/Video" },
  "XLR": { color: "bg-green-500/10 text-green-400 border-green-500/20", signals: "Balanced Audio" },
  "Speaker Wire": { color: "bg-orange-500/10 text-orange-400 border-orange-500/20", signals: "Speaker Audio" },
  "Ethernet": { color: "bg-blue-500/10 text-blue-400 border-blue-500/20", signals: "Network Data" },
  "USB": { color: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20", signals: "Digital Data/Audio" },
  "Coaxial": { color: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20", signals: "Digital Audio" },
  "3.5mm Jack": { color: "bg-gray-500/10 text-gray-400 border-gray-500/20", signals: "Analog Audio" },
  "Various": { color: "bg-gray-500/10 text-gray-400 border-gray-500/20", signals: "Multiple Types" }
};

export default function DeviceConnectionsPanel({ product, activeConnections, allProducts, onClose }) {
  const connections = connectionsByCategory[product.category] || { inputs: [], outputs: [], description: "" };
  
  // Get connections for this device
  const deviceConnections = activeConnections.filter(
    conn => conn.from === product.id || conn.to === product.id
  );
  
  // Normalize connection type strings for comparison
  const normalizeType = (type) => type.toLowerCase().replace(/[^a-z0-9]/g, '');
  
  // Count connections by type (flexible matching)
  const getConnectionCount = (connectionType, isInput) => {
    const matches = deviceConnections.filter(conn => {
      const isCorrectDirection = isInput ? (conn.to === product.id) : (conn.from === product.id);
      if (!isCorrectDirection) return false;
      
      const connTypeNorm = normalizeType(conn.type || '');
      const expectedTypeNorm = normalizeType(connectionType);
      return connTypeNorm === expectedTypeNorm;
    });
    return matches.length;
  };
  
  // Get connected device info
  const getConnectedDevices = (connectionType, isInput) => {
    const normalizedConnectionType = normalizeType(connectionType);
    
    return deviceConnections
      .filter(conn => {
        const isCorrectDirection = isInput ? (conn.to === product.id) : (conn.from === product.id);
        if (!isCorrectDirection) return false;
        
        return normalizeType(conn.type || '') === normalizedConnectionType;
      })
      .map(conn => {
        const connectedId = conn.from === product.id ? conn.to : conn.from;
        return allProducts.find(p => p.id === connectedId);
      })
      .filter(Boolean);
  };

  return (
    <div className="w-96 bg-gray-900 border-l border-gray-800 flex flex-col h-full">
      <div className="p-4 border-b border-gray-800 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">Device Connections</h2>
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
        <div className="bg-gray-800 rounded-lg p-4">
          <h3 className="text-lg font-bold text-white mb-1">{product.brand}</h3>
          <p className="text-sm text-gray-300 mb-2">{product.model}</p>
          <Badge className="bg-blue-500/10 text-blue-400 border-blue-500/20 border">
            {product.category}
          </Badge>
        </div>

        <div>
          <p className="text-sm text-gray-400 mb-2">{connections.description}</p>
        </div>

        {deviceConnections.length > 0 && (
          <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700">
            <p className="text-xs text-gray-500 mb-2">Debug - Total Active: {deviceConnections.length}</p>
            {deviceConnections.map((conn, i) => {
              const otherDevice = allProducts.find(p => p.id === (conn.from === product.id ? conn.to : conn.from));
              return (
                <div key={i} className="text-xs text-gray-300 mb-1 font-mono">
                  • Type="{conn.type}" norm="{normalizeType(conn.type || '')}" dir={conn.from === product.id ? 'OUT' : 'IN'} to={otherDevice?.brand}
                </div>
              );
            })}
          </div>
        )}

        {connections.inputs.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-white mb-3 flex items-center">
              <span className="w-2 h-2 rounded-full bg-green-500 mr-2"></span>
              Input Connections
            </h4>
            <div className="space-y-2">
              {connections.inputs.map((input, idx) => {
                const info = connectionTypeInfo[input.type] || connectionTypeInfo["Various"];
                const used = getConnectionCount(input.type, true);
                const available = input.max - used;
                const connectedDevices = getConnectedDevices(input.type, true);
                
                return (
                  <div key={idx} className="bg-gray-800 rounded-lg p-3 border border-gray-700">
                    <div className="flex items-center justify-between mb-1">
                      <Badge className={`${info.color} border text-sm`}>
                        {input.type}
                      </Badge>
                      <span className={`text-xs font-medium ${available > 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {used}/{input.max}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 mb-2">{info.signals}</p>
                    {connectedDevices.length > 0 && (
                      <div className="mt-2 pt-2 border-t border-gray-700">
                        <p className="text-xs text-gray-500 mb-1">Connected to:</p>
                        {connectedDevices.map((dev, i) => (
                          <div key={i} className="text-xs text-gray-300 truncate">
                            • {dev.brand} {dev.model}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {connections.outputs.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-white mb-3 flex items-center">
              <span className="w-2 h-2 rounded-full bg-blue-500 mr-2"></span>
              Output Connections
            </h4>
            <div className="space-y-2">
              {connections.outputs.map((output, idx) => {
                const info = connectionTypeInfo[output.type] || connectionTypeInfo["Various"];
                const used = getConnectionCount(output.type, false);
                const available = output.max - used;
                const connectedDevices = getConnectedDevices(output.type, false);
                
                const matchingConns = deviceConnections.filter(conn => 
                  conn.from === product.id && normalizeType(conn.type || '') === normalizeType(output.type)
                );
                
                return (
                  <div key={idx} className="bg-gray-800 rounded-lg p-3 border border-gray-700">
                    <div className="flex items-center justify-between mb-1">
                      <Badge className={`${info.color} border text-sm`}>
                        {output.type}
                      </Badge>
                      <span className={`text-xs font-medium ${available > 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {used}/{output.max}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 mb-2">{info.signals}</p>
                    <p className="text-xs text-gray-500 font-mono">
                      Debug: norm={normalizeType(output.type)} matched={matchingConns.length} used={used}
                    </p>
                    {connectedDevices.length > 0 && (
                      <div className="mt-2 pt-2 border-t border-gray-700">
                        <p className="text-xs text-gray-500 mb-1">Connected to:</p>
                        {connectedDevices.map((dev, i) => (
                          <div key={i} className="text-xs text-gray-300 truncate">
                            • {dev.brand} {dev.model}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {product.specs && Object.keys(product.specs).length > 0 && (
          <div className="border-t border-gray-800 pt-4">
            <h4 className="text-sm font-semibold text-white mb-3">Technical Specifications</h4>
            <div className="space-y-2">
              {Object.entries(product.specs).map(([key, value]) => 
                value ? (
                  <div key={key} className="flex justify-between items-start py-2 border-b border-gray-800">
                    <span className="text-xs text-gray-400 capitalize">
                      {key.replace(/_/g, ' ')}
                    </span>
                    <span className="text-xs text-gray-200 text-right ml-2">
                      {value}
                    </span>
                  </div>
                ) : null
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}