import React from 'react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";

const connectionsByCategory = {
  speakers: {
    inputs: [
      { type: "Speaker Wire", ports: ["Left", "Right"] },
      { type: "XLR", ports: ["Left", "Right"] }
    ],
    outputs: [],
    description: "Audio output device"
  },
  amplifiers: {
    inputs: [
      { type: "RCA", ports: ["RCA-1", "RCA-2", "RCA-3", "RCA-4"] },
      { type: "XLR", ports: ["XLR-L", "XLR-R"] },
      { type: "Optical", ports: ["Optical-1", "Optical-2"] },
      { type: "Coaxial", ports: ["Coaxial"] },
      { type: "USB", ports: ["USB"] }
    ],
    outputs: [
      { type: "Speaker Wire", ports: ["Speaker-A", "Speaker-B", "Speaker-C", "Speaker-D"] },
      { type: "RCA", ports: ["Pre-Out-L", "Pre-Out-R"] },
      { type: "XLR", ports: ["XLR-Out-L", "XLR-Out-R"] }
    ],
    description: "Power amplification for speakers"
  },
  receivers: {
    inputs: [
      { type: "HDMI", ports: ["HDMI-1", "HDMI-2", "HDMI-3", "HDMI-4", "HDMI-5", "HDMI-6"] },
      { type: "RCA", ports: ["CD", "Phono", "AUX-1", "AUX-2"] },
      { type: "Optical", ports: ["Optical-1", "Optical-2"] },
      { type: "Coaxial", ports: ["Coaxial"] },
      { type: "USB", ports: ["USB-A", "USB-B"] },
      { type: "Ethernet", ports: ["LAN"] },
      { type: "Speaker Wire", ports: ["Front-L", "Front-R", "Center", "Surround-L", "Surround-R", "Surround-Back-L", "Surround-Back-R"] }
    ],
    outputs: [
      { type: "HDMI", ports: ["HDMI-Out-1", "HDMI-Out-2"] },
      { type: "Speaker Wire", ports: ["Front-L", "Front-R", "Center", "Surround-L", "Surround-R", "Surround-Back-L", "Surround-Back-R"] },
      { type: "RCA", ports: ["Zone-2-L", "Zone-2-R"] },
      { type: "Optical", ports: ["Optical-Out"] }
    ],
    description: "Central hub for audio/video"
  },
  subwoofers: {
    inputs: [
      { type: "RCA", ports: ["LFE-L", "LFE-R"] },
      { type: "Speaker Wire", ports: ["LFE"] },
      { type: "XLR", ports: ["XLR"] }
    ],
    outputs: [],
    description: "Low-frequency audio output"
  },
  turntables: {
    inputs: [],
    outputs: [
      { type: "RCA", ports: ["Phono-Out"] },
      { type: "USB", ports: ["USB-Out"] }
    ],
    description: "Analog audio source"
  },
  dacs: {
    inputs: [
      { type: "USB", ports: ["USB-A", "USB-B"] },
      { type: "Optical", ports: ["Optical-1", "Optical-2"] },
      { type: "Coaxial", ports: ["Coaxial"] },
      { type: "Ethernet", ports: ["LAN"] }
    ],
    outputs: [
      { type: "RCA", ports: ["Out-L", "Out-R"] },
      { type: "XLR", ports: ["XLR-L", "XLR-R"] }
    ],
    description: "Digital to analog conversion"
  },
  streamers: {
    inputs: [
      { type: "Ethernet", ports: ["LAN"] },
      { type: "USB", ports: ["USB"] }
    ],
    outputs: [
      { type: "RCA", ports: ["Out-L", "Out-R"] },
      { type: "Optical", ports: ["Optical-Out"] },
      { type: "Coaxial", ports: ["Coaxial-Out"] },
      { type: "XLR", ports: ["XLR-L", "XLR-R"] }
    ],
    description: "Network audio streaming"
  },
  headphones: {
    inputs: [
      { type: "3.5mm Jack", ports: ["Input"] },
      { type: "XLR", ports: ["XLR"] },
      { type: "USB", ports: ["USB"] }
    ],
    outputs: [],
    description: "Personal audio output"
  },
  processors: {
    inputs: [
      { type: "HDMI", ports: ["HDMI-1", "HDMI-2", "HDMI-3", "HDMI-4"] },
      { type: "RCA", ports: ["RCA-1", "RCA-2", "RCA-3", "RCA-4"] },
      { type: "XLR", ports: ["XLR-L", "XLR-R"] },
      { type: "Optical", ports: ["Optical-1", "Optical-2"] },
      { type: "Ethernet", ports: ["LAN"] }
    ],
    outputs: [
      { type: "HDMI", ports: ["HDMI-Out-1", "HDMI-Out-2"] },
      { type: "RCA", ports: ["Out-1", "Out-2", "Out-3", "Out-4"] },
      { type: "XLR", ports: ["XLR-Out-L", "XLR-Out-R"] },
      { type: "Optical", ports: ["Optical-Out"] }
    ],
    description: "Audio/video signal processing"
  },
  cables: {
    inputs: [{ type: "Various", ports: ["In"] }],
    outputs: [{ type: "Various", ports: ["Out"] }],
    description: "Signal transmission"
  },
  microphones: {
    inputs: [],
    outputs: [
      { type: "XLR", ports: ["XLR-Out"] },
      { type: "USB", ports: ["USB-Out"] }
    ],
    description: "Audio input device"
  },
  mixers: {
    inputs: [
      { type: "XLR", ports: ["Ch-1", "Ch-2", "Ch-3", "Ch-4", "Ch-5", "Ch-6", "Ch-7", "Ch-8"] },
      { type: "RCA", ports: ["Stereo-1", "Stereo-2", "Stereo-3", "Stereo-4"] },
      { type: "USB", ports: ["USB"] }
    ],
    outputs: [
      { type: "XLR", ports: ["Main-L", "Main-R"] },
      { type: "RCA", ports: ["Rec-L", "Rec-R"] },
      { type: "USB", ports: ["USB-Out"] }
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

export default function DeviceConnectionsPanel({ product, label, activeConnections, allProducts, onClose, onHighlightConnections }) {
  const instanceId = product.instanceId;
  const productData = product.product || product;
  const connections = connectionsByCategory[productData.category] || { inputs: [], outputs: [], description: "" };
  
  // Get connections for this device instance
  const deviceConnections = activeConnections.filter(
    conn => conn.from === instanceId || conn.to === instanceId
  );
  
  // Get used ports for a connection type
  const getUsedPorts = (connectionType, ports, isInput) => {
    const used = new Set();
    deviceConnections.forEach(conn => {
      const isCorrectDirection = isInput ? (conn.to === instanceId) : (conn.from === instanceId);
      if (!isCorrectDirection || conn.type !== connectionType) return;
      
      const port = isInput ? conn.toPort : conn.fromPort;
      if (port) used.add(port);
    });
    return used;
  };
  
  // Get connected device info for a specific port
  const getConnectedDevice = (connectionType, port, isInput) => {
    const conn = deviceConnections.find(c => {
      const isCorrectDirection = isInput ? (c.to === instanceId) : (c.from === instanceId);
      if (!isCorrectDirection || c.type !== connectionType) return false;
      
      const checkPort = isInput ? c.toPort : c.fromPort;
      return checkPort === port;
    });
    
    if (!conn) return null;
    
    const connectedId = conn.from === instanceId ? conn.to : conn.from;
    const connectedDevice = allProducts.find(p => p.instanceId === connectedId);
    const connectedPort = conn.from === instanceId ? conn.toPort : conn.fromPort;
    
    return { device: connectedDevice, port: connectedPort };
  };

  // Get connection index for highlighting
  const getConnectionIndex = (connectionType, port, isInput) => {
    return activeConnections.findIndex(conn => {
      const isCorrectDirection = isInput ? (conn.to === instanceId) : (conn.from === instanceId);
      if (!isCorrectDirection || conn.type !== connectionType) return false;
      
      const checkPort = isInput ? conn.toPort : conn.fromPort;
      return checkPort === port;
    });
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
        <div className="bg-gradient-to-r from-gray-800 to-gray-750 rounded-lg p-4 border border-gray-700">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs text-gray-400 uppercase tracking-wider">Device Label</span>
          </div>
          <div className="text-3xl font-mono font-bold text-white">
            {label || 'N/A'}
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg p-4">
          <h3 className="text-lg font-bold text-white mb-1">{productData.brand}</h3>
          <p className="text-sm text-gray-300 mb-2">{productData.model}</p>
          <Badge className="bg-blue-500/10 text-blue-400 border-blue-500/20 border">
            {productData.category}
          </Badge>
        </div>

        <div>
          <p className="text-sm text-gray-400 mb-2">{connections.description}</p>
        </div>



        {connections.inputs.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-white mb-3 flex items-center">
              <span className="w-2 h-2 rounded-full bg-green-500 mr-2"></span>
              Input Connections
            </h4>
            <div className="space-y-3">
              {connections.inputs.map((input, idx) => {
                const info = connectionTypeInfo[input.type] || connectionTypeInfo["Various"];
                const usedPorts = getUsedPorts(input.type, input.ports, true);

                return (
                  <div key={idx} className="bg-gray-800 rounded-lg p-3 border border-gray-700">
                    <div className="flex items-center justify-between mb-2">
                      <Badge className={`${info.color} border text-sm`}>
                        {input.type}
                      </Badge>
                      <span className={`text-xs font-medium ${usedPorts.size < input.ports.length ? 'text-green-400' : 'text-red-400'}`}>
                        {usedPorts.size}/{input.ports.length}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 mb-2">{info.signals}</p>
                    <div className="space-y-1 mt-2">
                      {input.ports.map((port) => {
                        const isUsed = usedPorts.has(port);
                        const connectedInfo = isUsed ? getConnectedDevice(input.type, port, true) : null;
                        const connectionIdx = isUsed ? getConnectionIndex(input.type, port, true) : -1;

                        return (
                          <div 
                            key={port}
                            className={`flex items-center justify-between p-2 rounded text-xs transition-all ${
                              isUsed 
                                ? 'bg-blue-500/10 border border-blue-500/30 hover:border-blue-500 cursor-pointer' 
                                : 'bg-gray-900/50'
                            }`}
                            onMouseEnter={() => isUsed && onHighlightConnections && onHighlightConnections([connectionIdx])}
                            onMouseLeave={() => onHighlightConnections && onHighlightConnections([])}
                          >
                            <span className={isUsed ? 'text-blue-300 font-medium' : 'text-gray-500'}>{port}</span>
                            {isUsed && connectedInfo?.device && (
                              <span className="text-gray-400 text-[10px] truncate ml-2">
                                ← {connectedInfo.device.brand} ({connectedInfo.port})
                              </span>
                            )}
                            {!isUsed && <span className="text-gray-600 text-[10px]">Available</span>}
                          </div>
                        );
                      })}
                    </div>
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
            <div className="space-y-3">
              {connections.outputs.map((output, idx) => {
                const info = connectionTypeInfo[output.type] || connectionTypeInfo["Various"];
                const usedPorts = getUsedPorts(output.type, output.ports, false);

                return (
                  <div key={idx} className="bg-gray-800 rounded-lg p-3 border border-gray-700">
                    <div className="flex items-center justify-between mb-2">
                      <Badge className={`${info.color} border text-sm`}>
                        {output.type}
                      </Badge>
                      <span className={`text-xs font-medium ${usedPorts.size < output.ports.length ? 'text-green-400' : 'text-red-400'}`}>
                        {usedPorts.size}/{output.ports.length}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 mb-2">{info.signals}</p>
                    <div className="space-y-1 mt-2">
                      {output.ports.map((port) => {
                        const isUsed = usedPorts.has(port);
                        const connectedInfo = isUsed ? getConnectedDevice(output.type, port, false) : null;
                        const connectionIdx = isUsed ? getConnectionIndex(output.type, port, false) : -1;

                        return (
                          <div 
                            key={port}
                            className={`flex items-center justify-between p-2 rounded text-xs transition-all ${
                              isUsed 
                                ? 'bg-purple-500/10 border border-purple-500/30 hover:border-purple-500 cursor-pointer' 
                                : 'bg-gray-900/50'
                            }`}
                            onMouseEnter={() => isUsed && onHighlightConnections && onHighlightConnections([connectionIdx])}
                            onMouseLeave={() => onHighlightConnections && onHighlightConnections([])}
                          >
                            <span className={isUsed ? 'text-purple-300 font-medium' : 'text-gray-500'}>{port}</span>
                            {isUsed && connectedInfo?.device && (
                              <span className="text-gray-400 text-[10px] truncate ml-2">
                                → {connectedInfo.device.brand} ({connectedInfo.port})
                              </span>
                            )}
                            {!isUsed && <span className="text-gray-600 text-[10px]">Available</span>}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {productData.specs && Object.keys(productData.specs).length > 0 && (
          <div className="border-t border-gray-800 pt-4">
            <h4 className="text-sm font-semibold text-white mb-3">Technical Specifications</h4>
            <div className="space-y-2">
              {Object.entries(productData.specs).map(([key, value]) => 
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