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
    signals: ["Audio"],
    wireSpecs: ["14/2", "14/4", "16/2", "16/4", "12/2", "12/4"]
  },
  { 
    id: "ethernet", 
    name: "Ethernet", 
    color: "bg-blue-500/10 text-blue-400 border-blue-500/50",
    signals: ["Data", "Audio", "Video"],
    wireSpecs: ["Cat5e", "Cat6 UTP", "Cat6 STP", "Cat6A UTP", "Cat6A STP"]
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

// Default port definitions by product category - ports MUST be normalized objects {id, label, direction}
// to prevent React error #31 from inconsistent data types between renders
const connectionsByCategory = {
  televisions: {
    inputs: [
      { type: "HDMI", ports: [{ id: "hdmi-1", label: "HDMI-1", direction: "input" }, { id: "hdmi-2", label: "HDMI-2", direction: "input" }, { id: "hdmi-3", label: "HDMI-3", direction: "input" }, { id: "hdmi-4", label: "HDMI-4", direction: "input" }] },
      { type: "Component", ports: [{ id: "component-1", label: "Component-1", direction: "input" }] },
      { type: "Composite", ports: [{ id: "composite-1", label: "Composite-1", direction: "input" }] },
      { type: "Optical", ports: [{ id: "optical-in", label: "Optical-In", direction: "input" }] },
      { type: "Ethernet", ports: [{ id: "lan", label: "LAN", direction: "input" }] }
    ],
    outputs: [
      { type: "Optical", ports: [{ id: "optical-out", label: "Optical-Out", direction: "output" }] },
      { type: "3.5mm Jack", ports: [{ id: "headphone", label: "Headphone", direction: "output" }] }
    ]
  },
  projectors: {
    inputs: [
      { type: "HDMI", ports: [{ id: "hdmi-1", label: "HDMI-1", direction: "input" }, { id: "hdmi-2", label: "HDMI-2", direction: "input" }] },
      { type: "VGA", ports: [{ id: "vga", label: "VGA", direction: "input" }] },
      { type: "Component", ports: [{ id: "component-1", label: "Component-1", direction: "input" }] },
      { type: "Ethernet", ports: [{ id: "lan", label: "LAN", direction: "input" }] }
    ],
    outputs: [
      { type: "3.5mm Jack", ports: [{ id: "audio-out", label: "Audio-Out", direction: "output" }] }
    ]
  },
  projector_screens: {
    inputs: [
      { type: "Control", ports: [{ id: "trigger-1", label: "Trigger-1", direction: "input" }, { id: "trigger-2", label: "Trigger-2", direction: "input" }] },
      { type: "RS232", ports: [{ id: "rs232", label: "RS232", direction: "input" }] }
    ],
    outputs: []
  },
  video_distribution: {
    inputs: [
      { type: "HDMI", ports: [{ id: "hdmi-1", label: "HDMI-1", direction: "input" }, { id: "hdmi-2", label: "HDMI-2", direction: "input" }, { id: "hdmi-3", label: "HDMI-3", direction: "input" }, { id: "hdmi-4", label: "HDMI-4", direction: "input" }] },
      { type: "Ethernet", ports: [{ id: "lan", label: "LAN", direction: "input" }] }
    ],
    outputs: [
      { type: "HDMI", ports: [{ id: "hdmi-out-1", label: "HDMI-Out-1", direction: "output" }, { id: "hdmi-out-2", label: "HDMI-Out-2", direction: "output" }, { id: "hdmi-out-3", label: "HDMI-Out-3", direction: "output" }, { id: "hdmi-out-4", label: "HDMI-Out-4", direction: "output" }, { id: "hdmi-out-5", label: "HDMI-Out-5", direction: "output" }, { id: "hdmi-out-6", label: "HDMI-Out-6", direction: "output" }] },
      { type: "HDBaseT", ports: [{ id: "hdbaset-1", label: "HDBaseT-1", direction: "output" }, { id: "hdbaset-2", label: "HDBaseT-2", direction: "output" }, { id: "hdbaset-3", label: "HDBaseT-3", direction: "output" }, { id: "hdbaset-4", label: "HDBaseT-4", direction: "output" }] }
    ]
  },
  matrix_switchers: {
    inputs: [
      { type: "HDMI", ports: [{ id: "hdmi-1", label: "HDMI-1", direction: "input" }, { id: "hdmi-2", label: "HDMI-2", direction: "input" }, { id: "hdmi-3", label: "HDMI-3", direction: "input" }, { id: "hdmi-4", label: "HDMI-4", direction: "input" }, { id: "hdmi-5", label: "HDMI-5", direction: "input" }, { id: "hdmi-6", label: "HDMI-6", direction: "input" }, { id: "hdmi-7", label: "HDMI-7", direction: "input" }, { id: "hdmi-8", label: "HDMI-8", direction: "input" }] },
      { type: "Ethernet", ports: [{ id: "lan", label: "LAN", direction: "input" }] },
      { type: "RS232", ports: [{ id: "rs232", label: "RS232", direction: "input" }] }
    ],
    outputs: [
      { type: "HDMI", ports: [{ id: "hdmi-out-1", label: "HDMI-Out-1", direction: "output" }, { id: "hdmi-out-2", label: "HDMI-Out-2", direction: "output" }, { id: "hdmi-out-3", label: "HDMI-Out-3", direction: "output" }, { id: "hdmi-out-4", label: "HDMI-Out-4", direction: "output" }, { id: "hdmi-out-5", label: "HDMI-Out-5", direction: "output" }, { id: "hdmi-out-6", label: "HDMI-Out-6", direction: "output" }, { id: "hdmi-out-7", label: "HDMI-Out-7", direction: "output" }, { id: "hdmi-out-8", label: "HDMI-Out-8", direction: "output" }] }
    ]
  },
  audio_streamers: {
    inputs: [
      { type: "Ethernet", ports: [{ id: "lan", label: "LAN", direction: "input" }] },
      { type: "USB", ports: [{ id: "usb", label: "USB", direction: "input" }] },
      { type: "Optical", ports: [{ id: "optical-in", label: "Optical-In", direction: "input" }] }
    ],
    outputs: [
      { type: "RCA", ports: [{ id: "out-l", label: "Out-L", direction: "output" }, { id: "out-r", label: "Out-R", direction: "output" }] },
      { type: "Optical", ports: [{ id: "optical-out", label: "Optical-Out", direction: "output" }] },
      { type: "Coaxial", ports: [{ id: "coaxial-out", label: "Coaxial-Out", direction: "output" }] },
      { type: "XLR", ports: [{ id: "xlr-l", label: "XLR-L", direction: "output" }, { id: "xlr-r", label: "XLR-R", direction: "output" }] }
    ]
  },
  media_streamers: {
    inputs: [
      { type: "Ethernet", ports: [{ id: "lan", label: "LAN", direction: "input" }] },
      { type: "USB", ports: [{ id: "usb", label: "USB", direction: "input" }] }
    ],
    outputs: [
      { type: "HDMI", ports: [{ id: "hdmi-out", label: "HDMI-Out", direction: "output" }] }
    ]
  },
  speakers: {
    inputs: [
      { type: "Speaker Wire", ports: [{ id: "input", label: "Input", direction: "input" }] }
    ],
    outputs: []
  },
  soundbars: {
    inputs: [
      { type: "HDMI", ports: [{ id: "hdmi-1", label: "HDMI-1", direction: "input" }, { id: "hdmi-2", label: "HDMI-2", direction: "input" }] },
      { type: "Optical", ports: [{ id: "optical-in", label: "Optical-In", direction: "input" }] },
      { type: "RCA", ports: [{ id: "rca-l", label: "RCA-L", direction: "input" }, { id: "rca-r", label: "RCA-R", direction: "input" }] },
      { type: "Ethernet", ports: [{ id: "lan", label: "LAN", direction: "input" }] }
    ],
    outputs: [
      { type: "HDMI", ports: [{ id: "hdmi-out", label: "HDMI-Out", direction: "output" }] },
      { type: "Subwoofer", ports: [{ id: "sub-out", label: "Sub-Out", direction: "output" }] }
    ]
  },
  subwoofers: {
    inputs: [
      { type: "Subwoofer", ports: [{ id: "input", label: "Input", direction: "input" }] }
    ],
    outputs: []
  },
  stereo_amps: {
    inputs: [
      { type: "RCA", ports: [{ id: "rca-1", label: "RCA-1", direction: "input" }, { id: "rca-2", label: "RCA-2", direction: "input" }] },
      { type: "XLR", ports: [{ id: "xlr-l", label: "XLR-L", direction: "input" }, { id: "xlr-r", label: "XLR-R", direction: "input" }] },
      { type: "Optical", ports: [{ id: "optical-1", label: "Optical-1", direction: "input" }] },
      { type: "Coaxial", ports: [{ id: "coaxial", label: "Coaxial", direction: "input" }] }
    ],
    outputs: [
      { type: "Speaker Wire", ports: [{ id: "speaker-l", label: "Speaker-L", direction: "output" }, { id: "speaker-r", label: "Speaker-R", direction: "output" }] },
      { type: "RCA", ports: [{ id: "pre-out-l", label: "Pre-Out-L", direction: "output" }, { id: "pre-out-r", label: "Pre-Out-R", direction: "output" }] }
    ]
  },
  multizone_amps: {
    inputs: [
      { type: "RCA", ports: [{ id: "zone-1-l", label: "Zone-1-L", direction: "input" }, { id: "zone-1-r", label: "Zone-1-R", direction: "input" }, { id: "zone-2-l", label: "Zone-2-L", direction: "input" }, { id: "zone-2-r", label: "Zone-2-R", direction: "input" }, { id: "zone-3-l", label: "Zone-3-L", direction: "input" }, { id: "zone-3-r", label: "Zone-3-R", direction: "input" }, { id: "zone-4-l", label: "Zone-4-L", direction: "input" }, { id: "zone-4-r", label: "Zone-4-R", direction: "input" }] },
      { type: "XLR", ports: [{ id: "xlr-1-l", label: "XLR-1-L", direction: "input" }, { id: "xlr-1-r", label: "XLR-1-R", direction: "input" }, { id: "xlr-2-l", label: "XLR-2-L", direction: "input" }, { id: "xlr-2-r", label: "XLR-2-R", direction: "input" }] },
      { type: "Ethernet", ports: [{ id: "lan", label: "LAN", direction: "input" }] }
    ],
    outputs: [
      { type: "Speaker Wire", ports: [{ id: "zone-1-l", label: "Zone-1-L", direction: "output" }, { id: "zone-1-r", label: "Zone-1-R", direction: "output" }, { id: "zone-2-l", label: "Zone-2-L", direction: "output" }, { id: "zone-2-r", label: "Zone-2-R", direction: "output" }, { id: "zone-3-l", label: "Zone-3-L", direction: "output" }, { id: "zone-3-r", label: "Zone-3-R", direction: "output" }, { id: "zone-4-l", label: "Zone-4-L", direction: "output" }, { id: "zone-4-r", label: "Zone-4-R", direction: "output" }] }
    ]
  },
  surround_processors: {
    inputs: [
      { type: "HDMI", ports: [{ id: "hdmi-1", label: "HDMI-1", direction: "input" }, { id: "hdmi-2", label: "HDMI-2", direction: "input" }, { id: "hdmi-3", label: "HDMI-3", direction: "input" }, { id: "hdmi-4", label: "HDMI-4", direction: "input" }, { id: "hdmi-5", label: "HDMI-5", direction: "input" }, { id: "hdmi-6", label: "HDMI-6", direction: "input" }, { id: "hdmi-7", label: "HDMI-7", direction: "input" }] },
      { type: "RCA", ports: [{ id: "rca-1", label: "RCA-1", direction: "input" }, { id: "rca-2", label: "RCA-2", direction: "input" }] },
      { type: "XLR", ports: [{ id: "xlr-l", label: "XLR-L", direction: "input" }, { id: "xlr-r", label: "XLR-R", direction: "input" }] },
      { type: "Optical", ports: [{ id: "optical-1", label: "Optical-1", direction: "input" }, { id: "optical-2", label: "Optical-2", direction: "input" }] },
      { type: "Coaxial", ports: [{ id: "coaxial-1", label: "Coaxial-1", direction: "input" }] },
      { type: "Ethernet", ports: [{ id: "lan", label: "LAN", direction: "input" }] }
    ],
    outputs: [
      { type: "HDMI", ports: [{ id: "hdmi-out-1", label: "HDMI-Out-1", direction: "output" }, { id: "hdmi-out-2", label: "HDMI-Out-2", direction: "output" }] },
      { type: "RCA", ports: [{ id: "fl", label: "FL", direction: "output" }, { id: "fr", label: "FR", direction: "output" }, { id: "c", label: "C", direction: "output" }, { id: "sl", label: "SL", direction: "output" }, { id: "sr", label: "SR", direction: "output" }, { id: "sbl", label: "SBL", direction: "output" }, { id: "sbr", label: "SBR", direction: "output" }, { id: "sub", label: "Sub", direction: "output" }] },
      { type: "XLR", ports: [{ id: "xlr-fl", label: "XLR-FL", direction: "output" }, { id: "xlr-fr", label: "XLR-FR", direction: "output" }, { id: "xlr-c", label: "XLR-C", direction: "output" }, { id: "xlr-sl", label: "XLR-SL", direction: "output" }, { id: "xlr-sr", label: "XLR-SR", direction: "output" }, { id: "xlr-sub", label: "XLR-Sub", direction: "output" }] }
    ]
  },
  av_receivers: {
    inputs: [
      { type: "HDMI", ports: [{ id: "hdmi-1", label: "HDMI-1", direction: "input" }, { id: "hdmi-2", label: "HDMI-2", direction: "input" }, { id: "hdmi-3", label: "HDMI-3", direction: "input" }, { id: "hdmi-4", label: "HDMI-4", direction: "input" }, { id: "hdmi-5", label: "HDMI-5", direction: "input" }, { id: "hdmi-6", label: "HDMI-6", direction: "input" }, { id: "hdmi-7", label: "HDMI-7", direction: "input" }] },
      { type: "RCA", ports: [{ id: "cd", label: "CD", direction: "input" }, { id: "phono", label: "Phono", direction: "input" }, { id: "aux-1", label: "AUX-1", direction: "input" }, { id: "aux-2", label: "AUX-2", direction: "input" }] },
      { type: "Optical", ports: [{ id: "optical-1", label: "Optical-1", direction: "input" }, { id: "optical-2", label: "Optical-2", direction: "input" }] },
      { type: "Coaxial", ports: [{ id: "coaxial", label: "Coaxial", direction: "input" }] },
      { type: "USB", ports: [{ id: "usb-a", label: "USB-A", direction: "input" }, { id: "usb-b", label: "USB-B", direction: "input" }] },
      { type: "Ethernet", ports: [{ id: "lan", label: "LAN", direction: "input" }] }
    ],
    outputs: [
      { type: "HDMI", ports: [{ id: "hdmi-out-1", label: "HDMI-Out-1", direction: "output" }, { id: "hdmi-out-2", label: "HDMI-Out-2", direction: "output" }] },
      { type: "Speaker Wire", ports: [{ id: "front-l", label: "Front-L", direction: "output" }, { id: "front-r", label: "Front-R", direction: "output" }, { id: "center", label: "Center", direction: "output" }, { id: "surround-l", label: "Surround-L", direction: "output" }, { id: "surround-r", label: "Surround-R", direction: "output" }, { id: "surround-back-l", label: "Surround-Back-L", direction: "output" }, { id: "surround-back-r", label: "Surround-Back-R", direction: "output" }, { id: "sub", label: "Sub", direction: "output" }] },
      { type: "RCA", ports: [{ id: "zone-2-l", label: "Zone-2-L", direction: "output" }, { id: "zone-2-r", label: "Zone-2-R", direction: "output" }] },
      { type: "Optical", ports: [{ id: "optical-out", label: "Optical-Out", direction: "output" }] }
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

  // Use database connections if available, otherwise use category defaults
  const fromDefaults = connectionsByCategory[fromProduct.category] || { inputs: [], outputs: [] };
  const toDefaults = connectionsByCategory[toProduct.category] || { inputs: [], outputs: [] };

  const fromHasDb = fromProduct.output_connections && fromProduct.output_connections.length > 0;
  const toHasDb = toProduct.input_connections && toProduct.input_connections.length > 0;

  // Normalize database ports to objects {id, label, direction}
  // Ensures consistent data structure regardless of source (database vs. defaults)
  const normalizeDbPorts = (connections, direction) => {
    return (connections || []).map(conn => ({
      type: conn.type,
      ports: (conn.ports || []).map(p => typeof p === 'string' ? { id: p, label: p, direction } : p)
    }));
  };

  const fromOutputs = fromHasDb 
    ? normalizeDbPorts(fromProduct.output_connections, 'output')
    : fromDefaults.outputs;
  const toInputs = toHasDb 
    ? normalizeDbPorts(toProduct.input_connections, 'input')
    : toDefaults.inputs;

  // Find compatible connection types
  const compatibleTypes = [];
  fromOutputs.forEach(output => {
    toInputs.forEach(input => {
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
  const [selectedWireSpec, setSelectedWireSpec] = useState("");

  // Get wire specs for selected type
  const getWireSpecs = (type) => {
    const normalizedType = normalizeType(type);
    const typeInfo = connectionTypes.find(t => normalizeType(t.name) === normalizedType);
    return typeInfo?.wireSpecs || [];
  };

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
  // Filter ports - handle both object and string formats for backward compatibility
  const normalizePortName = (p) => typeof p === 'string' ? p : p.label;
  const availableFromPorts = selectedCompatible?.fromPorts.filter(p => !usedFromPorts.has(normalizePortName(p))) || [];
  const availableToPorts = selectedCompatible?.toPorts.filter(p => !usedToPorts.has(normalizePortName(p))) || [];

  // Auto-select first available port and wire spec when type changes
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
    // Set default wire spec if available
    const specs = getWireSpecs(selectedType);
    if (specs.length > 0) {
      setSelectedWireSpec(specs[0]);
    } else {
      setSelectedWireSpec("");
    }
  }, [selectedType]);

  // Validation checks
  const canCreate = selectedType && selectedFromPort && selectedToPort;
  
  const validationWarnings = [];
  if (selectedType === 'HDMI' && availableFromPorts.length === 0 && availableToPorts.length === 0) {
    validationWarnings.push("All HDMI ports are in use on both devices");
  }
  if (selectedType === 'Ethernet') {
    const fromNetworkInfo = fromProduct?.networkInfo || { sw: '', port: '', ip: '000.000.000.000', mac: '00:00:00:00:00:00' };
    const toNetworkInfo = toProduct?.networkInfo || { sw: '', port: '', ip: '000.000.000.000', mac: '00:00:00:00:00:00' };
    const fromIp = fromNetworkInfo.ip;
    const toIp = toNetworkInfo.ip;

    if (!fromIp || fromIp === '000.000.000.000' || fromIp === '') {
      validationWarnings.push(`${fromProduct.brand} needs network configuration`);
    }
    if (!toIp || toIp === '000.000.000.000' || toIp === '') {
      validationWarnings.push(`${toProduct.brand} needs network configuration`);
    }
  }

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
              <>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="text-sm font-medium text-white mb-2 block">Output Port</label>
                    <Select value={selectedFromPort} onValueChange={setSelectedFromPort}>
                      <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                        <SelectValue placeholder="Select output port" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableFromPorts.map(port => {
                            const portLabel = typeof port === 'string' ? port : port.label;
                            const portValue = typeof port === 'string' ? port : port.label;
                            return <SelectItem key={portValue} value={portValue}>{portLabel}</SelectItem>;
                          })}
                        {usedFromPorts.size > 0 && (
                          <>
                            <div className="px-2 py-1.5 text-xs text-gray-500">Used ports:</div>
                            {selectedCompatible.fromPorts.filter(p => usedFromPorts.has(normalizePortName(p))).map(port => {
                              const portLabel = typeof port === 'string' ? port : port.label;
                              const portValue = typeof port === 'string' ? port : port.label;
                              return <SelectItem key={portValue} value={portValue} disabled>{portLabel} (in use)</SelectItem>;
                            })}
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
                        {availableToPorts.map(port => {
                          const portLabel = typeof port === 'string' ? port : port.label;
                          const portValue = typeof port === 'string' ? port : port.label;
                          return <SelectItem key={portValue} value={portValue}>{portLabel}</SelectItem>;
                        })}
                        {usedToPorts.size > 0 && (
                          <>
                            <div className="px-2 py-1.5 text-xs text-gray-500">Used ports:</div>
                            {selectedCompatible.toPorts.filter(p => usedToPorts.has(normalizePortName(p))).map(port => {
                              const portLabel = typeof port === 'string' ? port : port.label;
                              const portValue = typeof port === 'string' ? port : port.label;
                              return <SelectItem key={portValue} value={portValue} disabled>{portLabel} (in use)</SelectItem>;
                            })}
                          </>
                        )}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-gray-500 mt-1">
                      {toProduct.brand} • {availableToPorts.length} available
                    </p>
                  </div>
                </div>

                {getWireSpecs(selectedType).length > 0 && (
                  <div className="mb-6">
                    <label className="text-sm font-medium text-white mb-2 block">Wire Specification</label>
                    <Select value={selectedWireSpec} onValueChange={setSelectedWireSpec}>
                      <SelectTrigger className="bg-gray-800 border-gray-700 text-white w-full">
                        <SelectValue placeholder="Select wire specification" />
                      </SelectTrigger>
                      <SelectContent>
                        {getWireSpecs(selectedType).map(spec => (
                          <SelectItem key={spec} value={spec}>{spec}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-gray-500 mt-1">
                      {normalizeType(selectedType) === 'ethernet' 
                        ? 'UTP = Unshielded, STP = Shielded' 
                        : 'Gauge / Conductors'}
                    </p>
                  </div>
                )}
              </>
            )}
          </>
        )}

        {validationWarnings.length > 0 && canCreate && (
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4 mb-6">
            <p className="text-xs font-medium text-amber-400 mb-2">⚠️ Warnings:</p>
            <ul className="text-xs text-amber-300 space-y-1">
              {validationWarnings.map((warning, idx) => (
                <li key={idx}>• {warning}</li>
              ))}
            </ul>
          </div>
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
                toPort: selectedToPort,
                wireSpec: selectedWireSpec || null
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