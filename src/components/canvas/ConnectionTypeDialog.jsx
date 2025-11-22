import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

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
  speakers: { inputs: ["Speaker Wire", "XLR"], outputs: [] },
  amplifiers: { inputs: ["RCA", "XLR", "Optical", "Coaxial", "USB"], outputs: ["Speaker Wire", "RCA", "XLR"] },
  receivers: { inputs: ["HDMI", "RCA", "Optical", "Coaxial", "USB", "Ethernet", "Speaker Wire"], outputs: ["HDMI", "Speaker Wire", "RCA", "Optical"] },
  subwoofers: { inputs: ["RCA", "Speaker Wire", "XLR"], outputs: [] },
  turntables: { inputs: [], outputs: ["RCA", "USB"] },
  dacs: { inputs: ["USB", "Optical", "Coaxial", "Ethernet"], outputs: ["RCA", "XLR"] },
  streamers: { inputs: ["Ethernet", "USB"], outputs: ["RCA", "Optical", "Coaxial", "XLR"] },
  headphones: { inputs: ["3.5mm Jack", "XLR", "USB"], outputs: [] },
  processors: { inputs: ["HDMI", "RCA", "XLR", "Optical", "Ethernet"], outputs: ["HDMI", "RCA", "XLR", "Optical"] },
  cables: { inputs: ["Various"], outputs: ["Various"] },
  microphones: { inputs: [], outputs: ["XLR", "USB"] },
  mixers: { inputs: ["XLR", "RCA", "USB"], outputs: ["XLR", "RCA", "USB"] }
};

const normalizeType = (type) => type.toLowerCase().replace(/\//g, ' ').trim();

export default function ConnectionTypeDialog({ fromProduct, toProduct, onSelect, onCancel }) {
  // Get compatible connection types
  const fromCategory = connectionsByCategory[fromProduct.category] || { inputs: [], outputs: [] };
  const toCategory = connectionsByCategory[toProduct.category] || { inputs: [], outputs: [] };
  
  // Find connection types where fromProduct has it as output and toProduct has it as input
  const compatibleTypes = connectionTypes.filter(type => {
    const fromHasOutput = fromCategory.outputs.some(o => normalizeType(o) === normalizeType(type.name));
    const toHasInput = toCategory.inputs.some(i => normalizeType(i) === normalizeType(type.name));
    return fromHasOutput && toHasInput;
  });

  const [selectedType, setSelectedType] = useState(compatibleTypes[0]?.id || "");

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onCancel}>
      <div 
        className="bg-gray-900 border border-gray-800 rounded-xl p-6 max-w-2xl w-full mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-xl font-semibold text-white mb-2">Select Connection Type</h3>
        <p className="text-sm text-gray-400 mb-4">
          Choose how to connect <span className="text-white">{fromProduct.brand}</span> to <span className="text-white">{toProduct.brand}</span>
        </p>

        {compatibleTypes.length === 0 ? (
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 mb-6">
            <p className="text-sm text-red-400">
              No compatible connection types found between these devices.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 mb-6">
            {compatibleTypes.map((type) => (
            <button
              key={type.id}
              onClick={() => setSelectedType(type.id)}
              className={`text-left p-4 rounded-lg border-2 transition-all ${
                selectedType === type.id
                  ? 'border-blue-500 bg-blue-500/10'
                  : 'border-gray-700 hover:border-gray-600 bg-gray-800'
              }`}
            >
              <Badge className={`${type.color} border mb-2`}>
                {type.name}
              </Badge>
              <div className="flex flex-wrap gap-1">
                {type.signals.map(signal => (
                  <span key={signal} className="text-xs text-gray-400">
                    {signal}
                  </span>
                ))}
              </div>
            </button>
            ))}
            </div>
            )}

            <div className="flex gap-3 justify-end">
          <Button variant="outline" onClick={onCancel} className="border-gray-700 text-gray-300">
            Cancel
          </Button>
          <Button 
            onClick={() => {
              const selectedTypeObj = compatibleTypes.find(t => t.id === selectedType);
              onSelect(selectedTypeObj.name);
            }} 
            className="bg-blue-600 hover:bg-blue-700"
            disabled={compatibleTypes.length === 0}
          >
            Create Connection
          </Button>
        </div>
      </div>
    </div>
  );
}