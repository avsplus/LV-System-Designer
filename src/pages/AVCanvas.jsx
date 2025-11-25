import React, { useState, useRef, useEffect } from 'react';
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { DragDropContext, Droppable } from '@hello-pangea/dnd';
import { Button } from "@/components/ui/button";
import { Trash2, Download, Plus, ZoomIn, ZoomOut, Maximize2, Link2, Settings, FolderOpen, Save, ChevronDown, FileText, User, Home } from "lucide-react";
import { ToastProvider, useToast } from "../components/ui/Toast";
import { ConfirmProvider, useConfirm } from "../components/ui/ConfirmDialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Link } from "react-router-dom";
import { createPageUrl } from "../utils";
import ProductSidebar from "../components/canvas/ProductSidebar";
import CanvasProduct from "../components/canvas/CanvasProduct.jsx";
import ConnectionLine from "../components/canvas/ConnectionLine";
import ProductDetailsPanel from "../components/canvas/ProductDetailsPanel";
import ConnectionDetailsPanel from "../components/canvas/ConnectionDetailsPanel";
import ConnectionTypeDialog from "../components/canvas/ConnectionTypeDialog";
import DeviceConnectionsPanel from "../components/canvas/DeviceConnectionsPanel";
import ProjectManager from "../components/canvas/ProjectManager";
import CollaboratorIndicator from "../components/canvas/CollaboratorIndicator";
import useProjectSync from "../components/canvas/useProjectSync";
import RoomManager from "../components/canvas/RoomManager";
import RoomSelectDialog from "../components/canvas/RoomSelectDialog";
import { trackActivity, ActivityActions } from "../components/activity/activityTracker";
import { usePermissions } from "../components/auth/usePermissions";
import { ROLES } from "../components/auth/permissions";

function AVCanvasContent() {
    const toast = useToast();
    const confirmDialog = useConfirm();
    const { isAtLeast, loading: permLoading } = usePermissions();
  const [currentProject, setCurrentProject] = useState(null);
  const [showProjectManager, setShowProjectManager] = useState(false);
  const [showRoomManager, setShowRoomManager] = useState(false);
  const [rooms, setRooms] = useState(() => {
    const saved = localStorage.getItem('av_canvas_temp_rooms');
    return saved ? JSON.parse(saved) : [];
  });
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [pendingProductDrop, setPendingProductDrop] = useState(null);
  const [canvasProducts, setCanvasProducts] = useState(() => {
    const saved = localStorage.getItem('av_canvas_temp_products');
    return saved ? JSON.parse(saved) : [];
  });
  const [connections, setConnections] = useState(() => {
    const saved = localStorage.getItem('av_canvas_temp_connections');
    return saved ? JSON.parse(saved) : [];
  });

  // Helper to ensure networkInfo is always defined
  const ensureNetworkInfo = (product) => ({
    ...product,
    networkInfo: product.networkInfo || { sw: '', port: '', ip: '000.000.000.000', mac: '00:00:00:00:00:00' }
  });
  const [connectingFrom, setConnectingFrom] = useState(null);
  const [connectingTo, setConnectingTo] = useState(null);
  const [pendingConnection, setPendingConnection] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [selectedCanvasProduct, setSelectedCanvasProduct] = useState(null);
  const [selectedConnection, setSelectedConnection] = useState(null);
  const [panelHistory, setPanelHistory] = useState([]);
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
  const [portTooltip, setPortTooltip] = useState(null);
  const [enrichmentProgress, setEnrichmentProgress] = useState(null);
        const [importProgress, setImportProgress] = useState(null);
  const [currentUserEmail, setCurrentUserEmail] = useState(null);
  const canvasRef = useRef(null);
  const portRefs = useRef(new Map()); // Map of portId -> { element, instanceId, connectionType, portName, isInput, position }
  const connectingStateRef = useRef(null);
  
  const PORT_HIT_RADIUS = 50; // Pixels for hit testing (increased for easier targeting)
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

  // Get current user
  useEffect(() => {
    base44.auth.me().then(user => setCurrentUserEmail(user.email)).catch(() => {});
  }, []);

  // Real-time project sync for collaboration
  const handleProjectUpdatedFromSync = React.useCallback((updatedProject) => {
    setCurrentProject(updatedProject);
    setCanvasProducts(updatedProject.canvas_products || []);
    setConnections(updatedProject.connections || []);
    setRooms(updatedProject.rooms || []);
    // Update lastSavedRef to prevent re-save after sync
    lastSavedRef.current = {
      products: JSON.stringify(updatedProject.canvas_products || []),
      connections: JSON.stringify(updatedProject.connections || []),
      rooms: JSON.stringify(updatedProject.rooms || [])
    };
  }, []);

  const { markLocalChange } = useProjectSync({
    currentProject,
    currentUserEmail,
    onProjectUpdated: handleProjectUpdatedFromSync
  });

  // Auto-save to localStorage whenever canvas changes
  useEffect(() => {
    localStorage.setItem('av_canvas_temp_products', JSON.stringify(canvasProducts));
  }, [canvasProducts]);

  useEffect(() => {
    localStorage.setItem('av_canvas_temp_connections', JSON.stringify(connections));
  }, [connections]);

  useEffect(() => {
    localStorage.setItem('av_canvas_temp_rooms', JSON.stringify(rooms));
  }, [rooms]);

  // Auto-save to database instantly when project exists (for owner or collaborator)
  const lastSavedRef = useRef({ products: null, connections: null, rooms: null });
  const isSavingRef = useRef(false);

  useEffect(() => {
    if (!currentProject?.id || !currentUserEmail) return;

    // Allow save if user is owner OR has access (shared_with)
    const isOwner = currentProject.owner_email === currentUserEmail;
    const isCollaborator = currentProject.shared_with?.includes(currentUserEmail);
    if (!isOwner && !isCollaborator) return;

    // Check if data actually changed to avoid unnecessary saves
    const productsJson = JSON.stringify(canvasProducts);
    const connectionsJson = JSON.stringify(connections);
    const roomsJson = JSON.stringify(rooms);

    if (lastSavedRef.current.products === productsJson && 
        lastSavedRef.current.connections === connectionsJson &&
        lastSavedRef.current.rooms === roomsJson) {
      return;
    }

    // Prevent concurrent saves
    if (isSavingRef.current) return;

    const saveProject = async () => {
      isSavingRef.current = true;
      try {
        markLocalChange();
        await base44.entities.AVProject.update(currentProject.id, {
          canvas_products: canvasProducts,
          connections: connections,
          rooms: rooms
        });
        lastSavedRef.current = { products: productsJson, connections: connectionsJson, rooms: roomsJson };
        console.log('Instant-saved project');
      } catch (error) {
        console.error('Auto-save failed:', error);
      } finally {
        isSavingRef.current = false;
      }
    };

    saveProject();
  }, [canvasProducts, connections, rooms, currentProject?.id, currentUserEmail, currentProject?.owner_email, currentProject?.shared_with, markLocalChange]);

  // No project loads by default - user must explicitly load a project
  // Clear ALL cached state on mount to ensure clean workspace
  useEffect(() => {
    localStorage.removeItem('av_canvas_temp_project_id');
    localStorage.removeItem('av_canvas_temp_products');
    localStorage.removeItem('av_canvas_temp_connections');
    localStorage.removeItem('av_canvas_temp_rooms');
    setCanvasProducts([]);
    setConnections([]);
    setRooms([]);
    setCurrentProject(null);
  }, []);

  const handleProjectLoad = (project) => {
    setCurrentProject(project);
    if (project) {
      setCanvasProducts(project.canvas_products || []);
      setConnections(project.connections || []);
      setRooms(project.rooms || []);
      localStorage.setItem('av_canvas_temp_project_id', project.id);
      // Reset the lastSavedRef to prevent immediate re-save on load
      lastSavedRef.current = {
        products: JSON.stringify(project.canvas_products || []),
        connections: JSON.stringify(project.connections || []),
        rooms: JSON.stringify(project.rooms || [])
      };
    } else {
      setCanvasProducts([]);
      setConnections([]);
      setRooms([]);
      localStorage.removeItem('av_canvas_temp_project_id');
      lastSavedRef.current = { products: null, connections: null, rooms: null };
    }
    setSelectedProduct(null);
    setSelectedConnection(null);
    setSelectedCanvasProduct(null);
    setSelectedRoom(null);
  };

  const handleAddRoom = (roomName) => {
    setRooms(prev => [...prev, roomName]);

    // Track activity
    if (currentProject?.id) {
      trackActivity(ActivityActions.ADDED_ROOM, currentProject.id, currentProject.name, {
        room_name: roomName
      });
    }
  };

  const handleDeleteRoom = (roomName) => {
    setRooms(prev => prev.filter(r => r !== roomName));
    setCanvasProducts(prev => prev.filter(cp => cp.room !== roomName));
    setConnections(prev => prev.filter(conn => {
      const fromDevice = canvasProducts.find(cp => cp.instanceId === conn.from);
      const toDevice = canvasProducts.find(cp => cp.instanceId === conn.to);
      return fromDevice?.room !== roomName && toDevice?.room !== roomName;
    }));
    if (selectedRoom === roomName) {
      setSelectedRoom(null);
    }

    // Track activity
    if (currentProject?.id) {
      trackActivity(ActivityActions.REMOVED_ROOM, currentProject.id, currentProject.name, {
        room_name: roomName
      });
    }
  };

  const addProductToCanvas = (product, position, room) => {
    const instanceId = `${product.id}_${Date.now()}_${Math.random()}`;
    // Count how many of this brand already exist in this room
    const roomDevices = canvasProducts.filter(cp => cp.room === room);
    const brandCount = roomDevices.filter(cp => cp.product.brand === product.brand).length + 1;
    const deviceLabel = `${product.brand} ${brandCount}`;

    setCanvasProducts(prev => [...prev, {
      instanceId,
      product,
      position,
      label: deviceLabel,
      room: room,
      networkInfo: {
        sw: '',
        port: '',
        ip: '000.000.000.000',
        mac: '00:00:00:00:00:00'
      }
    }]);

    // Track activity
    if (currentProject?.id) {
      trackActivity(ActivityActions.ADDED_DEVICE, currentProject.id, currentProject.name, {
        device_name: `${product.brand} ${product.model}`
      });
    }
  };

  const onDragEnd = (result) => {
    const { source, destination, draggableId } = result;

    if (!destination) {
      setDragMousePosition(null);
      return;
    }

    // Block canvas operations if no project loaded
    if (!currentProject) {
      setDragMousePosition(null);
      return;
    }

    // Dragging from sidebar to canvas
    if (source.droppableId === 'sidebar' && destination.droppableId === 'canvas') {
      const product = products.find(p => p.id === draggableId);
      if (product && dragMousePosition) {
        const canvasRect = canvasRef.current.getBoundingClientRect();
        
        // Calculate position relative to canvas, accounting for zoom and pan
        const x = (dragMousePosition.x - canvasRect.left - pan.x) / zoom - 128;
        const y = (dragMousePosition.y - canvasRect.top - pan.y) / zoom - 100;

        // Always show room selection dialog
        setPendingProductDrop({ product, position: { x, y } });
      }
    }
    setDragMousePosition(null);
  };

  const handlePositionChange = (instanceId, newPosition) => {
    setCanvasProducts(canvasProducts.map(cp => 
      cp.instanceId === instanceId 
        ? ensureNetworkInfo({ ...cp, position: newPosition })
        : ensureNetworkInfo(cp)
    ));
  };

  const handleNetworkInfoChange = (instanceId, networkInfo) => {
    setCanvasProducts(canvasProducts.map(cp => 
      cp.instanceId === instanceId 
        ? ensureNetworkInfo({ ...cp, networkInfo: networkInfo || { sw: '', port: '', ip: '000.000.000.000', mac: '00:00:00:00:00:00' } })
        : ensureNetworkInfo(cp)
    ));
  };

  const handleRemoveProduct = (instanceId) => {
    const removedProduct = canvasProducts.find(cp => cp.instanceId === instanceId);
    setCanvasProducts(canvasProducts.filter(cp => cp.instanceId !== instanceId));
    setConnections(connections.filter(c => c.from !== instanceId && c.to !== instanceId));
    if (selectedCanvasProduct?.instanceId === instanceId) {
      setSelectedCanvasProduct(null);
    }

    // Track activity
    if (currentProject?.id && removedProduct) {
      trackActivity(ActivityActions.REMOVED_DEVICE, currentProject.id, currentProject.name, {
        device_name: `${removedProduct.product.brand} ${removedProduct.product.model}`
      });
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

    const rawFromProduct = canvasProducts.find(cp => cp.instanceId === fromId);
    const rawToProduct = canvasProducts.find(cp => cp.instanceId === toId);

    if (!rawFromProduct || !rawToProduct) {
      errors.push("Invalid device selection");
      return { valid: false, errors, warnings };
    }

    // Ensure networkInfo exists with defaults
    const fromProduct = ensureNetworkInfo(rawFromProduct);
    const toProduct = ensureNetworkInfo(rawToProduct);
    const fromNetworkInfo = fromProduct.networkInfo;
    const toNetworkInfo = toProduct.networkInfo;

    // Check network info for Ethernet connections
    if (connectionType === 'Ethernet') {
      const fromNeedsNetwork = ['televisions', 'projectors', 'video_distribution', 'matrix_switchers', 
                                'audio_streamers', 'media_streamers', 'soundbars', 'multizone_amps', 
                                'surround_processors', 'av_receivers'].includes(fromProduct.product.category);
      const toNeedsNetwork = ['televisions', 'projectors', 'video_distribution', 'matrix_switchers', 
                              'audio_streamers', 'media_streamers', 'soundbars', 'multizone_amps', 
                              'surround_processors', 'av_receivers'].includes(toProduct.product.category);

      const fromIp = fromNetworkInfo.ip;
      const toIp = toNetworkInfo.ip;

      if (fromNeedsNetwork && (!fromIp || fromIp === '000.000.000.000' || fromIp === '')) {
        warnings.push(`${fromProduct.label || fromProduct.product.brand} requires network configuration (IP address)`);
      }
      if (toNeedsNetwork && (!toIp || toIp === '000.000.000.000' || toIp === '')) {
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

  const handleConnectionTypeSelect = async (connectionData) => {
    // Validate connection
    const validation = validateConnection(connectingFrom, connectingTo, connectionData.type);
    
    if (!validation.valid) {
      toast.error(`Cannot create connection: ${validation.errors.join(', ')}`);
      setConnectingFrom(null);
      setConnectingTo(null);
      setPendingConnection(null);
      return;
    }
    
    // Show warnings if any
    if (validation.warnings.length > 0) {
      const proceed = await confirmDialog(validation.warnings.join('\n\n'), {
        title: 'Connection Warning',
        type: 'warning',
        confirmText: 'Continue Anyway',
        cancelText: 'Cancel'
      });
      if (!proceed) {
        setConnectingFrom(null);
        setConnectingTo(null);
        setPendingConnection(null);
        return;
      }
    }
    
    // Store connection data for use after async operations
    const fromId = connectingFrom;
    const toId = connectingTo;
    
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

    // Track activity
    if (currentProject?.id) {
      trackActivity(ActivityActions.ADDED_CONNECTION, currentProject.id, currentProject.name, {
        connection_type: connectionData.type
      });
    }

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
    let closestDistance = PORT_HIT_RADIUS;
    
    console.log('Hit testing at:', mouseX, mouseY, 'Port count:', portRefs.current.size);
    
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
        console.log('Found close port:', portId, 'distance:', distance);
      }
    }
    
    console.log('Closest port:', closestPort);
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
    if (!startPos) {
      return;
    }

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
      startTime: Date.now(),
      clickX: window.event?.clientX,
      clickY: window.event?.clientY
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
      
      console.log('Validating port:', {
        fromInput: currentState.fromPort.isInput,
        toInput: hitPort.isInput,
        validDirection,
        fromType: currentState.fromPort.connectionType,
        toType: hitPort.connectionType,
        sameType,
        fromDevice: currentState.fromPort.instanceId,
        toDevice: hitPort.instanceId,
        differentDevice
      });
      
      if (validDirection && sameType && differentDevice) {
        validHitPort = hitPort;
        console.log('✓ Valid target port found!');
      } else {
        console.log('✗ Port validation failed:', {
          reason: !validDirection ? 'Cannot connect two inputs or two outputs together' :
                  !sameType ? 'Connection types must match' :
                  !differentDevice ? 'Cannot connect device to itself' : 'Unknown'
        });
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
    if (!currentState) {
      return;
    }

    const timeDiff = Date.now() - (currentState.startTime || 0);
    const mouseMoveDist = Math.sqrt(
      Math.pow(e.clientX - (currentState.clickX || e.clientX), 2) +
      Math.pow(e.clientY - (currentState.clickY || e.clientY), 2)
    );

    // Quick click with minimal movement - this was just a click, not a drag
    if (timeDiff < 200 && mouseMoveDist < 10) {
      setConnectingState(null);
      connectingStateRef.current = null;
      setHoveredPortId(null);
      return;
    }

    console.log('Drag detected - hovered port:', currentState.hoveredPort);

    // Drag operation - show connection dialog
    if (currentState.hoveredPort) {
      const toPort = currentState.hoveredPort;
      const { fromPort } = currentState;
      
      // Validate connection is possible
      const validDirection = fromPort.isInput !== toPort.isInput;
      const sameType = fromPort.connectionType === toPort.connectionType;
      const differentDevice = fromPort.instanceId !== toPort.instanceId;
      
      if (!validDirection || !sameType || !differentDevice) {
        console.log('Cannot create connection - invalid port combination');
        setConnectingState(null);
        connectingStateRef.current = null;
        setHoveredPortId(null);
        return;
      }

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

      console.log('=== Connection Attempt ===');
      console.log('From:', fromId, 'To:', toId);
      console.log('Connection Type:', fromPort.connectionType);
      console.log('From Product:', canvasProducts.find(cp => cp.instanceId === fromId));
      console.log('To Product:', canvasProducts.find(cp => cp.instanceId === toId));

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
    const removedConnection = connections[index];
    setConnections(connections.filter((_, i) => i !== index));

    // Track activity
    if (currentProject?.id && removedConnection) {
      trackActivity(ActivityActions.REMOVED_CONNECTION, currentProject.id, currentProject.name, {
        connection_type: removedConnection.type
      });
    }
  };

  const clearCanvas = async () => {
    const proceed = await confirmDialog('This will clear the canvas. Any unsaved changes will be lost.', {
      title: 'Clear Canvas',
      type: 'danger',
      confirmText: 'Clear Canvas',
      cancelText: 'Cancel'
    });
    if (proceed) {
      setCanvasProducts([]);
      setConnections([]);
      setRooms([]);
      setSelectedProduct(null);
      setSelectedConnection(null);
      setSelectedRoom(null);
      setCurrentProject(null);
      localStorage.removeItem('av_canvas_temp_products');
      localStorage.removeItem('av_canvas_temp_connections');
      localStorage.removeItem('av_canvas_temp_rooms');
      localStorage.removeItem('av_canvas_temp_project_id');
      toast.success('Canvas cleared');
    }
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
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.05 : 0.05;
    setZoom(prev => Math.max(0.5, Math.min(2, prev + delta)));
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
      // Don't trigger space panning when typing in input fields
      const isInputField = e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable;
      if (e.code === 'Space' && !e.repeat && !isInputField) {
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

  // Card dimensions (must match CanvasProduct)
  const CARD_WIDTH = 320;
  const CARD_HEIGHT = 280;
  const PORT_DOT_SIZE = 20; // w-5 = 1.25rem = 20px
  const PORT_GAP = 12; // gap-3 = 0.75rem = 12px

  // Calculate port position in world coordinates (no DOM dependency)
  const getPortWorldPosition = (instanceId, connectionType, isOutput) => {
    const product = canvasProducts.find(cp => cp.instanceId === instanceId);
    if (!product) return null;

    // Get connection types for this product
    const defaultConnections = connectionsByCategory[product.product.category] || { inputs: [], outputs: [] };
    const hasDbConnections = (product.product.input_connections?.length > 0) || 
                              (product.product.output_connections?.length > 0);
    const connections = hasDbConnections ? {
      inputs: product.product.input_connections || [],
      outputs: product.product.output_connections || []
    } : defaultConnections;

    const types = isOutput ? connections.outputs : connections.inputs;
    const portIndex = types.findIndex(t => t.type === connectionType);
    
    if (portIndex === -1) return null;

    // Calculate vertical position based on port index
    const totalPorts = Math.min(types.length, 6);
    const totalHeight = (totalPorts - 1) * (PORT_DOT_SIZE + PORT_GAP);
    const startY = product.position.y + CARD_HEIGHT / 2 - totalHeight / 2;
    const portY = startY + portIndex * (PORT_DOT_SIZE + PORT_GAP);

    // X position: left edge for inputs, right edge for outputs
    const portX = isOutput 
      ? product.position.x + CARD_WIDTH + PORT_DOT_SIZE / 2
      : product.position.x - PORT_DOT_SIZE / 2;

    return { x: portX, y: portY };
  };

  const getConnectionPointPosition = (instanceId, connectionType, portName, isOutput) => {
    return getPortWorldPosition(instanceId, connectionType, isOutput);
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
                        onProductSelect={(product) => {
                          setSelectedProduct(product);
                          setSelectedCanvasProduct(null);
                          setSelectedConnection(null);
                          setPanelHistory(prev => {
                            const filtered = prev.filter(p => p !== 'productDetails');
                            return [...filtered.slice(-1), 'productDetails'];
                          });
                        }}
                      />

        <div className="flex-1 flex flex-col">
          <div className="bg-gray-900 border-b border-gray-800 px-6 py-4 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white">AV System Design</h1>
              <div className="flex items-center gap-3 mt-0.5">
                <p className="text-sm text-gray-400">
                  {currentProject ? (
                    <>Project: <span className="text-blue-400 font-medium">{currentProject.name}</span></>
                  ) : (
                    'Drag products to canvas and create connections'
                  )}
                </p>
                <CollaboratorIndicator 
                  projectId={currentProject?.id} 
                  currentUserEmail={currentUserEmail}
                />
              </div>
            </div>
            <div className="flex gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                                            variant="outline"
                                            className="bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700 hover:text-white hover:border-gray-500"
                                          >
                                            <FolderOpen className="w-4 h-4 mr-2" />
                                            Project
                                            <ChevronDown className="w-4 h-4 ml-2" />
                                          </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="bg-gray-800 border-gray-700">
                  <DropdownMenuItem 
                    onClick={() => setShowProjectManager(true)}
                    className="text-gray-300 hover:bg-gray-700 hover:text-white cursor-pointer"
                  >
                    <FolderOpen className="w-4 h-4 mr-2" />
                    Projects
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => {
                      if (canvasProducts.length === 0 && connections.length === 0) {
                        alert('Canvas is empty. Add some devices first.');
                        return;
                      }
                      setShowProjectManager(true);
                    }}
                    className="text-gray-300 hover:bg-gray-700 hover:text-white cursor-pointer"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    Save Canvas As...
                  </DropdownMenuItem>
                  {currentProject && (
                    <DropdownMenuItem 
                      onClick={async () => {
                        try {
                          markLocalChange();
                          await base44.entities.AVProject.update(currentProject.id, {
                            canvas_products: canvasProducts,
                            connections: connections
                          });
                          toast.success('Project saved successfully!');
                        } catch (error) {
                          toast.error('Failed to save project');
                        }
                      }}
                      className="text-gray-300 hover:bg-gray-700 hover:text-white cursor-pointer"
                    >
                      <Save className="w-4 h-4 mr-2" />
                      Save Progress
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem 
                    onClick={() => setShowProjectManager(true)}
                    className="text-gray-300 hover:bg-gray-700 hover:text-white cursor-pointer"
                  >
                    <FolderOpen className="w-4 h-4 mr-2" />
                    Load Project
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => setShowProjectManager(true)}
                    className="text-gray-300 hover:bg-gray-700 hover:text-white cursor-pointer"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Create New Project
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                                            variant="outline"
                                            className="bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700 hover:text-white hover:border-gray-500"
                                          >
                                            <Settings className="w-4 h-4 mr-2" />
                                            Tools
                                            <ChevronDown className="w-4 h-4 ml-2" />
                                          </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="bg-gray-800 border-gray-700">
                  <DropdownMenuItem 
                    onClick={() => window.location.href = createPageUrl("DeviceManager")}
                    className="text-gray-300 hover:bg-gray-700 hover:text-white cursor-pointer"
                  >
                    <Settings className="w-4 h-4 mr-2" />
                    Manage Devices
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                                            onClick={async () => {
                                              try {
                                                setImportProgress({ status: 'running', message: 'Searching for AV products...' });
                                                const { data } = await base44.functions.invoke('scrapeSnapAV');
                                                setImportProgress({ status: 'complete', imported: data.productsFound, skipped: data.skippedDuplicates || 0 });
                                                toast.success(`Imported ${data.productsFound} new products${data.skippedDuplicates ? `, skipped ${data.skippedDuplicates} duplicates` : ''}`);
                                                setTimeout(() => {
                                                  setImportProgress(null);
                                                  window.location.reload();
                                                }, 2000);
                                              } catch (error) {
                                                console.error('Import error:', error);
                                                const errorMsg = error.response?.data?.error || error.message;
                                                setImportProgress({ status: 'error', message: errorMsg });
                                                toast.error(`Failed to import products: ${errorMsg}`);
                                                setTimeout(() => setImportProgress(null), 5000);
                                              }
                                            }}
                                            disabled={importProgress?.status === 'running'}
                                            className="text-gray-300 hover:bg-gray-700 hover:text-white cursor-pointer"
                                          >
                                            <Plus className="w-4 h-4 mr-2" />
                                            {importProgress?.status === 'running' ? 'Importing...' : 'Import AV Products'}
                                          </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={async () => {
                      const proceed = await confirmDialog('This will search the web for actual connection ports for each product in your database. This may take a few minutes.', {
                        title: 'Enrich Connections',
                        type: 'info',
                        confirmText: 'Start Enrichment',
                        cancelText: 'Cancel'
                      });
                      if (!proceed) return;
                      try {
                        setEnrichmentProgress({ status: 'running', enriched: 0, total: products.length });
                        const { data } = await base44.functions.invoke('enrichProductConnections');
                        setEnrichmentProgress({ status: 'complete', enriched: data.enriched, total: data.total, failed: data.failed });
                        setTimeout(() => {
                          toast.success(`Successfully enriched ${data.enriched} products with real connection data!`);
                          window.location.reload();
                        }, 500);
                      } catch (error) {
                        console.error('Enrichment error:', error);
                        const errorMsg = error.response?.data?.error || error.message;
                        setEnrichmentProgress({ status: 'error', message: errorMsg });
                        toast.error(`Enrichment failed: ${errorMsg}`);
                        setTimeout(() => setEnrichmentProgress(null), 5000);
                      }
                    }}
                    disabled={enrichmentProgress?.status === 'running'}
                    className="text-gray-300 hover:bg-gray-700 hover:text-white cursor-pointer"
                  >
                    <Link2 className="w-4 h-4 mr-2" />
                    {enrichmentProgress?.status === 'running' ? 'Enriching...' : 'Enrich Connections'}
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={async () => {
                      if (canvasProducts.length === 0) {
                        toast.warning('Canvas is empty. Add some devices first.');
                        return;
                      }
                      try {
                        const response = await base44.functions.invoke('exportCanvasToPDF', {
                          canvasProducts,
                          connections,
                          projectName: currentProject?.name || 'AV-System-Design'
                        });

                        const blob = new Blob([response.data], { type: 'application/pdf' });
                        const url = window.URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `${currentProject?.name || 'AV-System-Design'}.pdf`;
                        document.body.appendChild(a);
                        a.click();
                        window.URL.revokeObjectURL(url);
                        a.remove();
                        toast.success('PDF exported successfully');
                      } catch (error) {
                        console.error('Export error:', error);
                        toast.error('Failed to export PDF');
                      }
                    }}
                    className="text-gray-300 hover:bg-gray-700 hover:text-white cursor-pointer"
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    Export to PDF
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={clearCanvas}
                    disabled={canvasProducts.length === 0}
                    className="text-gray-300 hover:bg-red-500/10 hover:text-red-400 cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Clear Canvas
                  </DropdownMenuItem>
                  </DropdownMenuContent>
                  </DropdownMenu>

              {/* Persistent Status Indicator */}
                                  {(enrichmentProgress?.status === 'running' || importProgress?.status === 'running') && (
                                    <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-500/20 border border-blue-500/40 rounded-lg">
                                      <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                                      <span className="text-xs text-blue-300 font-medium">
                                        {importProgress?.status === 'running' && 'Importing products...'}
                                        {enrichmentProgress?.status === 'running' && 'Enriching connections...'}
                                      </span>
                                    </div>
                                  )}
              <div className="flex items-center gap-1 bg-gray-800 border border-gray-700 rounded-lg px-2 py-1">
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
                                    onClick={() => setShowRoomManager(true)}
                                    className="bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700 hover:text-white hover:border-gray-500"
                                  >
                                    <Home className="w-4 h-4 mr-2" />
                                    Rooms ({rooms.length})
                                  </Button>
              <Link to={createPageUrl("Admin")}>
                <Button
                  variant="outline"
                  className="bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700 hover:text-white hover:border-gray-500"
                >
                  <Settings className="w-4 h-4" />
                </Button>
              </Link>
              <Link to={createPageUrl("account")}>
                <Button
                  variant="outline"
                  className="bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700 hover:text-white hover:border-gray-500"
                >
                  <User className="w-4 h-4" />
                </Button>
              </Link>
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
            onWheel={currentProject ? handleWheel : undefined}
            onMouseDown={currentProject ? handleMouseDown : undefined}
            className={`flex-1 relative overflow-auto bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 transition-colors ${
              snapshot.isDraggingOver && currentProject ? 'bg-blue-950/20' : ''
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

                {!currentProject && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-50">
                    <div className="text-center bg-gray-900/95 border border-gray-700 rounded-xl p-8 pointer-events-auto">
                      <div className="w-16 h-16 rounded-full bg-blue-500/20 flex items-center justify-center mx-auto mb-4">
                        <FolderOpen className="w-8 h-8 text-blue-400" />
                      </div>
                      <p className="text-white text-lg font-medium mb-2">
                        No Project Loaded
                      </p>
                      <p className="text-gray-400 text-sm mb-6">
                        Create a new project or load an existing one to start designing
                      </p>
                      <Button
                        onClick={() => setShowProjectManager(true)}
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        <FolderOpen className="w-4 h-4 mr-2" />
                        Open Project Manager
                      </Button>
                    </div>
                  </div>
                )}

                {currentProject && canvasProducts.length === 0 && !snapshot.isDraggingOver && (
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
                        networkInfo={ensureNetworkInfo(cp).networkInfo}
                        zoom={zoom}
                        onClick={() => {
                                                        setSelectedCanvasProduct(ensureNetworkInfo(cp));
                                                        setSelectedProduct(null);
                                                        setSelectedConnection(null);
                                                        setPanelHistory(prev => {
                                                          const filtered = prev.filter(p => p !== 'deviceConnections');
                                                          return [...filtered.slice(-1), 'deviceConnections'];
                                                        });
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
                        onTooltipChange={setPortTooltip}
                      />
                    );
                  })}
                </div>
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </div>

        {(() => {
                      // Determine which panels to show based on history
                      const showProductDetails = selectedProduct && !selectedConnection;
                      const showDeviceConnections = selectedCanvasProduct && !selectedConnection;

                      // Get last two panels from history for toggle behavior
                      const lastTwo = panelHistory.slice(-2);
                      const shouldShowRoomsWithOther = lastTwo.includes('rooms') && showRoomManager;

                      return (
                        <>
                          {showProductDetails && (!showDeviceConnections || lastTwo.includes('productDetails')) && (
                            <ProductDetailsPanel
                              product={selectedProduct}
                              onClose={() => {
                                setSelectedProduct(null);
                                setPanelHistory(prev => prev.filter(p => p !== 'productDetails'));
                              }}
                            />
                          )}

                          {showDeviceConnections && (
                            <DeviceConnectionsPanel
                              product={ensureNetworkInfo(selectedCanvasProduct)}
                              label={selectedCanvasProduct.label}
                              networkInfo={ensureNetworkInfo(selectedCanvasProduct).networkInfo}
                              activeConnections={connections}
                              allProducts={canvasProducts.map(ensureNetworkInfo)}
                              onClose={() => {
                                setSelectedCanvasProduct(null);
                                setPanelHistory(prev => prev.filter(p => p !== 'deviceConnections'));
                              }}
                              onHighlightConnections={setHighlightedConnections}
                              onNetworkInfoChange={(networkInfo) => handleNetworkInfoChange(selectedCanvasProduct.instanceId, networkInfo)}
                              onDeviceUpdate={(updatedProduct) => {
                                setCanvasProducts(prev => prev.map(cp => 
                                  cp.instanceId === selectedCanvasProduct.instanceId
                                    ? { ...cp, product: { ...cp.product, ...updatedProduct } }
                                    : cp
                                ));
                                setSelectedCanvasProduct(prev => ({
                                  ...prev,
                                  product: { ...prev.product, ...updatedProduct }
                                }));
                              }}
                            />
                          )}
                        </>
                      );
                    })()}

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
              ...ensureNetworkInfo(canvasProducts.find(cp => cp.instanceId === connectingFrom)).product,
              instanceId: connectingFrom,
              networkInfo: ensureNetworkInfo(canvasProducts.find(cp => cp.instanceId === connectingFrom)).networkInfo
            }}
            toProduct={{
              ...ensureNetworkInfo(canvasProducts.find(cp => cp.instanceId === connectingTo)).product,
              instanceId: connectingTo,
              networkInfo: ensureNetworkInfo(canvasProducts.find(cp => cp.instanceId === connectingTo)).networkInfo
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

        {showProjectManager && (
          <ProjectManager
            currentProject={currentProject}
            canvasProducts={canvasProducts}
            connections={connections}
            rooms={rooms}
            onProjectLoad={handleProjectLoad}
            onClose={() => setShowProjectManager(false)}
          />
        )}

        {showRoomManager && (
                      <RoomManager
                        rooms={rooms}
                        onAddRoom={handleAddRoom}
                        onDeleteRoom={handleDeleteRoom}
                        canvasProducts={canvasProducts}
                        onClose={() => setShowRoomManager(false)}
                        onDeviceClick={(device) => {
                          setSelectedCanvasProduct(ensureNetworkInfo(device));
                          setSelectedProduct(null);
                          setSelectedConnection(null);
                          setPanelHistory(['rooms', 'deviceConnections']);
                        }}
                        selectedRoom={selectedRoom}
                        onSelectRoom={setSelectedRoom}
                        onDeviceRoomChange={(instanceId, newRoom) => {
                                          setCanvasProducts(prev => prev.map(cp => 
                                            cp.instanceId === instanceId ? { ...cp, room: newRoom } : cp
                                          ));
                                        }}
                                        onReorderDevices={(draggedId, targetId, room) => {
                                          setCanvasProducts(prev => {
                                            const roomDevices = prev.filter(cp => cp.room === room);
                                            const otherDevices = prev.filter(cp => cp.room !== room);

                                            const draggedIndex = roomDevices.findIndex(cp => cp.instanceId === draggedId);
                                            const targetIndex = roomDevices.findIndex(cp => cp.instanceId === targetId);

                                            if (draggedIndex === -1 || targetIndex === -1) return prev;

                                            const [draggedItem] = roomDevices.splice(draggedIndex, 1);
                                            roomDevices.splice(targetIndex, 0, draggedItem);

                                            return [...otherDevices, ...roomDevices];
                                          });
                                        }}
                                      />
                    )}

        {pendingProductDrop && (
          <RoomSelectDialog
            rooms={rooms}
            productName={`${pendingProductDrop.product.brand} ${pendingProductDrop.product.model}`}
            onSelect={(room) => {
              addProductToCanvas(pendingProductDrop.product, pendingProductDrop.position, room);
              setPendingProductDrop(null);
            }}
            onCancel={() => setPendingProductDrop(null)}
            onCreateRoom={handleAddRoom}
          />
        )}
        {/* Port Tooltip - rendered outside zoomed canvas */}
        {portTooltip && portTooltip.element && (() => {
          const rect = portTooltip.element.getBoundingClientRect();
          return (
            <div 
              className="fixed z-[9999] pointer-events-none px-3 py-2 rounded-lg shadow-lg border-2 text-xs font-medium whitespace-nowrap"
              style={{
                left: rect.left + rect.width / 2,
                top: rect.top - 8,
                backgroundColor: portTooltip.color,
                borderColor: portTooltip.color,
                color: '#000',
                transform: 'translate(-50%, -100%)',
                boxShadow: `0 4px 12px ${portTooltip.color}40`
              }}
            >
              <div className="flex items-center gap-2">
                <span className="font-semibold">{portTooltip.type}</span>
                <span className="opacity-50">•</span>
                <span className="opacity-80">{portTooltip.isInput ? 'Input' : 'Output'}</span>
                <span className="opacity-50">•</span>
                <span className="opacity-80">{portTooltip.portCount} port{portTooltip.portCount > 1 ? 's' : ''}</span>
              </div>
              <div 
                className="absolute left-1/2 -translate-x-1/2 bottom-0 translate-y-full w-0 h-0"
                style={{
                  borderLeft: '6px solid transparent',
                  borderRight: '6px solid transparent',
                  borderTop: `6px solid ${portTooltip.color}`
                }}
              />
            </div>
          );
        })()}
        </div>
        </DragDropContext>
        );
        }

        export default function AVCanvas() {
        return (
        <ToastProvider>
        <ConfirmProvider>
        <AVCanvasContent />
        </ConfirmProvider>
        </ToastProvider>
        );
        }