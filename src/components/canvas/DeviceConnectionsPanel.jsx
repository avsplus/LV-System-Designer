import React from 'react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { X } from "lucide-react";

const connectionsByCategory = {
  televisions: {
    inputs: [
      { type: "HDMI", ports: ["HDMI-1", "HDMI-2", "HDMI-3", "HDMI-4"] },
      { type: "Component", ports: ["Component-1"] },
      { type: "Composite", ports: ["Composite-1"] },
      { type: "Optical", ports: ["Optical-In"] },
      { type: "Ethernet", ports: ["LAN"] }
    ],
    outputs: [
      { type: "Optical", ports: ["Optical-Out"] },
      { type: "3.5mm Jack", ports: ["Headphone"] }
    ],
    description: "Video display device"
  },
  projectors: {
    inputs: [
      { type: "HDMI", ports: ["HDMI-1", "HDMI-2"] },
      { type: "VGA", ports: ["VGA"] },
      { type: "Component", ports: ["Component-1"] },
      { type: "Ethernet", ports: ["LAN"] }
    ],
    outputs: [
      { type: "3.5mm Jack", ports: ["Audio-Out"] }
    ],
    description: "Video projection device"
  },
  projector_screens: {
    inputs: [
      { type: "Control", ports: ["Trigger-1", "Trigger-2"] },
      { type: "RS232", ports: ["RS232"] }
    ],
    outputs: [],
    description: "Motorized projection screen"
  },
  video_distribution: {
    inputs: [
      { type: "HDMI", ports: ["HDMI-1", "HDMI-2", "HDMI-3", "HDMI-4"] },
      { type: "Ethernet", ports: ["LAN"] }
    ],
    outputs: [
      { type: "HDMI", ports: ["HDMI-Out-1", "HDMI-Out-2", "HDMI-Out-3", "HDMI-Out-4", "HDMI-Out-5", "HDMI-Out-6"] },
      { type: "HDBaseT", ports: ["HDBaseT-1", "HDBaseT-2", "HDBaseT-3", "HDBaseT-4"] }
    ],
    description: "Video signal distribution"
  },
  matrix_switchers: {
    inputs: [
      { type: "HDMI", ports: ["HDMI-1", "HDMI-2", "HDMI-3", "HDMI-4", "HDMI-5", "HDMI-6", "HDMI-7", "HDMI-8"] },
      { type: "Ethernet", ports: ["LAN"] },
      { type: "RS232", ports: ["RS232"] }
    ],
    outputs: [
      { type: "HDMI", ports: ["HDMI-Out-1", "HDMI-Out-2", "HDMI-Out-3", "HDMI-Out-4", "HDMI-Out-5", "HDMI-Out-6", "HDMI-Out-7", "HDMI-Out-8"] }
    ],
    description: "Video matrix switching"
  },
  audio_streamers: {
    inputs: [
      { type: "Ethernet", ports: ["LAN"] },
      { type: "USB", ports: ["USB"] },
      { type: "Optical", ports: ["Optical-In"] }
    ],
    outputs: [
      { type: "RCA", ports: ["Out-L", "Out-R"] },
      { type: "Optical", ports: ["Optical-Out"] },
      { type: "Coaxial", ports: ["Coaxial-Out"] },
      { type: "XLR", ports: ["XLR-L", "XLR-R"] }
    ],
    description: "Network audio streaming"
  },
  media_streamers: {
    inputs: [
      { type: "Ethernet", ports: ["LAN"] },
      { type: "USB", ports: ["USB"] }
    ],
    outputs: [
      { type: "HDMI", ports: ["HDMI-Out"] },
      { type: "Optical", ports: ["Optical-Out"] }
    ],
    description: "Media streaming device"
  },
  speakers: {
    inputs: [
      { type: "Speaker Wire", ports: ["Input"] }
    ],
    outputs: [],
    description: "Audio output device"
  },
  soundbars: {
    inputs: [
      { type: "HDMI", ports: ["HDMI-1", "HDMI-2"] },
      { type: "Optical", ports: ["Optical-In"] },
      { type: "RCA", ports: ["RCA-L", "RCA-R"] },
      { type: "Ethernet", ports: ["LAN"] }
    ],
    outputs: [
      { type: "HDMI", ports: ["HDMI-Out"] },
      { type: "Subwoofer", ports: ["Sub-Out"] }
    ],
    description: "All-in-one speaker system"
  },
  subwoofers: {
    inputs: [
      { type: "Subwoofer", ports: ["Input"] }
    ],
    outputs: [],
    description: "Low-frequency audio output"
  },
  stereo_amps: {
    inputs: [
      { type: "RCA", ports: ["RCA-1", "RCA-2"] },
      { type: "XLR", ports: ["XLR-L", "XLR-R"] },
      { type: "Optical", ports: ["Optical-1"] },
      { type: "Coaxial", ports: ["Coaxial"] }
    ],
    outputs: [
      { type: "Speaker Wire", ports: ["Speaker-L", "Speaker-R"] },
      { type: "RCA", ports: ["Pre-Out-L", "Pre-Out-R"] }
    ],
    description: "Stereo amplification"
  },
  multizone_amps: {
    inputs: [
      { type: "RCA", ports: ["Zone-1-L", "Zone-1-R", "Zone-2-L", "Zone-2-R", "Zone-3-L", "Zone-3-R", "Zone-4-L", "Zone-4-R"] },
      { type: "XLR", ports: ["XLR-1-L", "XLR-1-R", "XLR-2-L", "XLR-2-R"] },
      { type: "Ethernet", ports: ["LAN"] }
    ],
    outputs: [
      { type: "Speaker Wire", ports: ["Zone-1-L", "Zone-1-R", "Zone-2-L", "Zone-2-R", "Zone-3-L", "Zone-3-R", "Zone-4-L", "Zone-4-R"] }
    ],
    description: "Multi-zone power amplification"
  },
  surround_processors: {
    inputs: [
      { type: "HDMI", ports: ["HDMI-1", "HDMI-2", "HDMI-3", "HDMI-4", "HDMI-5", "HDMI-6", "HDMI-7"] },
      { type: "RCA", ports: ["RCA-1", "RCA-2"] },
      { type: "XLR", ports: ["XLR-L", "XLR-R"] },
      { type: "Optical", ports: ["Optical-1", "Optical-2"] },
      { type: "Coaxial", ports: ["Coaxial-1"] },
      { type: "Ethernet", ports: ["LAN"] }
    ],
    outputs: [
      { type: "HDMI", ports: ["HDMI-Out-1", "HDMI-Out-2"] },
      { type: "RCA", ports: ["FL", "FR", "C", "SL", "SR", "SBL", "SBR", "Sub"] },
      { type: "XLR", ports: ["XLR-FL", "XLR-FR", "XLR-C", "XLR-SL", "XLR-SR", "XLR-Sub"] }
    ],
    description: "Surround sound processing"
  },
  av_receivers: {
    inputs: [
      { type: "HDMI", ports: ["HDMI-1", "HDMI-2", "HDMI-3", "HDMI-4", "HDMI-5", "HDMI-6", "HDMI-7"] },
      { type: "RCA", ports: ["CD", "Phono", "AUX-1", "AUX-2"] },
      { type: "Optical", ports: ["Optical-1", "Optical-2"] },
      { type: "Coaxial", ports: ["Coaxial"] },
      { type: "USB", ports: ["USB-A", "USB-B"] },
      { type: "Ethernet", ports: ["LAN"] }
    ],
    outputs: [
      { type: "HDMI", ports: ["HDMI-Out-1", "HDMI-Out-2"] },
      { type: "Speaker Wire", ports: ["Front-L", "Front-R", "Center", "Surround-L", "Surround-R", "Surround-Back-L", "Surround-Back-R", "Sub-1", "Sub-2"] },
      { type: "RCA", ports: ["Zone-2-L", "Zone-2-R"] },
      { type: "Optical", ports: ["Optical-Out"] }
    ],
    description: "Central hub for audio/video"
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

export default function DeviceConnectionsPanel({ product, label, networkInfo, activeConnections, allProducts, onClose, onHighlightConnections, onNetworkInfoChange }) {
  const [localNetworkInfo, setLocalNetworkInfo] = React.useState(networkInfo || { sw: '', port: '', ip: '', mac: '' });
  
  React.useEffect(() => {
    setLocalNetworkInfo(networkInfo || { sw: '', port: '', ip: '', mac: '' });
  }, [product.instanceId, networkInfo]);
  
  const instanceId = product.instanceId;
  const productData = product.product || product;
  
  // Use real connection data if available, otherwise fall back to category defaults
  const defaultConnections = connectionsByCategory[productData.category] || { inputs: [], outputs: [], description: "" };
  
  // ALWAYS use the exact same connection data that CanvasProduct uses (merged with defaults)
  const mergeConnections = (enriched, defaults) => {
    if (!enriched) return defaults;
    
    // Create a map of connection types from enriched data
    const enrichedTypes = new Set();
    enriched.forEach(conn => enrichedTypes.add(conn.type));
    
    // Add default connections for types not found in enriched data
    const merged = [...enriched];
    defaults.forEach(defaultConn => {
      if (!enrichedTypes.has(defaultConn.type)) {
        merged.push(defaultConn);
      }
    });
    
    return merged;
  };
  
  const hasRealConnections = productData.connections && 
    ((productData.connections.inputs && productData.connections.inputs.length > 0) || 
     (productData.connections.outputs && productData.connections.outputs.length > 0));
  
  const connections = hasRealConnections
    ? {
        inputs: mergeConnections(productData.connections.inputs, defaultConnections.inputs),
        outputs: mergeConnections(productData.connections.outputs, defaultConnections.outputs),
        description: defaultConnections.description
      }
    : defaultConnections;
  
  // Force empty outputs for endpoint devices
  if (['speakers', 'subwoofers', 'projector_screens'].includes(productData.category)) {
    connections.outputs = [];
  }
  
  // Get connections for this device instance
  const deviceConnections = activeConnections.filter(
    conn => conn.from === instanceId || conn.to === instanceId
  );
  
  // DEBUG: Log connection data
  console.log('=== DeviceConnectionsPanel Debug ===');
  console.log('Instance ID:', instanceId);
  console.log('Product:', productData.brand, productData.model);
  console.log('All connections:', activeConnections);
  console.log('Device connections:', deviceConnections);
  console.log('Connection definitions:', connections);
  
  // Get used ports for a connection type
  const getUsedPorts = (connectionType, ports, isInput) => {
    const used = new Set();
    deviceConnections.forEach(conn => {
      const isCorrectDirection = isInput ? (conn.to === instanceId) : (conn.from === instanceId);
      if (!isCorrectDirection || conn.type !== connectionType) return;

      const port = isInput ? conn.toPort : conn.fromPort;
      console.log('Checking port:', port, 'in', ports, 'includes:', ports.includes(port));
      if (port && ports.includes(port)) used.add(port);
    });
    console.log(`Used ports for ${connectionType} (${isInput ? 'input' : 'output'}):`, used);
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

    return { device: connectedDevice, port: connectedPort, conn };
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
  
  // Get all connections for a connection type
  const getTypeConnections = (connectionType, isInput) => {
    return deviceConnections.filter(conn => {
      const isCorrectDirection = isInput ? (conn.to === instanceId) : (conn.from === instanceId);
      return isCorrectDirection && conn.type === connectionType;
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
          <div className="flex items-center gap-2">
            <div className={`w-5 h-5 rounded ${
              {
                televisions: "bg-blue-600",
                projectors: "bg-purple-600",
                projector_screens: "bg-fuchsia-600",
                video_distribution: "bg-cyan-500",
                matrix_switchers: "bg-teal-600",
                audio_streamers: "bg-pink-500",
                media_streamers: "bg-rose-600",
                speakers: "bg-green-600",
                soundbars: "bg-lime-500",
                subwoofers: "bg-red-600",
                stereo_amps: "bg-orange-600",
                multizone_amps: "bg-amber-600",
                surround_processors: "bg-yellow-400",
                av_receivers: "bg-emerald-600"
              }[productData.category]
            }`}></div>
            <span className="text-sm text-gray-300 capitalize">{productData.category.replace(/_/g, ' ')}</span>
          </div>
        </div>

        <div>
          <p className="text-sm text-gray-400 mb-2">{connections.description}</p>
        </div>

        {(connections.inputs.some(input => input.type === "Ethernet") || connections.outputs.some(output => output.type === "Ethernet")) && (
          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
            <h4 className="text-sm font-semibold text-white mb-3">Network Information</h4>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-400 mb-1 block">SW#</label>
                <Input
                  value={localNetworkInfo.sw}
                  onChange={(e) => setLocalNetworkInfo({ ...localNetworkInfo, sw: e.target.value })}
                  onBlur={() => onNetworkInfoChange && onNetworkInfoChange(localNetworkInfo)}
                  placeholder={networkInfo?.sw || "00"}
                  className="bg-gray-900 border-gray-700 text-white text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Port</label>
                <Input
                  value={localNetworkInfo.port}
                  onChange={(e) => setLocalNetworkInfo({ ...localNetworkInfo, port: e.target.value })}
                  onBlur={() => onNetworkInfoChange && onNetworkInfoChange(localNetworkInfo)}
                  placeholder={networkInfo?.port || "00"}
                  className="bg-gray-900 border-gray-700 text-white text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">IP Address</label>
                <Input
                  value={localNetworkInfo.ip}
                  onChange={(e) => setLocalNetworkInfo({ ...localNetworkInfo, ip: e.target.value })}
                  onBlur={() => onNetworkInfoChange && onNetworkInfoChange(localNetworkInfo)}
                  placeholder={networkInfo?.ip || "000.000.000.000"}
                  className="bg-gray-900 border-gray-700 text-white text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">MAC Address</label>
                <Input
                  value={localNetworkInfo.mac}
                  onChange={(e) => setLocalNetworkInfo({ ...localNetworkInfo, mac: e.target.value })}
                  onBlur={() => onNetworkInfoChange && onNetworkInfoChange(localNetworkInfo)}
                  placeholder={networkInfo?.mac || "00:00:00:00:00:00"}
                  className="bg-gray-900 border-gray-700 text-white text-sm"
                />
              </div>
            </div>
          </div>
        )}



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
                        const connectionIdx = connectedInfo?.conn ? activeConnections.indexOf(connectedInfo.conn) : -1;

                        return (
                          <div 
                            key={port}
                            className={`flex items-center justify-between p-2 rounded text-xs transition-all ${
                              isUsed 
                                ? 'bg-blue-500/10 border border-blue-500/30 hover:border-blue-500 cursor-pointer' 
                                : 'bg-gray-900/50'
                            }`}
                            onMouseEnter={() => isUsed && connectionIdx !== -1 && onHighlightConnections && onHighlightConnections([connectionIdx])}
                            onMouseLeave={() => onHighlightConnections && onHighlightConnections([])}
                          >
                            <span className={isUsed ? 'text-blue-300 font-medium' : 'text-gray-500'}>{port}</span>
                            {isUsed && connectedInfo?.device && (
                              <span className="text-gray-400 text-[10px] truncate ml-2">
                                ← {connectedInfo.device.label || connectedInfo.device.brand} ({connectedInfo.port})
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
            
            {/* DEBUG INFO */}
            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded p-2 mb-3 text-xs">
              <div className="text-yellow-400 font-bold mb-1">DEBUG:</div>
              <div className="text-yellow-300">Device Connections: {deviceConnections.length}</div>
              {deviceConnections.map((conn, i) => (
                <div key={i} className="text-yellow-200 text-[10px] mt-1">
                  {i + 1}. {conn.type}: {conn.fromPort} → {conn.toPort} | From={conn.from.slice(-4)} To={conn.to.slice(-4)}
                </div>
              ))}
              <div className="text-yellow-300 mt-2">Instance ID: {instanceId.slice(-4)}</div>
              <div className="text-yellow-300 mt-1">Outputs Defined:</div>
              {connections.outputs.map((out, i) => (
                <div key={i} className="text-yellow-200 text-[10px]">
                  {out.type}: [{out.ports.join(', ')}]
                </div>
              ))}
            </div>
            
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
                        const connectionIdx = connectedInfo?.conn ? activeConnections.indexOf(connectedInfo.conn) : -1;

                        return (
                          <div 
                            key={port}
                            className={`flex items-center justify-between p-2 rounded text-xs transition-all ${
                              isUsed 
                                ? 'bg-purple-500/10 border border-purple-500/30 hover:border-purple-500 cursor-pointer' 
                                : 'bg-gray-900/50'
                            }`}
                            onMouseEnter={() => isUsed && connectionIdx !== -1 && onHighlightConnections && onHighlightConnections([connectionIdx])}
                            onMouseLeave={() => onHighlightConnections && onHighlightConnections([])}
                          >
                            <span className={isUsed ? 'text-purple-300 font-medium' : 'text-gray-500'}>{port}</span>
                            {isUsed && connectedInfo?.device && (
                              <span className="text-gray-400 text-[10px] truncate ml-2">
                                → {connectedInfo.device.label || connectedInfo.device.brand} ({connectedInfo.port})
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