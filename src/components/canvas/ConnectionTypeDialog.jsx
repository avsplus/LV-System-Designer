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

export default function ConnectionTypeDialog({ fromProduct, toProduct, onSelect, onCancel }) {
  const [selectedType, setSelectedType] = useState("hdmi");

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

        <div className="grid grid-cols-2 gap-3 mb-6">
          {connectionTypes.map((type) => (
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

        <div className="flex gap-3 justify-end">
          <Button variant="outline" onClick={onCancel} className="border-gray-700 text-gray-300">
            Cancel
          </Button>
          <Button onClick={() => onSelect(selectedType)} className="bg-blue-600 hover:bg-blue-700">
            Create Connection
          </Button>
        </div>
      </div>
    </div>
  );
}