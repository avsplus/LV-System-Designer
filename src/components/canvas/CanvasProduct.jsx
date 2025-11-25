import React, { useState, useRef } from 'react';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { X, Link2 } from "lucide-react";

const connectionsByCategory = {
  televisions: {
    inputs: [
      { type: "Power", ports: ["AC"] },
      { type: "HDMI", ports: ["HDMI-1", "HDMI-2", "HDMI-3", "HDMI-4"] },
      { type: "Component", ports: ["Component-1"] },
      { type: "Composite", ports: ["Composite-1"] },
      { type: "Optical", ports: ["Optical-In"] },
      { type: "Ethernet", ports: ["LAN"] },
      { type: "IR", ports: ["IR-In"] }
    ],
    outputs: [
      { type: "Optical", ports: ["Optical-Out"] },
      { type: "3.5mm Jack", ports: ["Headphone"] }
    ]
  },
  projectors: {
    inputs: [
      { type: "Power", ports: ["AC"] },
      { type: "HDMI", ports: ["HDMI-1", "HDMI-2"] },
      { type: "VGA", ports: ["VGA"] },
      { type: "Component", ports: ["Component-1"] },
      { type: "Ethernet", ports: ["LAN"] },
      { type: "IR", ports: ["IR-In"] },
      { type: "RS232", ports: ["RS232"] }
    ],
    outputs: [
      { type: "3.5mm Jack", ports: ["Audio-Out"] }
    ]
  },
  projector_screens: {
    inputs: [
      { type: "Power", ports: ["AC"] },
      { type: "Control", ports: ["Trigger-1", "Trigger-2"] },
      { type: "RS232", ports: ["RS232"] }
    ],
    outputs: []
  },
  video_distribution: {
    inputs: [
      { type: "Power", ports: ["AC"] },
      { type: "HDMI", ports: ["HDMI-1", "HDMI-2", "HDMI-3", "HDMI-4"] },
      { type: "Ethernet", ports: ["LAN"] },
      { type: "IR", ports: ["IR-In"] },
      { type: "RS232", ports: ["RS232"] }
    ],
    outputs: [
      { type: "HDMI", ports: ["HDMI-Out-1", "HDMI-Out-2", "HDMI-Out-3", "HDMI-Out-4", "HDMI-Out-5", "HDMI-Out-6"] },
      { type: "HDBaseT", ports: ["HDBaseT-1", "HDBaseT-2", "HDBaseT-3", "HDBaseT-4"] }
    ]
  },
  matrix_switchers: {
    inputs: [
      { type: "Power", ports: ["AC"] },
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
      { type: "Power", ports: ["AC"] },
      { type: "Ethernet", ports: ["LAN"] },
      { type: "USB", ports: ["USB"] },
      { type: "Optical", ports: ["Optical-In"] },
      { type: "IR", ports: ["IR-In"] }
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
      { type: "Power", ports: ["AC"] },
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
      { type: "Power", ports: ["AC"] },
      { type: "HDMI", ports: ["HDMI-1", "HDMI-2"] },
      { type: "Optical", ports: ["Optical-In"] },
      { type: "RCA", ports: ["RCA-L", "RCA-R"] },
      { type: "Ethernet", ports: ["LAN"] },
      { type: "IR", ports: ["IR-In"] }
    ],
    outputs: [
      { type: "HDMI", ports: ["HDMI-Out"] },
      { type: "Subwoofer", ports: ["Sub-Out"] }
    ]
  },
  subwoofers: {
    inputs: [
      { type: "Power", ports: ["AC"] },
      { type: "Subwoofer", ports: ["Input"] }
    ],
    outputs: []
  },
  stereo_amps: {
    inputs: [
      { type: "Power", ports: ["AC"] },
      { type: "RCA", ports: ["RCA-1", "RCA-2"] },
      { type: "XLR", ports: ["XLR-L", "XLR-R"] },
      { type: "Optical", ports: ["Optical-1"] },
      { type: "Coaxial", ports: ["Coaxial"] },
      { type: "IR", ports: ["IR-In"] },
      { type: "RS232", ports: ["RS232"] }
    ],
    outputs: [
      { type: "Speaker Wire", ports: ["Speaker-L", "Speaker-R"] },
      { type: "RCA", ports: ["Pre-Out-L", "Pre-Out-R"] }
    ]
  },
  multizone_amps: {
    inputs: [
      { type: "Power", ports: ["AC"] },
      { type: "RCA", ports: ["Zone-1-L", "Zone-1-R", "Zone-2-L", "Zone-2-R", "Zone-3-L", "Zone-3-R", "Zone-4-L", "Zone-4-R"] },
      { type: "XLR", ports: ["XLR-1-L", "XLR-1-R", "XLR-2-L", "XLR-2-R"] },
      { type: "Ethernet", ports: ["LAN"] },
      { type: "IR", ports: ["IR-In"] },
      { type: "RS232", ports: ["RS232"] }
    ],
    outputs: [
      { type: "Speaker Wire", ports: ["Zone-1-L", "Zone-1-R", "Zone-2-L", "Zone-2-R", "Zone-3-L", "Zone-3-R", "Zone-4-L", "Zone-4-R"] }
    ]
  },
  surround_processors: {
    inputs: [
      { type: "Power", ports: ["AC"] },
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
      { type: "Power", ports: ["AC"] },
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

const categoryColors = {
  televisions: "bg-blue-500/10 text-blue-400 border-blue-500/50",
  projectors: "bg-purple-500/10 text-purple-400 border-purple-500/50",
  projector_screens: "bg-indigo-500/10 text-indigo-400 border-indigo-500/50",
  video_distribution: "bg-cyan-500/10 text-cyan-400 border-cyan-500/50",
  matrix_switchers: "bg-teal-500/10 text-teal-400 border-teal-500/50",
  audio_streamers: "bg-pink-500/10 text-pink-400 border-pink-500/50",
  media_streamers: "bg-rose-500/10 text-rose-400 border-rose-500/50",
  speakers: "bg-green-500/10 text-green-400 border-green-500/50",
  soundbars: "bg-lime-500/10 text-lime-400 border-lime-500/50",
  subwoofers: "bg-red-500/10 text-red-400 border-red-500/50",
  stereo_amps: "bg-orange-500/10 text-orange-400 border-orange-500/50",
  multizone_amps: "bg-amber-500/10 text-amber-400 border-amber-500/50",
  surround_processors: "bg-yellow-500/10 text-yellow-400 border-yellow-500/50",
  av_receivers: "bg-emerald-500/10 text-emerald-400 border-emerald-500/50"
};

const categorySolidColors = {
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
};

const categoryTextColors = {
  televisions: "text-blue-400",
  projectors: "text-purple-400",
  projector_screens: "text-fuchsia-400",
  video_distribution: "text-cyan-400",
  matrix_switchers: "text-teal-400",
  audio_streamers: "text-pink-400",
  media_streamers: "text-rose-400",
  speakers: "text-green-400",
  soundbars: "text-lime-400",
  subwoofers: "text-red-400",
  stereo_amps: "text-orange-400",
  multizone_amps: "text-amber-400",
  surround_processors: "text-yellow-400",
  av_receivers: "text-emerald-400"
};

export default function CanvasProduct({ 
        instanceId,
        product, 
        position,
        onRemove,
        onConnect,
        onPositionChange,
        isConnecting,
        isHighlighted,
        onClick,
        label,
        networkInfo = { sw: '', port: '', ip: '000.000.000.000', mac: '00:00:00:00:00:00' },
        onPortClick,
        onPortMouseDown,
        registerPort,
        getPortId,
        hoveredPortId,
        connectingFromPortId,
        zoom = 1
      }) {
  const [isDragging, setIsDragging] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  
  // Ensure networkInfo is always defined
  const safeNetworkInfo = networkInfo || { sw: '', port: '', ip: '000.000.000.000', mac: '00:00:00:00:00:00' };

  const handleMouseDown = (e) => {
    if (e.target.closest('button') || e.target.hasAttribute('data-port-type')) return;
    
    const clickTime = Date.now();
    const clickPos = { x: e.clientX, y: e.clientY };
    
    setIsDragging(true);
    dragOffset.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y,
      clickTime,
      clickPos
    };
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    e.preventDefault();
    
    const newX = e.clientX - dragOffset.current.x;
    const newY = e.clientY - dragOffset.current.y;
    
    requestAnimationFrame(() => {
      onPositionChange(instanceId, { x: newX, y: newY });
    });
  };

  const handleMouseUp = (e) => {
    const timeDiff = Date.now() - (dragOffset.current.clickTime || 0);
    const moveDist = Math.sqrt(
      Math.pow(e.clientX - (dragOffset.current.clickPos?.x || 0), 2) +
      Math.pow(e.clientY - (dragOffset.current.clickPos?.y || 0), 2)
    );
    
    // Don't trigger card click if clicking on a port dot
    const isPortClick = e.target.hasAttribute('data-port-type');
    
    if (timeDiff < 200 && moveDist < 5 && onClick && !isPortClick) {
      onClick();
    }
    
    setIsDragging(false);
  };

  React.useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, position]);

  // Connection type colors mapping
  const connectionTypeColors = {
    "HDMI": "#E74C3C",
    "Optical": "#2A7FDB",
    "TOSLINK": "#2A7FDB",
    "RCA": "#FFB300",
    "XLR": "#1ABC9C",
    "Speaker Wire": "#8E5C2C",
    "Ethernet": "#27AE60",
    "USB": "#2A7FDB",
    "Coaxial": "#2A7FDB",
    "3.5mm Jack": "#F4D03F",
    "Component": "#E74C3C",
    "Composite": "#E74C3C",
    "VGA": "#E74C3C",
    "RS232": "#7F8C8D",
    "HDBaseT": "#E91E63",
    "Control": "#7F8C8D",
    "Subwoofer": "#8E5C2C",
    "Wireless": "#27AE60",
    "IR": "#7F8C8D",
    "Power": "#FFA500"
  };

  // Get connection types (one dot per type, not per port)
  const getConnectionTypes = (connections, type) => {
    if (!connections || !connections[type]) return [];
    const types = [];
    connections[type].forEach(conn => {
      const color = connectionTypeColors[conn.type] || "#6b7280";
      types.push({ type: conn.type, color, ports: conn.ports || [] });
    });
    return types;
  };

  // Use database connections if available, otherwise use category defaults
  const defaultConnections = connectionsByCategory[product.category] || { inputs: [], outputs: [] };
  const hasDbConnections = (product.input_connections && product.input_connections.length > 0) || 
                            (product.output_connections && product.output_connections.length > 0);

  const connections = hasDbConnections ? {
    inputs: product.input_connections || [],
    outputs: product.output_connections || []
  } : defaultConnections;

  const inputTypes = getConnectionTypes(connections, 'inputs');
  const outputTypes = getConnectionTypes(connections, 'outputs');

  return (
    <div
      data-instance-id={instanceId}
      onMouseDown={handleMouseDown}
      style={{
        position: 'absolute',
        left: position.x,
        top: position.y,
        userSelect: 'none',
        willChange: isDragging ? 'transform' : 'auto',
        transition: isDragging ? 'none' : 'border-color 0.15s ease'
      }}
      className={`w-80 h-[280px] bg-gray-800 border-2 rounded-xl p-4 cursor-move flex flex-col ${
        isDragging ? 'shadow-2xl shadow-blue-500/30 border-blue-500 scale-105 z-50' : 
        isHighlighted ? 'border-yellow-400 shadow-lg shadow-yellow-400/50' :
        isConnecting ? 'border-blue-500' : 'border-gray-700 hover:border-gray-600'
      }`}
    >
      {/* Left edge connection points (inputs) */}
      {inputTypes.length > 0 && (
        <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 flex flex-col gap-3">
          {inputTypes.slice(0, 6).map((connType, i) => {
            const portId = getPortId(instanceId, connType.type, 'type', true);
            const isHovered = hoveredPortId === portId;
            const isConnecting = connectingFromPortId === portId;
            return (
              <div 
                key={i}
                ref={(el) => registerPort(portId, el, instanceId, connType.type, 'type', true)}
                className={`w-5 h-5 rounded-full border-2 cursor-pointer transition-all ${
                  isConnecting ? 'scale-150 border-blue-400' :
                  isHovered ? 'scale-150 border-green-400 shadow-lg shadow-green-400/50' : 
                  'border-gray-800 hover:scale-125'
                }`}
                style={{ backgroundColor: connType.color }}
                data-port-id={portId}
                data-port-index={i}
                data-port-type="input"
                title={`${connType.type} (${connType.ports.length} port${connType.ports.length > 1 ? 's' : ''})`}
                onClick={(e) => {
                  e.stopPropagation();
                  if (onPortClick) {
                    onPortClick(instanceId, connType.type, 'type', true);
                  }
                }}
                onMouseDown={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  if (onPortMouseDown) {
                    onPortMouseDown(instanceId, connType.type, 'type', true, e.currentTarget);
                  }
                }}
              />
            );
          })}
        </div>
      )}

      {/* Right edge connection points (outputs) */}
      {outputTypes.length > 0 && (
        <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 flex flex-col gap-3">
          {outputTypes.slice(0, 6).map((connType, i) => {
            const portId = getPortId(instanceId, connType.type, 'type', false);
            const isHovered = hoveredPortId === portId;
            const isConnecting = connectingFromPortId === portId;
            return (
              <div 
                key={i}
                ref={(el) => registerPort(portId, el, instanceId, connType.type, 'type', false)}
                className={`w-5 h-5 rounded-full border-2 cursor-pointer transition-all ${
                  isConnecting ? 'scale-150 border-blue-400' :
                  isHovered ? 'scale-150 border-green-400 shadow-lg shadow-green-400/50' : 
                  'border-gray-800 hover:scale-125'
                }`}
                style={{ backgroundColor: connType.color }}
                data-port-id={portId}
                data-port-index={i}
                data-port-type="output"
                title={`${connType.type} (${connType.ports.length} port${connType.ports.length > 1 ? 's' : ''})`}
                onClick={(e) => {
                  e.stopPropagation();
                  if (onPortClick) {
                    onPortClick(instanceId, connType.type, 'type', false);
                  }
                }}
                onMouseDown={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  if (onPortMouseDown) {
                    onPortMouseDown(instanceId, connType.type, 'type', false, e.currentTarget);
                  }
                }}
              />
            );
          })}
        </div>
      )}

      {/* Top edge connection points (for overflow) */}
      {(inputTypes.length > 6 || outputTypes.length > 6) && (
        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 flex gap-3">
          {[...inputTypes.slice(6).map(t => ({...t, isInput: true})), ...outputTypes.slice(6).map(t => ({...t, isInput: false}))].slice(0, 8).map((connType, i) => {
            const portId = getPortId(instanceId, connType.type, 'type', connType.isInput);
            const isHovered = hoveredPortId === portId;
            const isConnecting = connectingFromPortId === portId;
            return (
              <div 
                key={i}
                ref={(el) => registerPort(portId, el, instanceId, connType.type, 'type', connType.isInput)}
                className={`w-5 h-5 rounded-full border-2 cursor-pointer transition-all ${
                  isConnecting ? 'scale-150 border-blue-400' :
                  isHovered ? 'scale-150 border-green-400 shadow-lg shadow-green-400/50' : 
                  'border-gray-800 hover:scale-125'
                }`}
                style={{ backgroundColor: connType.color }}
                data-port-id={portId}
                data-port-index={i + 6}
                data-port-type={connType.isInput ? "input" : "output"}
                title={`${connType.type} (${connType.ports.length} port${connType.ports.length > 1 ? 's' : ''})`}
                onClick={(e) => {
                  e.stopPropagation();
                  if (onPortClick) {
                    onPortClick(instanceId, connType.type, 'type', connType.isInput);
                  }
                }}
                onMouseDown={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  if (onPortMouseDown) {
                    onPortMouseDown(instanceId, connType.type, 'type', connType.isInput, e.currentTarget);
                  }
                }}
              />
            );
          })}
        </div>
      )}
      <div className="flex items-start justify-between mb-3 flex-shrink-0">
        <div className="flex items-center gap-2">
            {label && (
              <Badge className={`bg-gray-700 border-gray-600 font-mono font-bold ${categoryTextColors[product.category] || 'text-white'}`}>
                {label}
              </Badge>
            )}
          </div>
        <div className="flex gap-1">
          <Button
            size="icon"
            variant="ghost"
            className="h-6 w-6 text-blue-400 hover:text-blue-300 hover:bg-blue-500/10"
            onClick={(e) => {
              e.stopPropagation();
              onConnect(instanceId);
            }}
          >
            <Link2 className="w-3 h-3" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-6 w-6 text-gray-400 hover:text-red-400 hover:bg-red-500/10"
            onClick={(e) => {
              e.stopPropagation();
              onRemove(instanceId);
            }}
          >
            <X className="w-3 h-3" />
          </Button>
        </div>
      </div>
      
      <div className="flex-1 min-h-0 flex flex-col">
        <div className="flex-shrink-0">
          <h3 className="font-semibold text-white text-base mb-1">
            {product.brand}
          </h3>
          <p className="text-sm text-gray-300 mb-2">{product.model}</p>
          
          {product.description && (
            <p className="text-xs text-gray-400 line-clamp-2 mb-2">
              {product.description}
            </p>
          )}
          
          {product.price && (
            <p className="text-sm font-medium text-blue-400 mb-2">
              ${product.price.toLocaleString()}
            </p>
          )}
        </div>

        {(connections.inputs?.some(input => input.type === "Ethernet") || 
          connections.outputs?.some(output => output.type === "Ethernet")) && (
          <div className="mt-auto pt-3 border-t border-gray-700 space-y-1 flex-shrink-0">
            <p className="text-xs text-gray-400">
              <span className="text-gray-500">MAC:</span> {safeNetworkInfo.mac || '00:00:00:00:00:00'}
            </p>
            <p className="text-xs text-gray-400">
              <span className="text-gray-500">IP:</span> {safeNetworkInfo.ip || '000.000.000.000'}
              <span className="mx-1">|</span>
              <span className="text-gray-500">SW#:</span> {safeNetworkInfo.sw || '00'} 
              <span className="mx-1">|</span>
              <span className="text-gray-500">Port:</span> {safeNetworkInfo.port || '00'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}