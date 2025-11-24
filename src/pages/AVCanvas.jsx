import React, { useState, useRef, useEffect } from 'react';
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { DragDropContext, Droppable } from '@hello-pangea/dnd';
import { Button } from "@/components/ui/button";
import { Trash2, Download, Plus, ZoomIn, ZoomOut, Maximize2, Link2, Settings } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "../utils";
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
  const [pendingConnection, setPendingConnection] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [selectedCanvasProduct, setSelectedCanvasProduct] = useState(null);
  const [selectedConnection, setSelectedConnection] = useState(null);
  const [highlightedConnections, setHighlightedConnections] = useState([]);
  const [hoveredConnectionIndex, setHoveredConnectionIndex] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [spacePressed, setSpacePressed] = useState(false);
  const [dragMousePosition, setDragMousePosition] = useState(null);
  const [connectingState, setConnectingState] = useState(null); // { mode: 'connecting', fromPort: {...}, startPos: {...}, mousePos: {...}, hoveredPort: {...} }
  const [hoveredPortId, setHoveredPortId] = useState(null);
  const [enrichmentProgress, setEnrichmentProgress] = useState(null);
  const canvasRef = useRef(null);
  const portRefs = useRef(new Map()); // Map of portId -> { element, instanceId, connectionType, portName, isInput, position }
  const connectingStateRef = useRef(null);
  
  const PORT_HIT_RADIUS = 20; // Pixels for hit testing
  const PORT_OFFSET = 20; // Offset distance from port for clean routing
  
  // Generate orthogonal path for connection routing
  const generateOrthogonalPath = (fromPos, toPos, fromIsInput, toIsInput) => {
    // Determine exit and entry directions based on port type
    // Inputs are on left (enter from left), outputs are on right (exit to right)
    const fromDirection = fromIsInput ? 'left' : 'right';
    const toDirection = toIsInput ? 'left' : 'right';
    
    // Calculate offset points
    const fromOffset = {
      x: fromPos.x + (fromDirection === 'right' ? PORT_OFFSET : -PORT_OFFSET),
      y: fromPos.y
    };
    
    const toOffset = {
      x: toPos.x + (toDirection === 'right' ? PORT_OFFSET : -PORT_OFFSET),
      y: toPos.y
    };
    
    // Build path points: start -> fromOffset -> routing -> toOffset -> end
    const points = [fromPos, fromOffset];
    
    // Middle routing depends on relative positions
    const dx = toOffset.x - fromOffset.x;
    const dy = toOffset.y - fromOffset.y;
    
    if (fromDirection === 'right' && toDirection === 'left') {
      // Standard left-to-right flow
      if (dx > 0) {
        // Simple L-shape
        const midX = fromOffset.x + dx / 2;
        points.push({ x: midX, y: fromOffset.y });
        points.push({ x: midX, y: toOffset.y });
      } else {
        // Z-shape for backwards connection
        const midX = fromOffset.x + Math.max(20, -dx / 2);
        const midY = fromOffset.y + dy / 2;
        points.push({ x: midX, y: fromOffset.y });
        points.push({ x: midX, y: midY });
        points.push({ x: toOffset.x - 20, y: midY });
        points.push({ x: toOffset.x - 20, y: toOffset.y });
      }
    } else if (fromDirection === 'left' && toDirection === 'right') {
      // Right-to-left flow (backwards)
      const midX = fromOffset.x + dx / 2;
      const midY = fromOffset.y + dy / 2;
      points.push({ x: fromOffset.x - 20, y: fromOffset.y });
      points.push({ x: fromOffset.x - 20, y: midY });
      points.push({ x: toOffset.x + 20, y: midY });
      points.push({ x: toOffset.x + 20, y: toOffset.y });
    } else {
      // Same side (both inputs or both outputs) - rare case
      const midX = Math.min(fromOffset.x, toOffset.x) - 40;
      const midY = fromOffset.y + dy / 2;
      points.push({ x: midX, y: fromOffset.y });
      points.push({ x: midX, y: midY });
      points.push({ x: midX, y: toOffset.y });
    }
    
    points.push(toOffset);
    points.push(toPos);
    
    return points;
  };
  
  // Convert points array to SVG path
  const pointsToPathData = (points) => {
    if (points.length < 2) return '';
    let path = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      path += ` L ${points[i].x} ${points[i].y}`;
    }
    return path;
  };

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
            ip: '000.000.000.000',
            mac: '00:00:00:00:00:00'
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

  const validateConnection = (fromId, toId, connectionType) => {
    const errors = [];
    const warnings = [];
    
    const fromProduct = canvasProducts.find(cp => cp.instanceId === fromId);
    const toProduct = canvasProducts.find(cp => cp.instanceId === toId);
    
    if (!fromProduct || !toProduct) {
      errors.push("Invalid device selection");
      return { valid: false, errors, warnings };
    }
    
    // Check network info for Ethernet connections
    if (connectionType === 'Ethernet') {
      const fromNeedsNetwork = ['televisions', 'projectors', 'video_distribution', 'matrix_switchers', 
                                'audio_streamers', 'media_streamers', 'soundbars', 'multizone_amps', 
                                'surround_processors', 'av_receivers'].includes(fromProduct.product.category);
      const toNeedsNetwork = ['televisions', 'projectors', 'video_distribution', 'matrix_switchers', 
                              'audio_streamers', 'media_streamers', 'soundbars', 'multizone_amps', 
                              'surround_processors', 'av_receivers'].includes(toProduct.product.category);
      
      const fromIp = fromProduct.networkInfo?.ip;
      const toIp = toProduct.networkInfo?.ip;
      
      if (fromNeedsNetwork && (!fromIp || fromIp === '000.000.000.000')) {
        warnings.push(`${fromProduct.label || fromProduct.product.brand} requires network configuration (IP address)`);
      }
      if (toNeedsNetwork && (!toIp || toIp === '000.000.000.000')) {
        warnings.push(`${toProduct.label || toProduct.product.brand} requires network configuration (IP address)`);
      }
    }
    
    // Check for duplicate connections on the same ports
    const duplicateConnection = connections.find(c => 
      c.from === fromId && c.to === toId && c.type === connectionType
    );
    if (duplicateConnection) {
      warnings.push("A connection of this type already exists between these devices");
    }
    
    return { valid: errors.length === 0, errors, warnings };
  };

  const handleConnectionTypeSelect = (connectionData) => {
    // Validate connection
    const validation = validateConnection(connectingFrom, connectingTo, connectionData.type);
    
    if (!validation.valid) {
      alert(`Cannot create connection:\n${validation.errors.join('\n')}`);
      setConnectingFrom(null);
      setConnectingTo(null);
      setPendingConnection(null);
      return;
    }
    
    // Show warnings if any
    if (validation.warnings.length > 0) {
      const proceed = confirm(`Connection can be created but has warnings:\n\n${validation.warnings.join('\n')}\n\nContinue anyway?`);
      if (!proceed) {
        setConnectingFrom(null);
        setConnectingTo(null);
        setPendingConnection(null);
        return;
      }
    }
    
    // Categorize connection types
    const connectionCategories = {
      'HDMI': 'V',
      'HDBaseT': 'V',
      'Component': 'V',
      'Composite': 'V',
      'VGA': 'V',
      'Optical': 'A',
      'Optical/TOSLINK': 'A',
      'RCA': 'A',
      'XLR': 'A',
      'Speaker Wire': 'A',
      'Coaxial': 'A',
      'Subwoofer': 'A',
      '3.5mm Jack': 'A',
      'Wireless': 'A',
      'Ethernet': 'N',
      'USB': 'N',
      'RS232': 'C',
      'Control': 'C',
      'Power': 'P'
    };
    
    const prefix = connectionCategories[connectionData.type] || 'W';
    
    // Count existing connections of this category
    const existingOfType = connections.filter(c => {
      const cPrefix = connectionCategories[c.type] || 'W';
      return cPrefix === prefix;
    }).length;
    
    const wireId = `${prefix}${String(existingOfType + 1).padStart(3, '0')}`;
    
    // Always use the dialog-selected ports
    setConnections([...connections, { 
      from: connectingFrom, 
      to: connectingTo,
      type: connectionData.type,
      fromPort: connectionData.fromPort,
      toPort: connectionData.toPort,
      wireId: wireId
    }]);
    setConnectingFrom(null);
    setConnectingTo(null);
    setPendingConnection(null);
  };

  const handleConnectionClick = (connection, index) => {
    setSelectedConnection({ ...connection, index });
    setSelectedProduct(null);
    setSelectedCanvasProduct(null);
  };

  const handleConnectionHover = (index) => {
    setHoveredConnectionIndex(index);
  };

  const handleConnectionLeave = () => {
    setHoveredConnectionIndex(null);
  };

  const handlePortClick = (instanceId, connectionType, portName, isInput) => {
    // When clicking on a type-level port (portName === 'type'), find ANY connection of that type
    // Otherwise, use fuzzy matching for specific port names
    const connectionIndex = connections.findIndex(conn => {
      if (conn.type !== connectionType) return false;
      
      if (isInput) {
        if (conn.to !== instanceId) return false;
        // If portName is 'type', match any port of this connection type
        if (portName === 'type') return true;
        
        const connPort = conn.toPort;
        if (!connPort) return false;
        
        // Fuzzy match for port names
        const pNorm = portName.toLowerCase().replace(/[-_]/g, '');
        const cNorm = connPort.toLowerCase().replace(/[-_]/g, '');
        return connPort === portName || pNorm.includes(cNorm) || cNorm.includes(pNorm);
      } else {
        if (conn.from !== instanceId) return false;
        // If portName is 'type', match any port of this connection type
        if (portName === 'type') return true;
        
        const connPort = conn.fromPort;
        if (!connPort) return false;
        
        // Fuzzy match for port names
        const pNorm = portName.toLowerCase().replace(/[-_]/g, '');
        const cNorm = connPort.toLowerCase().replace(/[-_]/g, '');
        return connPort === portName || pNorm.includes(cNorm) || cNorm.includes(pNorm);
      }
    });

    if (connectionIndex !== -1) {
      handleConnectionClick(connections[connectionIndex], connectionIndex);
    } else {
      // No connection on this port - show empty connection details
      const device = canvasProducts.find(cp => cp.instanceId === instanceId);
      const emptyConnection = {
        type: connectionType,
        [isInput ? 'to' : 'from']: instanceId,
        [isInput ? 'toPort' : 'fromPort']: portName === 'type' ? connectionType : portName,
        isEmpty: true
      };
      setSelectedConnection({ ...emptyConnection, index: -1 });
      setSelectedProduct(null);
      setSelectedCanvasProduct(null);
    }
  };

  // Port ID helper
  const getPortId = (instanceId, connectionType, portName, isInput) => {
    return `${instanceId}:${isInput ? 'in' : 'out'}:${connectionType}:${portName}`;
  };

  // Register port element for hit-testing
  const registerPort = (portId, element, instanceId, connectionType, portName, isInput) => {
    if (element) {
      portRefs.current.set(portId, { 
        element, 
        instanceId, 
        connectionType, 
        portName, 
        isInput 
      });
    } else {
      portRefs.current.delete(portId);
    }
  };
  
  // Hit test to find port near mouse position
  const hitTestPort = (mouseX, mouseY) => {
    const canvasRect = canvasRef.current?.getBoundingClientRect();
    if (!canvasRect) return null;
    
    let closestPort = null;
    let closestDistance = PORT_HIT_RADIUS * 2; // Increased hit radius for better detection
    
    for (const [portId, portData] of portRefs.current.entries()) {
      if (!portData.element) continue;
      
      const portRect = portData.element.getBoundingClientRect();
      const portCenterX = portRect.left + portRect.width / 2;
      const portCenterY = portRect.top + portRect.height / 2;
      
      const distance = Math.sqrt(
        Math.pow(mouseX - portCenterX, 2) + 
        Math.pow(mouseY - portCenterY, 2)
      );
      
      if (distance < closestDistance) {
        closestDistance = distance;
        const position = {
          x: (portCenterX - canvasRect.left - pan.x) / zoom,
          y: (portCenterY - canvasRect.top - pan.y) / zoom
        };
        closestPort = { 
          portId, 
          ...portData, 
          position,
          distance 
        };
      }
    }
    
    return closestPort;
  };

  // Get port position in canvas coordinates
  const getPortPosition = (portElement) => {
    const canvasRect = canvasRef.current?.getBoundingClientRect();
    if (!canvasRect || !portElement) return null;

    const portRect = portElement.getBoundingClientRect();
    return {
      x: (portRect.left + portRect.width / 2 - canvasRect.left - pan.x) / zoom,
      y: (portRect.top + portRect.height / 2 - canvasRect.top - pan.y) / zoom
    };
  };

  // Start connecting from a port
  const handlePortMouseDown = (instanceId, connectionType, portName, isInput, portElement) => {
    const startPos = getPortPosition(portElement);
    if (!startPos) return;

    const newState = {
      mode: 'connecting',
      fromPort: {
        instanceId,
        connectionType,
        portName,
        isInput
      },
      startPos,
      mousePos: startPos,
      startTime: Date.now()
    };

    setConnectingState(newState);
    connectingStateRef.current = newState;
  };

  // Update mouse position while dragging
  const handleGlobalMouseMove = React.useCallback((e) => {
    const currentState = connectingStateRef.current;
    if (!currentState) return;

    const canvasRect = canvasRef.current?.getBoundingClientRect();
    if (!canvasRect) return;

    // Hit test for nearby ports
    const hitPort = hitTestPort(e.clientX, e.clientY);
    
    // Validate if this is a valid target port
    let validHitPort = null;
    if (hitPort) {
      const validDirection = currentState.fromPort.isInput !== hitPort.isInput;
      const sameType = currentState.fromPort.connectionType === hitPort.connectionType;
      const differentDevice = currentState.fromPort.instanceId !== hitPort.instanceId;
      
      if (validDirection && sameType && differentDevice) {
        validHitPort = hitPort;
      }
    }

    // Update hovered port for visual feedback
    setHoveredPortId(validHitPort ? validHitPort.portId : null);

    // Use snapped position if hovering valid port, otherwise use mouse position
    const mousePos = validHitPort 
      ? validHitPort.position
      : {
          x: (e.clientX - canvasRect.left - pan.x) / zoom,
          y: (e.clientY - canvasRect.top - pan.y) / zoom
        };

    const newState = {
      ...currentState,
      mousePos,
      hoveredPort: validHitPort
    };
    setConnectingState(newState);
    connectingStateRef.current = newState;
  }, [zoom, pan]);

  const handleGlobalMouseUp = React.useCallback((e) => {
    const currentState = connectingStateRef.current;
    if (!currentState) return;

    const timeDiff = Date.now() - (currentState.startTime || 0);

    // Quick click - show connection details using the originally clicked port
    if (timeDiff < 150) {
      handlePortClick(
        currentState.fromPort.instanceId, 
        currentState.fromPort.connectionType, 
        currentState.fromPort.portName, 
        currentState.fromPort.isInput
      );
      setConnectingState(null);
      connectingStateRef.current = null;
      setHoveredPortId(null);
      return;
    }

    // Drag operation - show connection dialog
    if (currentState.hoveredPort) {
      const toPort = currentState.hoveredPort;
      const { fromPort } = currentState;

      // Determine correct from/to based on port directions
      const fromId = fromPort.isInput ? toPort.instanceId : fromPort.instanceId;
      const toId = fromPort.isInput ? fromPort.instanceId : toPort.instanceId;

      // Check if target device is a speaker/subwoofer and already has a connection
      const targetDevice = canvasProducts.find(cp => cp.instanceId === toId);
      const isEndpointDevice = targetDevice && ['speakers', 'subwoofers'].includes(targetDevice.product.category);

      if (isEndpointDevice) {
        const existingConnection = connections.find(c => c.to === toId);
        if (existingConnection) {
          setConnectingState(null);
          connectingStateRef.current = null;
          setHoveredPortId(null);
          return;
        }
      }

      // Store pending connection info (only IDs and type, not port names)
      setPendingConnection({
        fromId,
        toId,
        connectionType: fromPort.connectionType
      });

      // Set connecting states to trigger the dialog
      setConnectingFrom(fromId);
      setConnectingTo(toId);
    }

    setConnectingState(null);
    connectingStateRef.current = null;
    setHoveredPortId(null);
  }, [zoom, handlePortClick, canvasProducts, connections]);

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
    window.addEventListener('mousemove', handleGlobalMouseMove);
    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleDragMouseMove);
      window.removeEventListener('mousemove', handleGlobalMouseMove);
      window.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [handleGlobalMouseMove, handleGlobalMouseUp]);

  // Sync connectingState to ref
  useEffect(() => {
    connectingStateRef.current = connectingState;
  }, [connectingState]);

  // Helper to filter media streamer connections
  const filterMediaStreamerConnections = (connections) => {
    return {
      inputs: connections.inputs.filter(input => input.type !== 'HDMI'),
      outputs: connections.outputs.filter(output => output.type === 'HDMI')
    };
  };

  const connectionsByCategory = {
    televisions: {
      inputs: [
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
        { type: "Control", ports: ["Trigger-1", "Trigger-2"] },
        { type: "RS232", ports: ["RS232"] }
      ],
      outputs: []
    },
    video_distribution: {
      inputs: [
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
        { type: "Subwoofer", ports: ["Input"] }
      ],
      outputs: []
    },
    stereo_amps: {
      inputs: [
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
        { type: "Speaker Wire", ports: ["Front-L", "Front-R", "Center", "Surround-L", "Surround-R", "Surround-Back-L", "Surround-Back-R", "Sub-1", "Sub-2"] },
        { type: "RCA", ports: ["Zone-2-L", "Zone-2-R"] },
        { type: "Optical", ports: ["Optical-Out"] }
      ]
    }
  };

  const getConnectionPointPosition = (instanceId, connectionType, portName, isOutput) => {
    // Use registered port refs for accurate positioning
    // Now we look up by connection type, not individual port name
    const portId = getPortId(instanceId, connectionType, 'type', !isOutput);
    const portData = portRefs.current.get(portId);

    if (portData && portData.element) {
      const portRect = portData.element.getBoundingClientRect();
      const canvasRect = canvasRef.current?.getBoundingClientRect();

      if (canvasRect) {
        // Get center of the port dot in canvas coordinates, accounting for zoom and pan
        const x = (portRect.left + portRect.width / 2 - canvasRect.left - pan.x) / zoom;
        const y = (portRect.top + portRect.height / 2 - canvasRect.top - pan.y) / zoom;
        return { x, y };
      }
    }

    return null;
  };

  // Calculate connection positions directly (not memoized to ensure port refs are available)
  const connectionPositions = connections.map((connection, index) => {
    const fromProduct = canvasProducts.find(cp => cp.instanceId === connection.from);
    const toProduct = canvasProducts.find(cp => cp.instanceId === connection.to);

    if (!fromProduct || !toProduct) return { fromPoint: null, toPoint: null, fromEdge: null, toEdge: null };

    const fromPoint = getConnectionPointPosition(connection.from, connection.type, connection.fromPort, true);
    const toPoint = getConnectionPointPosition(connection.to, connection.type, connection.toPort, false);

    // Determine edge based on where the port actually is relative to the card
    let fromEdge = null, toEdge = null;

    if (fromPoint) {
      const cardWidth = 320;
      const cardHeight = 280;
      const fromLeft = fromProduct.position.x;
      const fromRight = fromProduct.position.x + cardWidth;
      const fromTop = fromProduct.position.y;
      const fromBottom = fromProduct.position.y + cardHeight;

      // Check which edge the port is closest to
      const distToLeft = Math.abs(fromPoint.x - fromLeft);
      const distToRight = Math.abs(fromPoint.x - fromRight);
      const distToTop = Math.abs(fromPoint.y - fromTop);
      const distToBottom = Math.abs(fromPoint.y - fromBottom);

      const minDist = Math.min(distToLeft, distToRight, distToTop, distToBottom);
      if (minDist === distToLeft) fromEdge = 'left';
      else if (minDist === distToRight) fromEdge = 'right';
      else if (minDist === distToTop) fromEdge = 'top';
      else fromEdge = 'bottom';
    }

    if (toPoint) {
      const cardWidth = 320;
      const cardHeight = 280;
      const toLeft = toProduct.position.x;
      const toRight = toProduct.position.x + cardWidth;
      const toTop = toProduct.position.y;
      const toBottom = toProduct.position.y + cardHeight;

      const distToLeft = Math.abs(toPoint.x - toLeft);
      const distToRight = Math.abs(toPoint.x - toRight);
      const distToTop = Math.abs(toPoint.y - toTop);
      const distToBottom = Math.abs(toPoint.y - toBottom);

      const minDist = Math.min(distToLeft, distToRight, distToTop, distToBottom);
      if (minDist === distToLeft) toEdge = 'left';
      else if (minDist === distToRight) toEdge = 'right';
      else if (minDist === distToTop) toEdge = 'top';
      else toEdge = 'bottom';
    }

    return { fromPoint, toPoint, fromEdge, toEdge };
  });

  const getProductEdgePoint = (fromId, toId, connectionIndex) => {
    const connection = connections[connectionIndex];
    if (!connection) return { from: { x: 0, y: 0 }, to: { x: 0, y: 0 } };

    // Use memoized positions
    const { fromPoint, toPoint } = connectionPositions[connectionIndex] || {};

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
              <Link to={createPageUrl("DeviceManager")}>
                <Button
                  variant="outline"
                  className="border-gray-700 text-gray-300 hover:bg-gray-800 hover:text-white hover:border-gray-600"
                >
                  <Settings className="w-4 h-4 mr-2" />
                  Manage Devices
                </Button>
              </Link>
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
              <div className="relative">
                <Button
                  variant="outline"
                  onClick={async () => {
                    if (!confirm('This will search the web for actual connection ports for each product in your database. This may take a few minutes. Continue?')) {
                      return;
                    }
                    try {
                      setEnrichmentProgress({ status: 'running', enriched: 0, total: products.length });
                      const { data } = await base44.functions.invoke('enrichProductConnections');
                      setEnrichmentProgress({ status: 'complete', enriched: data.enriched, total: data.total, failed: data.failed });
                      setTimeout(() => {
                        alert(`Successfully enriched ${data.enriched} products with real connection data!`);
                        window.location.reload();
                      }, 500);
                    } catch (error) {
                      console.error('Enrichment error:', error);
                      const errorMsg = error.response?.data?.error || error.message;
                      setEnrichmentProgress({ status: 'error', message: errorMsg });
                      setTimeout(() => setEnrichmentProgress(null), 5000);
                    }
                  }}
                  disabled={enrichmentProgress?.status === 'running'}
                  className="border-gray-700 text-gray-300 hover:bg-green-500/10 hover:text-green-400 hover:border-green-500 disabled:opacity-50"
                >
                  <Link2 className="w-4 h-4 mr-2" />
                  {enrichmentProgress?.status === 'running' ? 'Enriching...' : 'Enrich Connections'}
                </Button>

                {enrichmentProgress && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-gray-800 border border-gray-700 rounded-lg p-3 min-w-[300px] z-10">
                    {enrichmentProgress.status === 'running' && (
                      <>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs text-gray-300">Enriching products...</span>
                          <span className="text-xs text-gray-400">{enrichmentProgress.total} products</span>
                        </div>
                        <div className="w-full bg-gray-700 rounded-full h-2 overflow-hidden">
                          <div className="h-full bg-gradient-to-r from-green-500 to-emerald-500 animate-pulse" style={{ width: '100%' }}></div>
                        </div>
                        <p className="text-xs text-gray-500 mt-2">Cross-referencing specifications from multiple sources...</p>
                      </>
                    )}

                    {enrichmentProgress.status === 'complete' && (
                      <>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs text-green-400 font-medium">✓ Enrichment Complete</span>
                          <span className="text-xs text-gray-400">{enrichmentProgress.enriched}/{enrichmentProgress.total}</span>
                        </div>
                        <div className="w-full bg-gray-700 rounded-full h-2 overflow-hidden">
                          <div className="h-full bg-green-500" style={{ width: `${(enrichmentProgress.enriched / enrichmentProgress.total) * 100}%` }}></div>
                        </div>
                        {enrichmentProgress.failed > 0 && (
                          <p className="text-xs text-amber-400 mt-2">{enrichmentProgress.failed} products failed to enrich</p>
                        )}
                      </>
                    )}

                    {enrichmentProgress.status === 'error' && (
                      <>
                        <div className="flex items-center mb-2">
                          <span className="text-xs text-red-400 font-medium">✗ Enrichment Failed</span>
                        </div>
                        <p className="text-xs text-gray-400">{enrichmentProgress.message}</p>
                      </>
                    )}
                  </div>
                )}
              </div>
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
                  style={{ zIndex: 1 }}
                >
                  <g style={{ pointerEvents: 'auto' }} transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
                    {/* Render non-hovered connections first */}
                    {connections.map((connection, index) => {
                        if (index === hoveredConnectionIndex) return null;
                        const fromProduct = canvasProducts.find(cp => cp.instanceId === connection.from);
                        const toProduct = canvasProducts.find(cp => cp.instanceId === connection.to);

                        if (!fromProduct || !toProduct) return null;

                        // Use pre-calculated positions and edges
                        let { fromPoint, toPoint, fromEdge, toEdge } = connectionPositions[index] || {};

                        // Fallback to edge points if port positions aren't found
                        if (!fromPoint || !toPoint || !fromEdge || !toEdge) {
                          const fallback = getProductEdgePoint(connection.from, connection.to, index);
                          fromPoint = fromPoint || fallback.from;
                          toPoint = toPoint || fallback.to;

                          // For fallback, determine edge from card positions
                          if (!fromEdge || !toEdge) {
                            const cardWidth = 320;
                            const cardHeight = 280;
                            const dx = toProduct.position.x - fromProduct.position.x;
                            const dy = toProduct.position.y - fromProduct.position.y;

                            if (Math.abs(dx) > Math.abs(dy)) {
                              fromEdge = dx > 0 ? 'right' : 'left';
                              toEdge = dx > 0 ? 'left' : 'right';
                            } else {
                              fromEdge = dy > 0 ? 'bottom' : 'top';
                              toEdge = dy > 0 ? 'top' : 'bottom';
                            }
                          }
                        }

                        if (!fromPoint || !toPoint) return null;

                        const isHighlighted = highlightedConnections.includes(index);

                        return (
                          <ConnectionLine
                            key={index}
                            from={fromPoint}
                            to={toPoint}
                            fromEdge={fromEdge}
                            toEdge={toEdge}
                            connectionType={connection.type}
                            wireId={connection.wireId}
                            waypoints={connection.waypoints}
                            isHighlighted={isHighlighted}
                            offset={0}
                            onRemove={() => handleRemoveConnection(index)}
                            onClick={() => handleConnectionClick(connection, index)}
                            onHover={() => handleConnectionHover(index)}
                            onLeave={handleConnectionLeave}
                            onWaypointsChange={(newWaypoints) => {
                              const newConnections = [...connections];
                              newConnections[index].waypoints = newWaypoints;
                              setConnections(newConnections);
                            }}
                          />
                        );
                        })}

                        {/* Render hovered connection last (on top) */}
                        {hoveredConnectionIndex !== null && (() => {
                        const index = hoveredConnectionIndex;
                        const connection = connections[index];
                        const fromProduct = canvasProducts.find(cp => cp.instanceId === connection.from);
                        const toProduct = canvasProducts.find(cp => cp.instanceId === connection.to);

                        if (!fromProduct || !toProduct) return null;

                        let { fromPoint, toPoint, fromEdge, toEdge } = connectionPositions[index] || {};

                        if (!fromPoint || !toPoint || !fromEdge || !toEdge) {
                        const fallback = getProductEdgePoint(connection.from, connection.to, index);
                        fromPoint = fromPoint || fallback.from;
                        toPoint = toPoint || fallback.to;

                        if (!fromEdge || !toEdge) {
                          const cardWidth = 320;
                          const cardHeight = 280;
                          const dx = toProduct.position.x - fromProduct.position.x;
                          const dy = toProduct.position.y - fromProduct.position.y;

                          if (Math.abs(dx) > Math.abs(dy)) {
                            fromEdge = dx > 0 ? 'right' : 'left';
                            toEdge = dx > 0 ? 'left' : 'right';
                          } else {
                            fromEdge = dy > 0 ? 'bottom' : 'top';
                            toEdge = dy > 0 ? 'top' : 'bottom';
                          }
                        }
                        }

                        if (!fromPoint || !toPoint) return null;

                        const isHighlighted = highlightedConnections.includes(index);

                        return (
                        <ConnectionLine
                          key={`hovered-${index}`}
                          from={fromPoint}
                          to={toPoint}
                          fromEdge={fromEdge}
                          toEdge={toEdge}
                          connectionType={connection.type}
                          wireId={connection.wireId}
                          waypoints={connection.waypoints}
                          isHighlighted={isHighlighted}
                          offset={0}
                          onRemove={() => handleRemoveConnection(index)}
                          onClick={() => handleConnectionClick(connection, index)}
                          onHover={() => handleConnectionHover(index)}
                          onLeave={handleConnectionLeave}
                          onWaypointsChange={(newWaypoints) => {
                            const newConnections = [...connections];
                            newConnections[index].waypoints = newWaypoints;
                            setConnections(newConnections);
                          }}
                        />
                        );
                        })()}

                    {/* Rubber-band connection line while dragging */}
                    {connectingState && connectingState.mousePos && (() => {
                      const toIsInput = connectingState.hoveredPort ? 
                        connectingState.hoveredPort.isInput : 
                        !connectingState.fromPort.isInput;

                      const routePoints = generateOrthogonalPath(
                        connectingState.startPos,
                        connectingState.mousePos,
                        connectingState.fromPort.isInput,
                        toIsInput
                      );

                      const pathData = pointsToPathData(routePoints);
                      const isValidTarget = !!connectingState.hoveredPort;

                      return (
                        <g>
                          <path
                            d={pathData}
                            stroke={isValidTarget ? "#22c55e" : "#3b82f6"}
                            strokeWidth="4"
                            strokeDasharray="8,4"
                            fill="none"
                            className="pointer-events-none"
                            opacity="0.8"
                          />
                          <circle
                            cx={connectingState.startPos.x}
                            cy={connectingState.startPos.y}
                            r="6"
                            fill={isValidTarget ? "#22c55e" : "#3b82f6"}
                            className="pointer-events-none"
                          />
                          <circle
                            cx={connectingState.mousePos.x}
                            cy={connectingState.mousePos.y}
                            r="6"
                            fill={isValidTarget ? "#22c55e" : "#3b82f6"}
                            className="pointer-events-none"
                            opacity={isValidTarget ? "1" : "0.5"}
                          />
                        </g>
                      );
                    })()}
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
                        onPortClick={handlePortClick}
                        onPortMouseDown={handlePortMouseDown}
                        registerPort={registerPort}
                        getPortId={getPortId}
                        hoveredPortId={hoveredPortId}
                        connectingFromPortId={connectingState?.fromPort ? getPortId(
                          connectingState.fromPort.instanceId,
                          connectingState.fromPort.connectionType,
                          connectingState.fromPort.portName,
                          connectingState.fromPort.isInput
                        ) : null}
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
            fromProduct={{
              ...canvasProducts.find(cp => cp.instanceId === connectingFrom)?.product,
              instanceId: connectingFrom,
              networkInfo: canvasProducts.find(cp => cp.instanceId === connectingFrom)?.networkInfo
            }}
            toProduct={{
              ...canvasProducts.find(cp => cp.instanceId === connectingTo)?.product,
              instanceId: connectingTo,
              networkInfo: canvasProducts.find(cp => cp.instanceId === connectingTo)?.networkInfo
            }}
            existingConnections={connections}
            pendingConnection={pendingConnection}
            onSelect={handleConnectionTypeSelect}
            onCancel={() => {
              setConnectingFrom(null);
              setConnectingTo(null);
              setPendingConnection(null);
            }}
          />
        )}
      </div>
    </DragDropContext>
  );
}