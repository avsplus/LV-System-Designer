import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const connectionTypes = [
  { 
    id: "hdmi", 
    name: "HDMI", 
    color: "bg-purple-500/10 text-purple-400 border-purple-500/50",
    signals: ["Video", "Audio", "Control"]
  },
  { 
    id: "optical", 
    name: "Optical/TOSLINK", 
    color: "bg-cyan-500/10 text-cyan-400 border-cyan-500/50",
    signals: ["Audio"]
  },
  { 
    id: "rca", 
    name: "RCA", 
    color: "bg-red-500/10 text-red-400 border-red-500/50",
    signals: ["Audio", "Video"]
  },
  { 
    id: "xlr", 
    name: "XLR", 
    color: "bg-green-500/10 text-green-400 border-green-500/50",
    signals: ["Audio"]
  },
  { 
    id: "speaker_wire", 
    name: "Speaker Wire", 
    color: "bg-orange-500/10 text-orange-400 border-orange-500/50",
    signals: ["Audio"]
  },
  { 
    id: "ethernet", 
    name: "Ethernet", 
    color: "bg-blue-500/10 text-blue-400 border-blue-500/50",
    signals: ["Data", "Audio", "Video"]
  },
  { 
    id: "usb", 
    name: "USB", 
    color: "bg-indigo-500/10 text-indigo-400 border-indigo-500/50",
    signals: ["Data", "Audio"]
  },
  { 
    id: "coaxial", 
    name: "Coaxial", 
    color: "bg-yellow-500/10 text-yellow-400 border-yellow-500/50",
    signals: ["Audio"]
  }
];

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
    ]
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
    ]
  },
  projector_screens: {
    inputs: [
      { type: "Control", ports: ["Trigger-1", "Trigger-2"] },
      { type: "RS232", ports: ["RS232"] }
    ],
    outputs: []
  },
  video_distribution: {
    inputs: [
      { type: "HDMI", ports: ["HDMI-1", "HDMI-2", "HDMI-3", "HDMI-4"] },
      { type: "Ethernet", ports: ["LAN"] }
    ],
    outputs: [
      { type: "HDMI", ports: ["HDMI-Out-1", "HDMI-Out-2", "HDMI-Out-3", "HDMI-Out-4", "HDMI-Out-5", "HDMI-Out-6"] },
      { type: "HDBaseT", ports: ["HDBaseT-1", "HDBaseT-2", "HDBaseT-3", "HDBaseT-4"] }
    ]
  },
  matrix_switchers: {
    inputs: [
      { type: "HDMI", ports: ["HDMI-1", "HDMI-2", "HDMI-3", "HDMI-4", "HDMI-5", "HDMI-6", "HDMI-7", "HDMI-8"] },
      { type: "Ethernet", ports: ["LAN"] },
      { type: "RS232", ports: ["RS232"] }
    ],
    outputs: [
      { type: "HDMI", ports: ["HDMI-Out-1", "HDMI-Out-2", "HDMI-Out-3", "HDMI-Out-4", "HDMI-Out-5", "HDMI-Out-6", "HDMI-Out-7", "HDMI-Out-8"] }
    ]
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
    ]
  },
  media_streamers: {
    inputs: [
      { type: "Ethernet", ports: ["LAN"] },
      { type: "USB", ports: ["USB"] }
    ],
    outputs: [
      { type: "HDMI", ports: ["HDMI-Out"] }
    ]
  },
  speakers: {
    inputs: [
      { type: "Speaker Wire", ports: ["Input"] }
    ],
    outputs: []
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
    ]
  },
  subwoofers: {
    inputs: [
      { type: "Subwoofer", ports: ["Input"] }
    ],
    outputs: []
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
    ]
  },
  multizone_amps: {
    inputs: [
      { type: "RCA", ports: ["Zone-1-L", "Zone-1-R", "Zone-2-L", "Zone-2-R", "Zone-3-L", "Zone-3-R", "Zone-4-L", "Zone-4-R"] },
      { type: "XLR", ports: ["XLR-1-L", "XLR-1-R", "XLR-2-L", "XLR-2-R"] },
      { type: "Ethernet", ports: ["LAN"] }
    ],
    outputs: [
      { type: "Speaker Wire", ports: ["Zone-1-L", "Zone-1-R", "Zone-2-L", "Zone-2-R", "Zone-3-L", "Zone-3-R", "Zone-4-L", "Zone-4-R"] }
    ]
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
    ]
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
      { type: "Speaker Wire", ports: ["Front-L", "Front-R", "Center", "Surround-L", "Surround-R", "Surround-Back-L", "Surround-Back-R", "Sub"] },
      { type: "RCA", ports: ["Zone-2-L", "Zone-2-R"] },
      { type: "Optical", ports: ["Optical-Out"] }
    ]
  }
};

const normalizeType = (type) => type.toLowerCase().replace(/\//g, ' ').replace('toslink', '').trim();

export default function ConnectionTypeDialog({ fromProduct, toProduct, onSelect, onCancel, existingConnections, pendingConnection }) {
  // Check if speaker already has a connection
  const isSpeaker = toProduct.category === 'speakers';
  const speakerHasConnection = isSpeaker && (existingConnections || []).some(
    conn => conn.to === toProduct.instanceId
  );

  const fromCategory = connectionsByCategory[fromProduct.category] || { inputs: [], outputs: [] };
  const toCategory = connectionsByCategory[toProduct.category] || { inputs: [], outputs: [] };
  
  // Find compatible connection types
  const compatibleTypes = [];
  fromCategory.outputs.forEach(output => {
    toCategory.inputs.forEach(input => {
      if (normalizeType(output.type) === normalizeType(input.type)) {
        compatibleTypes.push({
          type: output.type,
          fromPorts: output.ports,
          toPorts: input.ports
        });
      }
    });
  });

  // Use pendingConnection if available to pre-select the correct ports
  const defaultType = pendingConnection?.connectionType || compatibleTypes[0]?.type || "";
  const [selectedType, setSelectedType] = useState(defaultType);
  const [selectedFromPort, setSelectedFromPort] = useState(pendingConnection?.fromPortName || "");
  const [selectedToPort, setSelectedToPort] = useState(pendingConnection?.toPortName || "");

  // Get ports that are already used
  const getUsedPorts = (instanceId, connectionType, isInput) => {
    const used = new Set();
    (existingConnections || []).forEach(conn => {
      if (isInput) {
        if (conn.to === instanceId && conn.type === connectionType) {
          used.add(conn.toPort);
        }
      } else {
        if (conn.from === instanceId && conn.type === connectionType) {
          used.add(conn.fromPort);
        }
      }
    });
    return used;
  };

  const selectedCompatible = compatibleTypes.find(c => c.type === selectedType);
  const usedFromPorts = selectedCompatible ? getUsedPorts(fromProduct.instanceId, selectedType, false) : new Set();
  const usedToPorts = selectedCompatible ? getUsedPorts(toProduct.instanceId, selectedType, true) : new Set();
  const availableFromPorts = selectedCompatible?.fromPorts.filter(p => !usedFromPorts.has(p)) || [];
  const availableToPorts = selectedCompatible?.toPorts.filter(p => !usedToPorts.has(p)) || [];

  // Auto-select first available port when type changes
  React.useEffect(() => {
    if (availableFromPorts.length > 0) {
      setSelectedFromPort(availableFromPorts[0]);
    } else {
      setSelectedFromPort("");
    }
    if (availableToPorts.length > 0) {
      setSelectedToPort(availableToPorts[0]);
    } else {
      setSelectedToPort("");
    }
  }, [selectedType]);

  const canCreate = selectedType && selectedFromPort && selectedToPort;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onCancel}>
      <div 
        className="bg-gray-900 border border-gray-800 rounded-xl p-6 max-w-3xl w-full mx-4 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-xl font-semibold text-white mb-2">Select Connection</h3>
        <p className="text-sm text-gray-400 mb-6">
          Connect <span className="text-white font-medium">{fromProduct.brand} {fromProduct.model}</span> to <span className="text-white font-medium">{toProduct.brand} {toProduct.model}</span>
        </p>

        {speakerHasConnection ? (
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 mb-6">
            <p className="text-sm text-red-400">
              This speaker already has an active connection. Speakers can only accept one audio channel connection at a time.
            </p>
          </div>
        ) : compatibleTypes.length === 0 ? (
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 mb-6">
            <p className="text-sm text-red-400">
              No compatible connection types found between these devices.
            </p>
          </div>
        ) : (
          <>
            <div className="mb-6">
              <label className="text-sm font-medium text-white mb-2 block">Connection Type</label>
              <div className="grid grid-cols-2 gap-3">
                {compatibleTypes.map((compat) => {
                  const typeInfo = connectionTypes.find(t => normalizeType(t.name) === normalizeType(compat.type));
                  return (
                    <button
                      key={compat.type}
                      onClick={() => setSelectedType(compat.type)}
                      className={`text-left p-4 rounded-lg border-2 transition-all ${
                        selectedType === compat.type
                          ? 'border-blue-500 bg-blue-500/10'
                          : 'border-gray-700 hover:border-gray-600 bg-gray-800'
                      }`}
                    >
                      <Badge className={`${typeInfo?.color} border mb-2`}>
                        {compat.type}
                      </Badge>
                      <div className="text-xs text-gray-400">
                        {compat.fromPorts.length} outputs • {compat.toPorts.length} inputs
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {selectedType && (
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="text-sm font-medium text-white mb-2 block">Output Port</label>
                  <Select value={selectedFromPort} onValueChange={setSelectedFromPort}>
                    <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                      <SelectValue placeholder="Select output port" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableFromPorts.map(port => (
                        <SelectItem key={port} value={port}>{port}</SelectItem>
                      ))}
                      {usedFromPorts.size > 0 && (
                        <>
                          <div className="px-2 py-1.5 text-xs text-gray-500">Used ports:</div>
                          {selectedCompatible.fromPorts.filter(p => usedFromPorts.has(p)).map(port => (
                            <SelectItem key={port} value={port} disabled>
                              {port} (in use)
                            </SelectItem>
                          ))}
                        </>
                      )}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-gray-500 mt-1">
                    {fromProduct.brand} • {availableFromPorts.length} available
                  </p>
                </div>

                <div>
                  <label className="text-sm font-medium text-white mb-2 block">Input Port</label>
                  <Select value={selectedToPort} onValueChange={setSelectedToPort}>
                    <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                      <SelectValue placeholder="Select input port" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableToPorts.map(port => (
                        <SelectItem key={port} value={port}>{port}</SelectItem>
                      ))}
                      {usedToPorts.size > 0 && (
                        <>
                          <div className="px-2 py-1.5 text-xs text-gray-500">Used ports:</div>
                          {selectedCompatible.toPorts.filter(p => usedToPorts.has(p)).map(port => (
                            <SelectItem key={port} value={port} disabled>
                              {port} (in use)
                            </SelectItem>
                          ))}
                        </>
                      )}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-gray-500 mt-1">
                    {toProduct.brand} • {availableToPorts.length} available
                  </p>
                </div>
              </div>
            )}
          </>
        )}

        <div className="flex gap-3 justify-end">
          <Button variant="outline" onClick={onCancel} className="border-gray-700 text-gray-300">
            Cancel
          </Button>
          <Button 
            onClick={() => {
              onSelect({
                type: selectedType,
                fromPort: selectedFromPort,
                toPort: selectedToPort
              });
            }} 
            className="bg-blue-600 hover:bg-blue-700"
            disabled={!canCreate || speakerHasConnection}
          >
            Create Connection
          </Button>
        </div>
      </div>
    </div>
  );
}