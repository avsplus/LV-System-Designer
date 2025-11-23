import React, { useState, useRef, useEffect } from 'react';
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { DragDropContext, Droppable } from '@hello-pangea/dnd';
import { Button } from "@/components/ui/button";
import { Trash2, Download, Plus, ZoomIn, ZoomOut, Maximize2, Link2 } from "lucide-react";
import ProductSidebar from "../components/canvas/ProductSidebar";
import CanvasProduct from "../components/canvas/CanvasProduct";
import ConnectionLine from "../components/canvas/ConnectionLine";
import ProductDetailsPanel from "../components/canvas/ProductDetailsPanel";
import ConnectionDetailsPanel from "../components/canvas/ConnectionDetailsPanel";
import ConnectionTypeDialog from "../components/canvas/ConnectionTypeDialog";
import DeviceConnectionsPanel from "../components/canvas/DeviceConnectionsPanel";

export default function AVCanvas() {
  const [canvasProducts, setCanvasProducts] = useState([]);
  const [connections, setConnections] = useState([]);
  const [connectingFrom, setConnectingFrom] = useState(null);
  const [connectingTo, setConnectingTo] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [selectedCanvasProduct, setSelectedCanvasProduct] = useState(null);
  const [selectedConnection, setSelectedConnection] = useState(null);
  const [highlightedConnections, setHighlightedConnections] = useState([]);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [spacePressed, setSpacePressed] = useState(false);
  const [dragMousePosition, setDragMousePosition] = useState(null);
  const canvasRef = useRef(null);

  const { data: products = [], isLoading } = useQuery({
    queryKey: ['avProducts'],
    queryFn: () => base44.entities.AVProduct.list(),
  });

  const onDragEnd = (result) => {
    const { source, destination, draggableId } = result;

    if (!destination) {
      setDragMousePosition(null);
      return;
    }

    // Dragging from sidebar to canvas
    if (source.droppableId === 'sidebar' && destination.droppableId === 'canvas') {
      const product = products.find(p => p.id === draggableId);
      if (product && dragMousePosition) {
        const canvasRect = canvasRef.current.getBoundingClientRect();
        const instanceId = `${product.id}_${Date.now()}_${Math.random()}`;
        // Count how many of this brand already exist
        const brandCount = canvasProducts.filter(cp => cp.product.brand === product.brand).length + 1;
        const deviceLabel = `${product.brand} ${brandCount}`;
        
        // Calculate position relative to canvas, accounting for zoom and pan
        const x = (dragMousePosition.x - canvasRect.left - pan.x) / zoom - 128; // center the card
        const y = (dragMousePosition.y - canvasRect.top - pan.y) / zoom - 100;
        
        setCanvasProducts([...canvasProducts, {
          instanceId,
          product,
          position: { x, y },
          label: deviceLabel,
          networkInfo: {
            sw: '',
            port: '',
            ip: '',
            mac: ''
          }
        }]);
      }
    }
    setDragMousePosition(null);
  };

  const handlePositionChange = (instanceId, newPosition) => {
    setCanvasProducts(canvasProducts.map(cp => 
      cp.instanceId === instanceId 
        ? { ...cp, position: newPosition }
        : cp
    ));
  };

  const handleNetworkInfoChange = (instanceId, networkInfo) => {
    setCanvasProducts(canvasProducts.map(cp => 
      cp.instanceId === instanceId 
        ? { ...cp, networkInfo }
        : cp
    ));
  };

  const handleRemoveProduct = (instanceId) => {
    setCanvasProducts(canvasProducts.filter(cp => cp.instanceId !== instanceId));
    setConnections(connections.filter(c => c.from !== instanceId && c.to !== instanceId));
    if (selectedCanvasProduct?.instanceId === instanceId) {
      setSelectedCanvasProduct(null);
    }
  };

  const handleConnect = (instanceId) => {
    if (connectingFrom === null) {
      setConnectingFrom(instanceId);
    } else if (connectingFrom !== instanceId) {
      setConnectingTo(instanceId);
    } else {
      setConnectingFrom(null);
    }
  };

  const handleConnectionTypeSelect = (connectionData) => {
    setConnections([...connections, { 
      from: connectingFrom, 
      to: connectingTo,
      type: connectionData.type,
      fromPort: connectionData.fromPort,
      toPort: connectionData.toPort
    }]);
    setConnectingFrom(null);
    setConnectingTo(null);
  };

  const handleConnectionClick = (connection, index) => {
    setSelectedConnection({ ...connection, index });
    setSelectedProduct(null);
  };

  const handleDeleteConnection = () => {
    if (selectedConnection) {
      setConnections(connections.filter((_, i) => i !== selectedConnection.index));
      setSelectedConnection(null);
    }
  };

  const handleRemoveConnection = (index) => {
    setConnections(connections.filter((_, i) => i !== index));
  };

  const clearCanvas = () => {
    setCanvasProducts([]);
    setConnections([]);
    setSelectedProduct(null);
    setSelectedConnection(null);
  };

  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev + 0.1, 2));
  };

  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev - 0.1, 0.5));
  };

  const handleZoomReset = () => {
    setZoom(1);
  };

  const handleWheel = (e) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.05 : 0.05;
      setZoom(prev => Math.max(0.5, Math.min(2, prev + delta)));
    }
  };

  const handleMouseDown = (e) => {
    if (e.button === 1 || (e.button === 0 && spacePressed) || (e.button === 0 && e.target === canvasRef.current)) {
      e.preventDefault();
      setIsPanning(true);
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  };

  const handleMouseMove = (e) => {
    if (isPanning) {
      setPan({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y
      });
    }
  };

  const handleMouseUp = () => {
    setIsPanning(false);
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.code === 'Space' && !e.repeat) {
        e.preventDefault();
        setSpacePressed(true);
      }
    };

    const handleKeyUp = (e) => {
      if (e.code === 'Space') {
        setSpacePressed(false);
        setIsPanning(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  useEffect(() => {
    if (isPanning) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isPanning, panStart, pan]);

  useEffect(() => {
    const handleDragMouseMove = (e) => {
      setDragMousePosition({ x: e.clientX, y: e.clientY });
    };
    
    window.addEventListener('mousemove', handleDragMouseMove);
    return () => {
      window.removeEventListener('mousemove', handleDragMouseMove);
    };
  }, []);

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
        { type: "HDMI", ports: ["HDMI-Out"] },
        { type: "Optical", ports: ["Optical-Out"] }
      ]
    },
    speakers: {
      inputs: [
        { type: "Speaker Wire", ports: ["Left", "Right"] },
        { type: "XLR", ports: ["Left", "Right"] }
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
        { type: "RCA", ports: ["LFE-L", "LFE-R"] },
        { type: "Speaker Wire", ports: ["LFE"] },
        { type: "XLR", ports: ["XLR"] },
        { type: "Wireless", ports: ["Wireless"] }
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

  const getConnectionPointPosition = (instanceId, connectionType, portName, isOutput) => {
    const canvasProduct = canvasProducts.find(cp => cp.instanceId === instanceId);
    if (!canvasProduct) return null;

    const product = canvasProduct.product;
    const defaultConnections = connectionsByCategory[product.category] || { inputs: [], outputs: [] };
    const hasRealConnections = product.connections && 
      ((product.connections.inputs && product.connections.inputs.length > 0) || 
       (product.connections.outputs && product.connections.outputs.length > 0));
    
    // First try with real connections if available
    let connections = hasRealConnections ? product.connections : defaultConnections;
    
    // Check if the requested connection type exists in the connections
    const checkDirection = isOutput ? 'outputs' : 'inputs';
    const hasRequestedType = (connections[checkDirection] || []).some(conn => conn.type === connectionType);
    
    // If the requested connection type doesn't exist, fall back to defaults
    if (!hasRequestedType) {
      connections = defaultConnections;
    }

    const finalConnections = ['speakers', 'subwoofers', 'projector_screens'].includes(product.category)
      ? { ...connections, outputs: [] }
      : connections;

    const cardWidth = 320;
    const cardHeight = 280;
    const gapSize = 8; // gap-2 = 8px
    const circleSize = 12; // w-3 h-3 = 12px

    // Build list of all connection points with their types
    const direction = isOutput ? 'outputs' : 'inputs';
    const allPoints = [];
    (finalConnections[direction] || []).forEach(conn => {
      (conn.ports || []).forEach(port => {
        allPoints.push({ type: conn.type, port });
      });
    });

    // Find the index of our specific connection
    const pointIndex = allPoints.findIndex(p => p.type === connectionType && p.port === portName);
    
    if (pointIndex === -1) {
      return null;
    }

    const baseX = canvasProduct.position.x;
    const baseY = canvasProduct.position.y;
    const centerY = baseY + cardHeight / 2;
    const halfCircle = circleSize / 2;

    if (pointIndex < 6) {
      // Left edge (inputs) or Right edge (outputs)
      const verticalCount = Math.min(allPoints.length, 6);
      
      // Flex column with gap-2: spacing between circle tops is 20px (12px circle + 8px gap)
      const totalContainerHeight = (verticalCount * circleSize) + ((verticalCount - 1) * gapSize);
      
      // Container is positioned with: top-1/2 -translate-y-1/2 (centers it vertically)
      // First circle top edge is at: centerY - totalHeight/2
      // First circle center is at: centerY - totalHeight/2 + halfCircle
      const firstCircleCenterY = centerY - (totalContainerHeight / 2) + halfCircle;
      
      // Each subsequent circle is 20px down
      const y = firstCircleCenterY + (pointIndex * (circleSize + gapSize));

      if (isOutput) {
        // Right edge: right-0 translate-x-1/2
        // Circle container right edge is at cardWidth
        // With translate-x-1/2 it shifts right by half container width
        // Container width = circleSize = 12px, so shift is 6px
        // Circle center is at: cardWidth + 6px
        return { x: baseX + cardWidth + halfCircle, y };
      } else {
        // Left edge: left-0 -translate-x-1/2
        // Circle container left edge is at 0
        // With -translate-x-1/2 it shifts left by 6px
        // Circle center is at: -6px
        return { x: baseX - halfCircle, y };
      }
    } else {
      // Top edge (overflow) - horizontal layout
      const overflowIndex = pointIndex - 6;
      const horizontalCount = Math.min(allPoints.length - 6, 8);
      
      // Flex row with gap-2
      const totalContainerWidth = (horizontalCount * circleSize) + ((horizontalCount - 1) * gapSize);
      
      // Container: left-1/2 -translate-x-1/2 (centers it horizontally)
      const centerX = baseX + cardWidth / 2;
      const firstCircleCenterX = centerX - (totalContainerWidth / 2) + halfCircle;
      
      const x = firstCircleCenterX + (overflowIndex * (circleSize + gapSize));

      // Top edge: top-0 -translate-y-1/2
      // Circle center is at: -6px
      return { x, y: baseY - halfCircle };
    }
  };

  const getProductEdgePoint = (fromId, toId, connectionIndex) => {
    const connection = connections[connectionIndex];
    if (!connection) return { from: { x: 0, y: 0 }, to: { x: 0, y: 0 } };

    // Get exact connection point positions
    const fromPoint = getConnectionPointPosition(fromId, connection.type, connection.fromPort, true);
    const toPoint = getConnectionPointPosition(toId, connection.type, connection.toPort, false);

    if (fromPoint && toPoint) {
      return { from: fromPoint, to: toPoint };
    }

    // Fallback to old calculation if connection points not found
    const fromProduct = canvasProducts.find(cp => cp.instanceId === fromId);
    const toProduct = canvasProducts.find(cp => cp.instanceId === toId);

    if (!fromProduct || !toProduct) return { from: { x: 0, y: 0 }, to: { x: 0, y: 0 } };

    const cardWidth = 320;
    const cardHeight = 280;

    const fromCenter = {
      x: fromProduct.position.x + cardWidth / 2,
      y: fromProduct.position.y + cardHeight / 2
    };

    const toCenter = {
      x: toProduct.position.x + cardWidth / 2,
      y: toProduct.position.y + cardHeight / 2
    };

    const dx = toCenter.x - fromCenter.x;
    const dy = toCenter.y - fromCenter.y;

    // Get all connections for a specific device and edge, with their indices
    const getEdgeConnectionIndices = (deviceId, edge) => {
      const indices = [];
      connections.forEach((c, idx) => {
        const isFromDevice = c.from === deviceId;
        const isToDevice = c.to === deviceId;

        if (!isFromDevice && !isToDevice) return;

        const otherId = isFromDevice ? c.to : c.from;
        const otherProduct = canvasProducts.find(cp => cp.instanceId === otherId);
        if (!otherProduct) return;

        const deviceProduct = canvasProducts.find(cp => cp.instanceId === deviceId);

        const otherCenter = {
          x: otherProduct.position.x + cardWidth / 2,
          y: otherProduct.position.y + cardHeight / 2
        };

        const deviceCenter = {
          x: deviceProduct.position.x + cardWidth / 2,
          y: deviceProduct.position.y + cardHeight / 2
        };

        const cdx = otherCenter.x - deviceCenter.x;
        const cdy = otherCenter.y - deviceCenter.y;

        let matchesEdge = false;
        if (Math.abs(cdx) > Math.abs(cdy)) {
          if (edge === 'right') matchesEdge = cdx > 0;
          if (edge === 'left') matchesEdge = cdx < 0;
        } else {
          if (edge === 'bottom') matchesEdge = cdy > 0;
          if (edge === 'top') matchesEdge = cdy < 0;
        }

        if (matchesEdge) {
          indices.push(idx);
        }
      });
      return indices.sort((a, b) => a - b);
    };

    let fromEdge, toEdge;

    if (Math.abs(dx) > Math.abs(dy)) {
      // Horizontal connection
      if (dx > 0) {
        const fromIndices = getEdgeConnectionIndices(fromId, 'right');
        const toIndices = getEdgeConnectionIndices(toId, 'left');
        const fromPosition = fromIndices.indexOf(connectionIndex);
        const toPosition = toIndices.indexOf(connectionIndex);
        const fromTotal = fromIndices.length;
        const toTotal = toIndices.length;

        const fromOffset = fromTotal > 1 ? ((fromPosition - (fromTotal - 1) / 2) * 30) : 0;
        const toOffset = toTotal > 1 ? ((toPosition - (toTotal - 1) / 2) * 30) : 0;

        fromEdge = {
          x: fromProduct.position.x + cardWidth,
          y: fromCenter.y + fromOffset
        };
        toEdge = {
          x: toProduct.position.x,
          y: toCenter.y + toOffset
        };
      } else {
        const fromIndices = getEdgeConnectionIndices(fromId, 'left');
        const toIndices = getEdgeConnectionIndices(toId, 'right');
        const fromPosition = fromIndices.indexOf(connectionIndex);
        const toPosition = toIndices.indexOf(connectionIndex);
        const fromTotal = fromIndices.length;
        const toTotal = toIndices.length;

        const fromOffset = fromTotal > 1 ? ((fromPosition - (fromTotal - 1) / 2) * 30) : 0;
        const toOffset = toTotal > 1 ? ((toPosition - (toTotal - 1) / 2) * 30) : 0;

        fromEdge = {
          x: fromProduct.position.x,
          y: fromCenter.y + fromOffset
        };
        toEdge = {
          x: toProduct.position.x + cardWidth,
          y: toCenter.y + toOffset
        };
      }
    } else {
      // Vertical connection
      if (dy > 0) {
        const fromIndices = getEdgeConnectionIndices(fromId, 'bottom');
        const toIndices = getEdgeConnectionIndices(toId, 'top');
        const fromPosition = fromIndices.indexOf(connectionIndex);
        const toPosition = toIndices.indexOf(connectionIndex);
        const fromTotal = fromIndices.length;
        const toTotal = toIndices.length;

        const fromOffset = fromTotal > 1 ? ((fromPosition - (fromTotal - 1) / 2) * 30) : 0;
        const toOffset = toTotal > 1 ? ((toPosition - (toTotal - 1) / 2) * 30) : 0;

        fromEdge = {
          x: fromCenter.x + fromOffset,
          y: fromProduct.position.y + cardHeight
        };
        toEdge = {
          x: toCenter.x + toOffset,
          y: toProduct.position.y
        };
      } else {
        const fromIndices = getEdgeConnectionIndices(fromId, 'top');
        const toIndices = getEdgeConnectionIndices(toId, 'bottom');
        const fromPosition = fromIndices.indexOf(connectionIndex);
        const toPosition = toIndices.indexOf(connectionIndex);
        const fromTotal = fromIndices.length;
        const toTotal = toIndices.length;

        const fromOffset = fromTotal > 1 ? ((fromPosition - (fromTotal - 1) / 2) * 30) : 0;
        const toOffset = toTotal > 1 ? ((toPosition - (toTotal - 1) / 2) * 30) : 0;

        fromEdge = {
          x: fromCenter.x + fromOffset,
          y: fromProduct.position.y
        };
        toEdge = {
          x: toCenter.x + toOffset,
          y: toProduct.position.y + cardHeight
        };
      }
    }

    return { from: fromEdge, to: toEdge };
  };

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className="flex h-screen bg-gray-950 overflow-hidden">
        <ProductSidebar 
          products={products} 
          onProductSelect={setSelectedProduct}
        />

        <div className="flex-1 flex flex-col">
          <div className="bg-gray-900 border-b border-gray-800 px-6 py-4 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white">AV System Designer</h1>
              <p className="text-sm text-gray-400 mt-0.5">
                Drag products to canvas and create connections
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={async () => {
                  try {
                    const { data } = await base44.functions.invoke('scrapeSnapAV');
                    alert(`Successfully imported ${data.productsFound} AV products from the web`);
                    window.location.reload();
                  } catch (error) {
                    console.error('Import error:', error);
                    const errorMsg = error.response?.data?.error || error.message;
                    alert(`Failed to import products: ${errorMsg}`);
                  }
                }}
                className="border-gray-700 text-gray-300 hover:bg-blue-500/10 hover:text-blue-400 hover:border-blue-500"
              >
                <Plus className="w-4 h-4 mr-2" />
                Import AV Products
              </Button>
              <Button
                variant="outline"
                onClick={async () => {
                  if (!confirm('This will search the web for actual connection ports for each product in your database. This may take a few minutes. Continue?')) {
                    return;
                  }
                  try {
                    const { data } = await base44.functions.invoke('enrichProductConnections');
                    alert(`Successfully enriched ${data.enriched} products with real connection data!`);
                    window.location.reload();
                  } catch (error) {
                    console.error('Enrichment error:', error);
                    const errorMsg = error.response?.data?.error || error.message;
                    alert(`Failed to enrich products: ${errorMsg}`);
                  }
                }}
                className="border-gray-700 text-gray-300 hover:bg-green-500/10 hover:text-green-400 hover:border-green-500"
              >
                <Link2 className="w-4 h-4 mr-2" />
                Enrich Connections
              </Button>
              <div className="flex items-center gap-1 border border-gray-700 rounded-lg px-2 py-1">
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={handleZoomOut}
                  className="h-7 w-7 text-gray-300 hover:text-white"
                >
                  <ZoomOut className="w-4 h-4" />
                </Button>
                <span className="text-sm text-gray-400 min-w-[3rem] text-center">
                  {Math.round(zoom * 100)}%
                </span>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={handleZoomIn}
                  className="h-7 w-7 text-gray-300 hover:text-white"
                >
                  <ZoomIn className="w-4 h-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={handleZoomReset}
                  className="h-7 w-7 text-gray-300 hover:text-white"
                >
                  <Maximize2 className="w-3 h-3" />
                </Button>
              </div>
              <Button
                variant="outline"
                onClick={clearCanvas}
                disabled={canvasProducts.length === 0}
                className="border-gray-700 text-gray-300 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Clear Canvas
              </Button>
            </div>
          </div>

          <Droppable droppableId="canvas">
            {(provided, snapshot) => (
              <div
                ref={(el) => {
                  provided.innerRef(el);
                  canvasRef.current = el;
                }}
                {...provided.droppableProps}
                onWheel={handleWheel}
                onMouseDown={handleMouseDown}
                className={`flex-1 relative overflow-auto bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 transition-colors ${
                  snapshot.isDraggingOver ? 'bg-blue-950/20' : ''
                } ${isPanning || spacePressed ? 'cursor-grab' : ''} ${isPanning ? 'cursor-grabbing' : ''}`}
                style={{
                  backgroundImage: 'radial-gradient(circle, rgba(59, 130, 246, 0.05) 1px, transparent 1px)',
                  backgroundSize: `${30 * zoom}px ${30 * zoom}px`,
                  backgroundPosition: `${pan.x}px ${pan.y}px`
                }}
              >
                <svg
                  className="absolute inset-0 w-full h-full pointer-events-none"
                  style={{ zIndex: 10 }}
                >
                  <g style={{ pointerEvents: 'auto' }} transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
                    {connections.map((connection, index) => {
                      const fromProduct = canvasProducts.find(cp => cp.instanceId === connection.from);
                      const toProduct = canvasProducts.find(cp => cp.instanceId === connection.to);
                      
                      if (!fromProduct || !toProduct) return null;
                      
                      const fromCenter = {
                        x: fromProduct.position.x + 128,
                        y: fromProduct.position.y + 80
                      };
                      const toCenter = {
                        x: toProduct.position.x + 128,
                        y: toProduct.position.y + 80
                      };
                      const dx = toCenter.x - fromCenter.x;
                      const dy = toCenter.y - fromCenter.y;
                      
                      let fromEdge, toEdge;
                      if (Math.abs(dx) > Math.abs(dy)) {
                        fromEdge = dx > 0 ? 'right' : 'left';
                        toEdge = dx > 0 ? 'left' : 'right';
                      } else {
                        fromEdge = dy > 0 ? 'bottom' : 'top';
                        toEdge = dy > 0 ? 'top' : 'bottom';
                      }
                      
                      const { from, to } = getProductEdgePoint(connection.from, connection.to, index);
                      const isHighlighted = highlightedConnections.includes(index);

                      return (
                        <ConnectionLine
                          key={index}
                          from={from}
                          to={to}
                          fromEdge={fromEdge}
                          toEdge={toEdge}
                          connectionType={connection.type}
                          waypoints={connection.waypoints}
                          isHighlighted={isHighlighted}
                          offset={0}
                          onRemove={() => handleRemoveConnection(index)}
                          onClick={() => handleConnectionClick(connection, index)}
                          onWaypointsChange={(newWaypoints) => {
                            const newConnections = [...connections];
                            newConnections[index].waypoints = newWaypoints;
                            setConnections(newConnections);
                          }}
                        />
                      );
                    })}
                  </g>
                </svg>

                {canvasProducts.length === 0 && !snapshot.isDraggingOver && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="text-center">
                      <div className="w-16 h-16 rounded-full bg-gray-800 flex items-center justify-center mx-auto mb-4">
                        <Plus className="w-8 h-8 text-gray-600" />
                      </div>
                      <p className="text-gray-500 text-lg font-medium">
                        Drag products here to start
                      </p>
                      <p className="text-gray-600 text-sm mt-1">
                        Build your AV system layout
                      </p>
                    </div>
                  </div>
                )}

                <div style={{ 
                  position: 'relative', 
                  zIndex: 2, 
                  minHeight: '100%', 
                  minWidth: '100%',
                  transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                  transformOrigin: 'top left',
                  transition: isPanning ? 'none' : 'transform 0.1s ease-out',
                  pointerEvents: isPanning ? 'none' : 'auto'
                }}>
                  {canvasProducts.map((cp) => {
                    const isHighlighted = highlightedConnections.some(idx => {
                      const conn = connections[idx];
                      return conn && (conn.from === cp.instanceId || conn.to === cp.instanceId);
                    });
                    return (
                      <CanvasProduct
                        key={cp.instanceId}
                        instanceId={cp.instanceId}
                        product={cp.product}
                        position={cp.position}
                        onRemove={handleRemoveProduct}
                        onConnect={handleConnect}
                        onPositionChange={handlePositionChange}
                        isConnecting={connectingFrom === cp.instanceId}
                        isHighlighted={isHighlighted}
                        label={cp.label}
                        networkInfo={cp.networkInfo}
                        onClick={() => {
                          setSelectedCanvasProduct(cp);
                          setSelectedProduct(null);
                          setSelectedConnection(null);
                        }}
                      />
                    );
                  })}
                </div>
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </div>

        {selectedProduct && !selectedConnection && !selectedCanvasProduct && (
          <ProductDetailsPanel
            product={selectedProduct}
            onClose={() => setSelectedProduct(null)}
          />
        )}

        {selectedCanvasProduct && !selectedConnection && (
          <DeviceConnectionsPanel
            product={selectedCanvasProduct}
            label={selectedCanvasProduct.label}
            networkInfo={selectedCanvasProduct.networkInfo}
            activeConnections={connections}
            allProducts={canvasProducts}
            onClose={() => setSelectedCanvasProduct(null)}
            onHighlightConnections={setHighlightedConnections}
            onNetworkInfoChange={(networkInfo) => handleNetworkInfoChange(selectedCanvasProduct.instanceId, networkInfo)}
          />
        )}

        {selectedConnection && (
          <ConnectionDetailsPanel
            connection={selectedConnection}
            fromProduct={canvasProducts.find(cp => cp.instanceId === selectedConnection.from)?.product}
            toProduct={canvasProducts.find(cp => cp.instanceId === selectedConnection.to)?.product}
            fromLabel={canvasProducts.find(cp => cp.instanceId === selectedConnection.from)?.label}
            toLabel={canvasProducts.find(cp => cp.instanceId === selectedConnection.to)?.label}
            allConnections={connections}
            onClose={() => setSelectedConnection(null)}
            onDelete={handleDeleteConnection}
          />
        )}

        {connectingFrom !== null && connectingTo !== null && (
          <ConnectionTypeDialog
            fromProduct={{ ...canvasProducts.find(cp => cp.instanceId === connectingFrom)?.product, instanceId: connectingFrom }}
            toProduct={{ ...canvasProducts.find(cp => cp.instanceId === connectingTo)?.product, instanceId: connectingTo }}
            existingConnections={connections}
            onSelect={handleConnectionTypeSelect}
            onCancel={() => {
              setConnectingFrom(null);
              setConnectingTo(null);
            }}
          />
        )}
      </div>
    </DragDropContext>
  );
}