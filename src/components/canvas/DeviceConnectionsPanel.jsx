import React from 'react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";

const connectionsByCategory = {
  speakers: {
    inputs: ["Speaker Wire", "XLR"],
    outputs: [],
    description: "Audio output device"
  },
  amplifiers: {
    inputs: ["RCA", "XLR", "Optical", "Coaxial", "USB"],
    outputs: ["Speaker Wire", "RCA", "XLR"],
    description: "Power amplification for speakers"
  },
  receivers: {
    inputs: ["HDMI", "RCA", "Optical", "Coaxial", "USB", "Ethernet"],
    outputs: ["HDMI", "Speaker Wire", "RCA", "Optical"],
    description: "Central hub for audio/video"
  },
  subwoofers: {
    inputs: ["RCA", "Speaker Wire", "XLR"],
    outputs: [],
    description: "Low-frequency audio output"
  },
  turntables: {
    inputs: [],
    outputs: ["RCA", "USB"],
    description: "Analog audio source"
  },
  dacs: {
    inputs: ["USB", "Optical", "Coaxial", "Ethernet"],
    outputs: ["RCA", "XLR"],
    description: "Digital to analog conversion"
  },
  streamers: {
    inputs: ["Ethernet", "USB"],
    outputs: ["RCA", "Optical", "Coaxial", "XLR"],
    description: "Network audio streaming"
  },
  headphones: {
    inputs: ["3.5mm Jack", "XLR", "USB"],
    outputs: [],
    description: "Personal audio output"
  },
  processors: {
    inputs: ["HDMI", "RCA", "XLR", "Optical", "Ethernet"],
    outputs: ["HDMI", "RCA", "XLR", "Optical"],
    description: "Audio/video signal processing"
  },
  cables: {
    inputs: ["Various"],
    outputs: ["Various"],
    description: "Signal transmission"
  },
  microphones: {
    inputs: [],
    outputs: ["XLR", "USB"],
    description: "Audio input device"
  },
  mixers: {
    inputs: ["XLR", "RCA", "USB"],
    outputs: ["XLR", "RCA", "USB"],
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

export default function DeviceConnectionsPanel({ product, onClose }) {
  const connections = connectionsByCategory[product.category] || { inputs: [], outputs: [], description: "" };

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

        {connections.inputs.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-white mb-3 flex items-center">
              <span className="w-2 h-2 rounded-full bg-green-500 mr-2"></span>
              Input Connections
            </h4>
            <div className="space-y-2">
              {connections.inputs.map((input, idx) => {
                const info = connectionTypeInfo[input] || connectionTypeInfo["Various"];
                return (
                  <div key={idx} className="bg-gray-800 rounded-lg p-3 border border-gray-700">
                    <div className="flex items-center justify-between mb-1">
                      <Badge className={`${info.color} border text-sm`}>
                        {input}
                      </Badge>
                    </div>
                    <p className="text-xs text-gray-400">{info.signals}</p>
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
                const info = connectionTypeInfo[output] || connectionTypeInfo["Various"];
                return (
                  <div key={idx} className="bg-gray-800 rounded-lg p-3 border border-gray-700">
                    <div className="flex items-center justify-between mb-1">
                      <Badge className={`${info.color} border text-sm`}>
                        {output}
                      </Badge>
                    </div>
                    <p className="text-xs text-gray-400">{info.signals}</p>
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