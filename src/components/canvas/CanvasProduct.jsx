import React, { useState, useRef, useMemo } from 'react';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { X, FileText, Download, ChevronLeft, ChevronRight, ChevronUp, ChevronDown, Loader2, Info, CheckCircle } from "lucide-react";
import { base44 } from "@/api/base44Client";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const connectionsByCategory = {
  control_processors: {
    inputs: [{ type: "Power", ports: [{ id: "power-ac", label: "AC", direction: "input" }] }],
    outputs: []
  },
  televisions: {
    inputs: [{ type: "Power", ports: [{ id: "power-ac", label: "AC", direction: "input" }] }],
    outputs: []
  },
  projectors: {
    inputs: [{ type: "Power", ports: [{ id: "power-ac", label: "AC", direction: "input" }] }],
    outputs: []
  },
  projector_screens: {
    inputs: [{ type: "Power", ports: [{ id: "power-ac", label: "AC", direction: "input" }] }],
    outputs: []
  },
  video_distribution: {
    inputs: [{ type: "Power", ports: [{ id: "power-ac", label: "AC", direction: "input" }] }],
    outputs: []
  },
  matrix_switchers: {
    inputs: [{ type: "Power", ports: [{ id: "power-ac", label: "AC", direction: "input" }] }],
    outputs: []
  },
  audio_streamers: {
    inputs: [{ type: "Power", ports: [{ id: "power-ac", label: "AC", direction: "input" }] }],
    outputs: []
  },
  media_streamers: {
    inputs: [{ type: "Power", ports: [{ id: "power-ac", label: "AC", direction: "input" }] }],
    outputs: []
  },
  speakers: {
    inputs: [],
    outputs: []
  },
  soundbars: {
    inputs: [{ type: "Power", ports: [{ id: "power-ac", label: "AC", direction: "input" }] }],
    outputs: []
  },
  subwoofers: {
    inputs: [{ type: "Power", ports: [{ id: "power-ac", label: "AC", direction: "input" }] }],
    outputs: []
  },
  stereo_amps: {
    inputs: [{ type: "Power", ports: [{ id: "power-ac", label: "AC", direction: "input" }] }],
    outputs: []
  },
  multizone_amps: {
    inputs: [{ type: "Power", ports: [{ id: "power-ac", label: "AC", direction: "input" }] }],
    outputs: []
  },
  surround_processors: {
    inputs: [{ type: "Power", ports: [{ id: "power-ac", label: "AC", direction: "input" }] }],
    outputs: []
  },
  av_receivers: {
    inputs: [{ type: "Power", ports: [{ id: "power-ac", label: "AC", direction: "input" }] }],
    outputs: []
  },
  network_switches: {
    inputs: [{ type: "Power", ports: [{ id: "power-ac", label: "AC", direction: "input" }] }],
    outputs: []
  },
  hdmi_extenders: {
    inputs: [{ type: "Power", ports: [{ id: "power-ac", label: "AC", direction: "input" }] }],
    outputs: []
  }
};

const categoryColors = {
  televisions: "bg-blue-500/10 text-blue-400 border-blue-500/50",
  projectors: "bg-purple-500/10 text-purple-400 border-purple-500/50",
  projector_screens: "bg-fuchsia-500/10 text-fuchsia-400 border-fuchsia-500/50",
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
  av_receivers: "bg-emerald-500/10 text-emerald-400 border-emerald-500/50",
  network_switches: "bg-slate-500/10 text-slate-400 border-slate-500/50",
  control_processors: "bg-violet-500/10 text-violet-400 border-violet-500/50",
  hdmi_extenders: "bg-indigo-500/10 text-indigo-400 border-indigo-500/50",
  access_points: "bg-sky-500/10 text-sky-400 border-sky-500/50",
  patch_panels: "bg-slate-500/10 text-slate-400 border-slate-500/50",
  data_jacks: "bg-blue-500/10 text-blue-400 border-blue-500/50",
  telephones: "bg-cyan-500/10 text-cyan-400 border-cyan-500/50",
  phone_jacks: "bg-cyan-500/10 text-cyan-400 border-cyan-500/50",
  intercoms: "bg-teal-500/10 text-teal-400 border-teal-500/50",
  nvrs: "bg-gray-500/10 text-gray-400 border-gray-500/50",
  ip_cameras: "bg-gray-500/10 text-gray-400 border-gray-500/50"
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
  av_receivers: "bg-emerald-600",
  network_switches: "bg-slate-600",
  control_processors: "bg-violet-600",
  hdmi_extenders: "bg-indigo-600",
  access_points: "bg-sky-500",
  patch_panels: "bg-slate-500",
  data_jacks: "bg-blue-500",
  telephones: "bg-cyan-600",
  phone_jacks: "bg-cyan-500",
  intercoms: "bg-teal-500",
  nvrs: "bg-gray-600",
  ip_cameras: "bg-gray-500"
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
  av_receivers: "text-emerald-400",
  network_switches: "text-slate-400",
  control_processors: "text-violet-400",
  hdmi_extenders: "text-indigo-400",
  access_points: "text-sky-400",
  patch_panels: "text-slate-400",
  data_jacks: "text-blue-400",
  telephones: "text-cyan-400",
  phone_jacks: "text-cyan-400",
  intercoms: "text-teal-400",
  nvrs: "text-gray-400",
  ip_cameras: "text-gray-400"
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
        isSelected,
        onClick,
        label,
        networkInfo = { sw: '', port: '', ip: '000.000.000.000', mac: '00:00:00:00:00:00' },
        onPortClick,
        onPortMouseDown,
        registerPort,
        getPortId,
        hoveredPortId,
        connectingFromPortId,
        zoom = 1,
        onTooltipChange,
        responsiveDimensions,
        onProductUpdate,
        onPreviewManual
      }) {
  const [isDragging, setIsDragging] = useState(false);
  const [isSearchingManuals, setIsSearchingManuals] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  
  // Use fixed dimensions - responsive scaling caused layout issues
  const dimensions = useMemo(() => ({
    cardWidth: 320,
    cardHeight: 280,
    portDotSize: 20,
    portGap: 12,
    minTapTarget: 32
  }), []);
  
  const isTouchDevice = typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0);
  
  // Helper to set tooltip info at page level
  const setTooltipInfo = (info) => {
    if (onTooltipChange) {
      onTooltipChange(info);
    }
  };
  
  // Ensure networkInfo is always defined
  const safeNetworkInfo = networkInfo || { sw: '', port: '', ip: '000.000.000.000', mac: '00:00:00:00:00:00' };

  const hasManuals = product.installation_manual_url || product.user_manual_url;

  const searchForManuals = async (e) => {
    e.stopPropagation();
    setIsSearchingManuals(true);
    try {
      const response = await base44.integrations.Core.InvokeLLM({
        prompt: `Find the official PDF manuals for this AV product:
Brand: ${product.brand}
Model: ${product.model}

Search for INSTALLATION documentation (any of these terms):
- Installation manual / Installation guide
- Setup guide / Quick start guide
- Assembly instructions

Search for USER documentation (any of these terms):
- User manual / User guide
- Owner's manual / Operator's manual
- Instruction manual
- Technical documentation
- Operations manual
- Maintenance manual / Service manual

Search patterns:
- site:${product.brand.toLowerCase().replace(/\s+/g, '')}.com "${product.model}" filetype:pdf
- "${product.brand} ${product.model}" installation guide pdf
- "${product.brand} ${product.model}" setup guide pdf
- "${product.brand} ${product.model}" user manual pdf
- "${product.brand} ${product.model}" owner's manual pdf
- "${product.brand} ${product.model}" quick start pdf

Only return URLs that:
- End in .pdf
- Are from official manufacturer websites or authorized documentation sites
- Are direct download links to the PDF files`,
        add_context_from_internet: true,
        response_json_schema: {
          type: "object",
          properties: {
            installation_manual_url: { type: "string" },
            user_manual_url: { type: "string" }
          }
        }
      });

      // Only save URLs that actually end with .pdf
      const installManual = response.installation_manual_url?.toLowerCase().endsWith('.pdf') 
        ? response.installation_manual_url 
        : null;
      const userManual = response.user_manual_url?.toLowerCase().endsWith('.pdf') 
        ? response.user_manual_url 
        : null;
      
      // Always update with new search results (replace existing)
      const updateData = {};
      if (installManual) updateData.installation_manual_url = installManual;
      if (userManual) updateData.user_manual_url = userManual;
      
      if (Object.keys(updateData).length > 0) {
        await base44.entities.AVProduct.update(product.id, updateData);
        
        if (onProductUpdate) {
          onProductUpdate({
            ...product,
            ...updateData
          });
        }
      }
    } catch (error) {
      console.error('Failed to search for manuals:', error);
    }
    setIsSearchingManuals(false);
  };

  // Convert screen coordinates to world coordinates
  const screenToWorld = (screenX, screenY, canvasRect, panX, panY, zoomLevel) => ({
    x: (screenX - canvasRect.left - panX) / zoomLevel,
    y: (screenY - canvasRect.top - panY) / zoomLevel
  });

  const handleMouseDown = (e) => {
    if (e.target.closest('button') || e.target.hasAttribute('data-port-type')) return;
    
    e.stopPropagation(); // Prevent canvas pan when dragging product
    
    const clickTime = Date.now();
    const clickPos = { x: e.clientX, y: e.clientY };
    
    // Get canvas element and its transform values
    const canvas = e.currentTarget.parentElement;
    const canvasRect = canvas.parentElement.getBoundingClientRect();
    const transform = canvas.style.transform;
    const translateMatch = transform.match(/translate\(([^,]+)px,\s*([^)]+)px\)/);
    const scaleMatch = transform.match(/scale\(([^)]+)\)/);
    const panX = translateMatch ? parseFloat(translateMatch[1]) : 0;
    const panY = translateMatch ? parseFloat(translateMatch[2]) : 0;
    const zoomLevel = scaleMatch ? parseFloat(scaleMatch[1]) : 1;
    
    // Convert mouse to world coords and store offset from node position
    const mouseWorld = screenToWorld(e.clientX, e.clientY, canvasRect, panX, panY, zoomLevel);
    
    setIsDragging(true);
    dragOffset.current = {
      offsetX: mouseWorld.x - position.x,
      offsetY: mouseWorld.y - position.y,
      canvasRect,
      panX,
      panY,
      zoomLevel,
      clickTime,
      clickPos
    };
  };

  const handleMouseMove = React.useCallback((e) => {
    if (!isDragging) return;
    e.preventDefault();
    
    const { canvasRect, panX, panY, zoomLevel, offsetX, offsetY } = dragOffset.current;
    const mouseWorld = screenToWorld(e.clientX, e.clientY, canvasRect, panX, panY, zoomLevel);
    
    onPositionChange(instanceId, { 
      x: mouseWorld.x - offsetX, 
      y: mouseWorld.y - offsetY 
    });
  }, [isDragging, instanceId, onPositionChange]);

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
  }, [isDragging, handleMouseMove]);

  // Connection type colors mapping
  const connectionTypeColors = {
    "HDMI": "#E74C3C",
    "Optical": "#2A7FDB",
    "TOSLINK": "#2A7FDB",
    "RCA": "#FFB300",
    "XLR": "#1ABC9C",
    "Speaker Wire": "#8E5C2C",
    "Ethernet": "#27AE60",
    "SFP": "#00CED1",
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
      // Handle both old string format and new object format ports
      const ports = (conn.ports || []).map(p => typeof p === 'string' ? { id: p, label: p, direction: type === 'inputs' ? 'input' : 'output' } : p);
      types.push({ type: conn.type, color, ports });
    });
    return types;
  };

  // Use database connections if available, otherwise use category defaults
  const defaultConnections = connectionsByCategory[product.category] || { inputs: [], outputs: [] };
  const hasDbConnections = (product.input_connections && product.input_connections.length > 0) || 
                            (product.output_connections && product.output_connections.length > 0);

  let connections = hasDbConnections ? {
    inputs: (product.input_connections || []).map(conn => ({
      type: conn.type,
      ports: (conn.ports || []).map(p => typeof p === 'string' ? { id: p, label: p, direction: 'input' } : p)
    })),
    outputs: (product.output_connections || []).map(conn => ({
      type: conn.type,
      ports: (conn.ports || []).map(p => typeof p === 'string' ? { id: p, label: p, direction: 'output' } : p)
    }))
  } : defaultConnections;

  const inputTypes = getConnectionTypes(connections, 'inputs');
  const outputTypes = getConnectionTypes(connections, 'outputs');

  // Touch event handlers
  const handleTouchStart = (e) => {
    if (e.target.closest('button') || e.target.hasAttribute('data-port-type')) return;
    if (e.touches.length !== 1) return;
    
    e.stopPropagation(); // Prevent canvas pan when dragging product
    
    const touch = e.touches[0];
    const clickTime = Date.now();
    
    const canvas = e.currentTarget.parentElement;
    const canvasRect = canvas.parentElement.getBoundingClientRect();
    const transform = canvas.style.transform;
    const translateMatch = transform.match(/translate\(([^,]+)px,\s*([^)]+)px\)/);
    const scaleMatch = transform.match(/scale\(([^)]+)\)/);
    const panX = translateMatch ? parseFloat(translateMatch[1]) : 0;
    const panY = translateMatch ? parseFloat(translateMatch[2]) : 0;
    const zoomLevel = scaleMatch ? parseFloat(scaleMatch[1]) : 1;
    
    const mouseWorld = screenToWorld(touch.clientX, touch.clientY, canvasRect, panX, panY, zoomLevel);
    
    setIsDragging(true);
    dragOffset.current = {
      offsetX: mouseWorld.x - position.x,
      offsetY: mouseWorld.y - position.y,
      canvasRect,
      panX,
      panY,
      zoomLevel,
      clickTime,
      clickPos: { x: touch.clientX, y: touch.clientY }
    };
  };

  const handleTouchMove = React.useCallback((e) => {
    if (!isDragging || e.touches.length !== 1) return;
    e.preventDefault();
    
    const touch = e.touches[0];
    const { canvasRect, panX, panY, zoomLevel, offsetX, offsetY } = dragOffset.current;
    const mouseWorld = screenToWorld(touch.clientX, touch.clientY, canvasRect, panX, panY, zoomLevel);
    
    onPositionChange(instanceId, { 
      x: mouseWorld.x - offsetX, 
      y: mouseWorld.y - offsetY 
    });
  }, [isDragging, instanceId, onPositionChange]);

  const handleTouchEnd = (e) => {
    const timeDiff = Date.now() - (dragOffset.current.clickTime || 0);
    const touch = e.changedTouches[0];
    const moveDist = Math.sqrt(
      Math.pow(touch.clientX - (dragOffset.current.clickPos?.x || 0), 2) +
      Math.pow(touch.clientY - (dragOffset.current.clickPos?.y || 0), 2)
    );
    
    if (timeDiff < 300 && moveDist < 10 && onClick) {
      onClick();
    }
    
    setIsDragging(false);
  };

  // Add touch event listeners
  React.useEffect(() => {
    if (isDragging && isTouchDevice) {
      window.addEventListener('touchmove', handleTouchMove, { passive: false });
      window.addEventListener('touchend', handleTouchEnd);
      return () => {
        window.removeEventListener('touchmove', handleTouchMove);
        window.removeEventListener('touchend', handleTouchEnd);
      };
    }
  }, [isDragging, handleTouchMove, isTouchDevice]);

  return (
    <div
      data-instance-id={instanceId}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
      style={{
        position: 'absolute',
        left: position.x,
        top: position.y,
        width: 320,
        height: 280,
        userSelect: 'none',
        WebkitUserSelect: 'none',
        touchAction: 'none',
        willChange: isDragging ? 'transform' : 'auto',
        transition: isDragging ? 'none' : 'border-color 0.15s ease',
        pointerEvents: 'auto'
      }}
      className={`bg-gray-800 border-2 rounded-xl p-4 cursor-move flex flex-col ${
        isDragging ? 'shadow-2xl shadow-blue-500/30 border-blue-500 scale-105 z-50' : 
        isSelected ? 'border-blue-400 shadow-lg shadow-blue-400/40' :
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
            const isConnectingPort = connectingFromPortId === portId;
            return (
              <div 
                key={i}
                ref={(el) => registerPort(portId, el, instanceId, connType.type, 'type', true)}
                className={`w-5 h-5 rounded-full border-2 cursor-pointer transition-all flex items-center justify-center ${
                  isConnectingPort ? 'scale-150 border-blue-400' :
                  isHovered ? 'scale-150 border-green-400 shadow-lg shadow-green-400/50' : 
                  'border-gray-800 hover:scale-125 active:scale-150'
                }`}
                style={{ backgroundColor: connType.color }}
                data-port-id={portId}
                data-port-index={i}
                data-port-type="input"
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
                onTouchStart={(e) => {
                  e.stopPropagation();
                  if (onPortMouseDown) {
                    onPortMouseDown(instanceId, connType.type, 'type', true, e.currentTarget);
                  }
                }}
                onMouseEnter={(e) => {
                  const isBidirectional = outputTypes.some(out => out.type === connType.type);
                  setTooltipInfo({
                    type: connType.type,
                    portCount: connType.ports.length,
                    color: connType.color,
                    isInput: true,
                    isBidirectional,
                    element: e.currentTarget
                  });
                }}
                onMouseLeave={() => setTooltipInfo(null)}
              >
                <ChevronRight className="w-3 h-3 text-black/70" />
              </div>
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
            const isConnectingPort = connectingFromPortId === portId;
            return (
              <div 
                key={i}
                ref={(el) => registerPort(portId, el, instanceId, connType.type, 'type', false)}
                className={`w-5 h-5 rounded-full border-2 cursor-pointer transition-all flex items-center justify-center ${
                  isConnectingPort ? 'scale-150 border-blue-400' :
                  isHovered ? 'scale-150 border-green-400 shadow-lg shadow-green-400/50' : 
                  'border-gray-800 hover:scale-125 active:scale-150'
                }`}
                style={{ backgroundColor: connType.color }}
                data-port-id={portId}
                data-port-index={i}
                data-port-type="output"
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
                onTouchStart={(e) => {
                  e.stopPropagation();
                  if (onPortMouseDown) {
                    onPortMouseDown(instanceId, connType.type, 'type', false, e.currentTarget);
                  }
                }}
                onMouseEnter={(e) => {
                  const isBidirectional = inputTypes.some(inp => inp.type === connType.type);
                  setTooltipInfo({
                    type: connType.type,
                    portCount: connType.ports.length,
                    color: connType.color,
                    isInput: false,
                    isBidirectional,
                    element: e.currentTarget
                  });
                }}
                onMouseLeave={() => setTooltipInfo(null)}
              >
                <ChevronRight className="w-3 h-3 text-black/70" />
              </div>
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
                className={`w-5 h-5 rounded-full border-2 cursor-pointer transition-all flex items-center justify-center ${
                  isConnecting ? 'scale-150 border-blue-400' :
                  isHovered ? 'scale-150 border-green-400 shadow-lg shadow-green-400/50' : 
                  'border-gray-800 hover:scale-125'
                }`}
                style={{ backgroundColor: connType.color }}
                data-port-id={portId}
                data-port-index={i + 6}
                data-port-type={connType.isInput ? "input" : "output"}
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
                onMouseEnter={(e) => {
                  const isBidirectional = connType.isInput 
                    ? outputTypes.some(out => out.type === connType.type)
                    : inputTypes.some(inp => inp.type === connType.type);
                  setTooltipInfo({
                    type: connType.type,
                    portCount: connType.ports.length,
                    color: connType.color,
                    isInput: connType.isInput,
                    isBidirectional,
                    element: e.currentTarget
                  });
                }}
                onMouseLeave={() => setTooltipInfo(null)}
              >
                {connType.isInput ? (
                  <ChevronDown className="w-3 h-3 text-black/70" />
                ) : (
                  <ChevronUp className="w-3 h-3 text-black/70" />
                )}
              </div>
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
          {hasManuals ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-6 w-6 text-orange-400 hover:text-orange-300 hover:bg-orange-500/10"
                  onClick={(e) => e.stopPropagation()}
                  title="View Manuals"
                >
                  <FileText className="w-3 h-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="bg-gray-800 border-gray-700">
                {product.installation_manual_url && (
                  <DropdownMenuItem 
                    onClick={() => onPreviewManual && onPreviewManual({ type: 'installation', url: product.installation_manual_url })}
                    className="text-orange-400 hover:text-orange-300 hover:bg-orange-500/10 cursor-pointer"
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    Installation Manual
                  </DropdownMenuItem>
                )}
                {product.user_manual_url && (
                  <DropdownMenuItem 
                    onClick={() => onPreviewManual && onPreviewManual({ type: 'user', url: product.user_manual_url })}
                    className="text-green-400 hover:text-green-300 hover:bg-green-500/10 cursor-pointer"
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    User Manual
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button
              size="icon"
              variant="ghost"
              className="h-6 w-6 text-blue-400 hover:text-blue-300 hover:bg-blue-500/10"
              onClick={searchForManuals}
              disabled={isSearchingManuals}
              title="Search for Manuals"
            >
              {isSearchingManuals ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <Download className="w-3 h-3" />
              )}
            </Button>
          )}
          {!product.id?.startsWith('demo-') && (
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
          )}
        </div>
      </div>
      
      <div className="flex-1 min-h-0 flex flex-col">
        <div className="flex-shrink-0 flex gap-3">
          <div className="w-16 h-16 flex-shrink-0 rounded-lg overflow-hidden bg-gray-700 border border-gray-600 flex items-center justify-center">
            {product.image_url && /\.(jpg|jpeg|png|gif|webp|svg|bmp)(\?.*)?$/i.test(product.image_url) ? (
              <img 
                src={product.image_url} 
                alt={`${product.brand} ${product.model}`}
                className="w-full h-full object-cover"
                onError={(e) => { 
                  e.target.style.display = 'none'; 
                  e.target.nextSibling.style.display = 'flex';
                }}
              />
            ) : null}
            <div className={`w-full h-full flex items-center justify-center text-gray-500 ${product.image_url && /\.(jpg|jpeg|png|gif|webp|svg|bmp)(\?.*)?$/i.test(product.image_url) ? 'hidden' : ''}`}>
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-white text-base mb-1">
              {product.brand}
            </h3>
            <p className="text-sm text-gray-300 mb-1">{product.model}</p>
            
            {product.price && (
              <p className="text-sm font-medium text-blue-400">
                ${product.price.toLocaleString()}
              </p>
            )}
          </div>
        </div>
        
        {product.description && (
          <p className="text-xs text-gray-400 line-clamp-2 mt-2">
            {product.description}
          </p>
        )}

        {(connections.inputs?.some(input => input.type === "Ethernet") || 
          connections.outputs?.some(output => output.type === "Ethernet")) && (
          <div className="mt-auto pt-3 border-t border-gray-700 space-y-1 flex-shrink-0">
            <p className="text-xs text-gray-400">
              <span className="text-gray-500">MAC:</span> {safeNetworkInfo.mac || '00:00:00:00:00:00'}
            </p>
            <p className="text-xs text-gray-400 flex items-center justify-between">
              <span>
                <span className="text-gray-500">IP:</span> {safeNetworkInfo.ip || '000.000.000.000'}
                <span className="mx-1">|</span>
                <span className="text-gray-500">SW#:</span> {safeNetworkInfo.sw || '00'} 
                <span className="mx-1">|</span>
                <span className="text-gray-500">Port:</span> {safeNetworkInfo.port || '00'}
              </span>
              {(() => {
                const hasNetworkInfo = safeNetworkInfo?.ip && safeNetworkInfo.ip !== '000.000.000.000' && safeNetworkInfo.ip !== '';
                return hasNetworkInfo ? (
                  <CheckCircle className="w-6 h-6 text-green-500 flex-shrink-0" />
                ) : (
                  <Info className="w-6 h-6 text-yellow-500 flex-shrink-0" />
                );
              })()}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}