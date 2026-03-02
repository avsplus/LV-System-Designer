import React, { useState, useRef, useEffect, useCallback } from 'react';
import { appClient } from "@/api/appClient";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { DragDropContext, Droppable } from '@hello-pangea/dnd';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trash2, Download, Plus, ZoomIn, ZoomOut, Maximize2, Link2, Settings, FolderOpen, Save, ChevronDown, FileText, User, Home, Users, X, Crop, Layers, Wrench, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { useMediaQuery } from "../components/mobile/useMediaQuery";
import FloorplanManager from "../components/canvas/FloorplanManager";
import { toast } from "sonner";
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
import ExportDialogs from "../components/canvas/ExportDialogs";
import AnnotationToolbar from "../components/canvas/AnnotationToolbar";
import AnnotationPanelRouter from "../components/canvas/AnnotationPanelRouter";
import AnnotationLayer from "../components/canvas/AnnotationLayer";
import CanvasConnectionLayer from "../components/canvas/CanvasConnectionLayer";
import useCanvasAnnotations from "../components/canvas/hooks/useCanvasAnnotations";

import { trackActivity, ActivityActions } from "../components/activity/activityTracker";
import { usePermissions } from "../components/auth/usePermissions";
import { ROLES } from "../components/auth/permissions";
import { useSettings } from "../components/settings/SettingsContext";
import useCanvasZoomPan from "../components/canvas/hooks/useCanvasZoomPan";
import useProjectData, { ensureNetworkInfo } from "../components/canvas/hooks/useProjectData";
import useResponsiveCanvas from "../components/canvas/hooks/useResponsiveCanvas";
import { CONNECTIONS_BY_CATEGORY } from "../components/canvas/constants";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

function AVCanvasContent() {
    const queryClient = useQueryClient();
    const { isAtLeast, loading: permLoading } = usePermissions();
    const { settings: orgSettings } = useSettings();
    const isMobile = !useMediaQuery('(min-width: 768px)');

    // Responsive canvas hook
    const { 
      viewport, 
      breakpoint, 
      dimensions: responsiveDimensions, 
      layout,
      handleTouchStart: handlePinchStart,
      handleTouchMove: handlePinchMove,
      handleTouchEnd: handlePinchEnd
    } = useResponsiveCanvas();

    // Zoom and pan state from hook
    const {
      zoom, setZoom, pan, setPan, isPanning, spacePressed,
      handleZoomIn, handleZoomOut, handleZoomReset, handleWheel, handlePanStart,
      handleTouchStart: handleCanvasTouchStartPan,
      handleTouchMove: handleCanvasTouchMovePan,
      handleTouchEnd: handleCanvasTouchEndPan
    } = useCanvasZoomPan(orgSettings?.default_zoom || 1);

  // Project and current user state
  const [currentProject, setCurrentProject] = useState(null);
  const [currentUserEmail, setCurrentUserEmail] = useState(null);

  // Get current user
  useEffect(() => {
    appClient.getMe().then(({ user }) => setCurrentUserEmail(user.email)).catch(() => {});
  }, []);

  // UI state
  const [showProjectManager, setShowProjectManager] = useState(false);
  const [showRoomManager, setShowRoomManager] = useState(false);

  const [pendingProductDrop, setPendingProductDrop] = useState(null);
  const [connectingFrom, setConnectingFrom] = useState(null);
  const [connectingTo, setConnectingTo] = useState(null);
  const [pendingConnection, setPendingConnection] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [selectedCanvasProduct, setSelectedCanvasProduct] = useState(null);
  const [selectedConnection, setSelectedConnection] = useState(null);
  const [panelHistory, setPanelHistory] = useState([]);
  const [highlightedConnections, setHighlightedConnections] = useState([]);
  const [hoveredConnectionIndex, setHoveredConnectionIndex] = useState(null);
  const [dragMousePosition, setDragMousePosition] = useState(null);
  const [connectingState, setConnectingState] = useState(null);
  const [hoveredPortId, setHoveredPortId] = useState(null);
  const [portTooltip, setPortTooltip] = useState(null);
  const [enrichmentProgress, setEnrichmentProgress] = useState(null);
  const [importProgress, setImportProgress] = useState(null);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportEngine, setExportEngine] = useState('jspdf');
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [showEnrichDialog, setShowEnrichDialog] = useState(false);
  const [pendingSymbolLink, setPendingSymbolLink] = useState(null);

  const [previewManual, setPreviewManual] = useState(null);
  const [showFloorplanManager, setShowFloorplanManager] = useState(false);
  const [draggingFloorplan, setDraggingFloorplan] = useState(null);
  const [floorplanDragStart, setFloorplanDragStart] = useState(null);
  const [floorplanDragOffset, setFloorplanDragOffset] = useState({ x: 0, y: 0 });
  const [selectedFloorplanId, setSelectedFloorplanId] = useState(null);
  const [resizingFloorplan, setResizingFloorplan] = useState(null);
  const [resizeOffset, setResizeOffset] = useState({ scale: 1, position: { x: 0, y: 0 } });
  const resizingRef = useRef(null);
  const [hoveredDeviceId, setHoveredDeviceId] = useState(null);
  const [drawingArrow, setDrawingArrow] = useState(null);
  const [hoveredArrow, setHoveredArrow] = useState(null);
  const [showSidebar, setShowSidebar] = useState(true);

  // Create markLocalChange ref that can be set later
  const markLocalChangeRef = useRef(() => {});
  const updateKnownTimestampRef = useRef(() => {});

  // Project data from hook - manages all project state including floorplans
  const handleSaveComplete = useCallback((updatedProject) => {
    // Update sync timestamp IMMEDIATELY to prevent race condition
    if (updateKnownTimestampRef.current) {
      updateKnownTimestampRef.current(updatedProject.updated_date);
    }
    setCurrentProject(updatedProject);
    console.log('💾 Save complete - updated project timestamp to:', updatedProject.updated_date);
  }, []);
  
  const projectData = useProjectData(currentProject, currentUserEmail, markLocalChangeRef.current, handleSaveComplete);

  const {
    rooms, canvasProducts, connections, setConnections,
    floorplans, setFloorplans,
    arrows, setArrows,
    annotations, setAnnotations,
    loadProject, handleAddRoom, handleDeleteRoom, handleRenameRoom, addProductToCanvas,
    handlePositionChange, handleNetworkInfoChange, handleRemoveProduct,
    handleRemoveConnection, clearCanvas: clearCanvasData, handleProjectUpdatedFromSync
  } = projectData;

  // Project sync - after projectData so we can use handleProjectUpdatedFromSync
  const handleProjectUpdatedFromSyncCallback = useCallback((updatedProject) => {
    console.log('🔄 Applying sync update from collaborator');
    setCurrentProject(updatedProject);
    handleProjectUpdatedFromSync(updatedProject);
  }, [handleProjectUpdatedFromSync]);

  const { markLocalChange, updateKnownTimestamp } = useProjectSync({
    currentProject,
    currentUserEmail,
    onProjectUpdated: handleProjectUpdatedFromSyncCallback
  });

  // Update the refs so callbacks can use them
  useEffect(() => {
    markLocalChangeRef.current = markLocalChange;
    updateKnownTimestampRef.current = updateKnownTimestamp;
  }, [markLocalChange, updateKnownTimestamp]);



  const canvasRef = useRef(null);
  const portRefs = useRef(new Map());
  const connectingStateRef = useRef(null);
  const lastMiddleClickRef = useRef(0);
  const lastTapRef = useRef(0);
  const annotationMouseDownRef = useRef(null);
  const isSidebarDragActiveRef = useRef(false);
  const PORT_HIT_RADIUS = 50;
  const CARD_WIDTH = 320, CARD_HEIGHT = 280, PORT_DOT_SIZE = 20, PORT_GAP = 12;
  const SYMBOL_SIZE = 120;
  const connectionTypeColors = {
    HDMI: '#E74C3C',
    Optical: '#2A7FDB',
    'Optical/TOSLINK': '#2A7FDB',
    RCA: '#FFB300',
    XLR: '#1ABC9C',
    'Speaker Wire': '#8E5C2C',
    Ethernet: '#27AE60',
    USB: '#2A7FDB',
    Coaxial: '#2A7FDB',
    '3.5mm Jack': '#F4D03F',
    Component: '#E74C3C',
    Composite: '#E74C3C',
    VGA: '#E74C3C',
    RS232: '#7F8C8D',
    HDBaseT: '#E91E63',
    Control: '#7F8C8D',
    Subwoofer: '#8E5C2C',
    Wireless: '#27AE60',
    IR: '#7F8C8D'
  };

  const { data: products = [], isLoading } = useQuery({
    queryKey: ['avProducts'],
    queryFn: () => appClient.listProducts({ include_global: true }),
  });

  // Project load handler
  const handleProjectLoad = (project) => {
    setCurrentProject(project);
    loadProject(project);
    setSelectedProduct(null);
    setSelectedConnection(null);
    setSelectedCanvasProduct(null);
  };



  const onDragStart = (start) => {
    isSidebarDragActiveRef.current = start?.source?.droppableId === 'sidebar';
  };

  const onDragEnd = (result) => {
    isSidebarDragActiveRef.current = false;
    const { source, destination, draggableId } = result;

    // Ignore drag-drop operations if we're dragging an annotation
    if (annotationMouseDownRef.current !== null || annotationDragInitial !== null) {
      setDragMousePosition(null);
      return;
    }

    if (!destination) {
      setDragMousePosition(null);
      return;
    }

    if (source.droppableId === 'sidebar' && destination.droppableId === 'canvas') {
      // If no project is loaded, force user to create/select one first
      if (!currentProject) {
        setShowProjectManager(true);
        toast.warning('Please create or select a project first');
        setDragMousePosition(null);
        return;
      }
      
      const product = products.find(p => p.id === draggableId);
      if (product && dragMousePosition) {
        const canvasRect = canvasRef.current.getBoundingClientRect();
        const x = (dragMousePosition.x - canvasRect.left - pan.x) / zoom - 128;
        const y = (dragMousePosition.y - canvasRect.top - pan.y) / zoom - 100;
        setPendingProductDrop({ product, position: { x, y } });
      }
    }
    setDragMousePosition(null);
  };

  const handleRemoveProductWithSelection = (instanceId) => {
    // Prevent deletion of demo products
    const product = canvasProducts.find(cp => cp.instanceId === instanceId);
    if (product?.product?.id?.startsWith('demo-')) {
      toast.warning('Demo products cannot be deleted');
      return;
    }
    
    if (selectedCanvasProduct?.instanceId === instanceId) {
      setSelectedCanvasProduct(null);
    }
    handleRemoveProduct(instanceId);
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

  const isSymbolEndpointId = (id) => typeof id === 'string' && id.startsWith('ann:');

  const getAnnotationByEndpointId = (endpointId) => {
    if (!isSymbolEndpointId(endpointId)) return null;
    const annId = endpointId.slice(4);
    return annotations.find((a) => a.id === annId) || null;
  };

  const isNetworkInfrastructureDevice = (device) => {
    const category = device?.product?.category;
    return ['network_switches', 'routers'].includes(category);
  };

  const countSymbolEthernetConnections = (symbolEndpointId) => {
    const all = connections.filter(
      (c) => c.type === 'Ethernet' && (c.from === symbolEndpointId || c.to === symbolEndpointId)
    );
    const uplinks = all.filter((c) => c.to === symbolEndpointId);
    const downstream = all.filter((c) => c.from === symbolEndpointId);
    return { all, uplinks, downstream };
  };

  const getSymbolPortOptions = (symbolEndpointId, mode) => {
    const symbol = getAnnotationByEndpointId(symbolEndpointId);
    const portsCount = Math.max(1, Number(symbol?.specs?.ports || 1));
    const allPorts = Array.from({ length: portsCount }, (_, i) => `Port ${i + 1}`);

    const uplinkPorts = new Set(
      connections
        .filter((c) => c.type === "Ethernet" && c.to === symbolEndpointId)
        .map((c) => c.toPort)
        .filter((p) => /^Port \d+$/i.test(p || ""))
    );
    const downstreamPorts = new Set(
      connections
        .filter((c) => c.type === "Ethernet" && c.from === symbolEndpointId)
        .map((c) => c.fromPort)
        .filter((p) => /^Port \d+$/i.test(p || ""))
    );

    if (mode === "uplink") {
      return allPorts.filter((p) => !uplinkPorts.has(p));
    }
    if (mode === "downstream") {
      return allPorts.filter((p) => uplinkPorts.has(p) && !downstreamPorts.has(p));
    }
    return [];
  };

  const getDevicePortOptions = (instanceId, connectionType, direction) => {
    const cp = canvasProducts.find((p) => p.instanceId === instanceId);
    if (!cp) return [];

    const product = cp.product || {};
    const normalizePortLabel = (p) => {
      if (!p) return null;
      if (typeof p === 'string') return p;
      return p.label || p.id || null;
    };

    const defaultConns = CONNECTIONS_BY_CATEGORY[product.category] || { inputs: [], outputs: [] };
    const hasDb = (product.input_connections?.length > 0) || (product.output_connections?.length > 0);
    const conns = hasDb
      ? {
          inputs: (product.input_connections || []).map((c) => ({ type: c.type, ports: (c.ports || []).map(normalizePortLabel).filter(Boolean) })),
          outputs: (product.output_connections || []).map((c) => ({ type: c.type, ports: (c.ports || []).map(normalizePortLabel).filter(Boolean) }))
        }
      : {
          inputs: (defaultConns.inputs || []).map((c) => ({ type: c.type, ports: (c.ports || []).map(normalizePortLabel).filter(Boolean) })),
          outputs: (defaultConns.outputs || []).map((c) => ({ type: c.type, ports: (c.ports || []).map(normalizePortLabel).filter(Boolean) }))
        };

    const typeGroup = (direction === 'output' ? conns.outputs : conns.inputs).find((c) => c.type === connectionType);
    const declaredPorts = (typeGroup?.ports || []).filter(Boolean);
    const fallbackPorts = declaredPorts.length > 0 ? declaredPorts : [connectionType];

    const used = new Set(
      connections
        .filter((c) => c.type === connectionType)
        .map((c) => {
          if (direction === 'output' && c.from === instanceId) return c.fromPort;
          if (direction === 'input' && c.to === instanceId) return c.toPort;
          return null;
        })
        .filter(Boolean)
    );

    const available = fallbackPorts.filter((p) => !used.has(p));
    return available;
  };

  const validateConnection = ({ fromId, toId, connectionType, fromKind = 'device', toKind = 'device' }) => {
    const errors = [];
    const warnings = [];

    const rawFromProduct = fromKind === 'device' ? canvasProducts.find(cp => cp.instanceId === fromId) : null;
    const rawToProduct = toKind === 'device' ? canvasProducts.find(cp => cp.instanceId === toId) : null;

    if (fromKind === 'device' && !rawFromProduct) {
      errors.push("Invalid source device");
    }
    if (toKind === 'device' && !rawToProduct) {
      errors.push("Invalid destination device");
    }
    if (errors.length > 0) {
      return { valid: false, errors, warnings };
    }

    const fromProduct = rawFromProduct ? ensureNetworkInfo(rawFromProduct) : null;
    const toProduct = rawToProduct ? ensureNetworkInfo(rawToProduct) : null;
    const fromNetworkInfo = fromProduct?.networkInfo;
    const toNetworkInfo = toProduct?.networkInfo;

    // New model: switch/router -> data outlet symbol -> endpoint device
    if (fromKind === 'symbol' && toKind === 'symbol') {
      errors.push("Direct symbol-to-symbol links are not allowed");
      return { valid: false, errors, warnings };
    }

    if (fromKind === 'device' && toKind === 'symbol') {
      if (connectionType !== 'Ethernet') {
        errors.push("Data outlet uplinks must use Ethernet");
      }
      if (!isNetworkInfrastructureDevice(fromProduct)) {
        errors.push("Only network switches/routers can feed a data outlet");
      }
      const targetSymbol = getAnnotationByEndpointId(toId);
      const targetCapacity = Math.max(1, Number(targetSymbol?.specs?.ports || 1));
      const targetUplinks = connections.filter(
        (c) => c.type === 'Ethernet' && c.to === toId
      ).length;
      if (targetUplinks >= targetCapacity) {
        errors.push(`Data outlet reached configured limit (${targetCapacity} ports)`);
      }
    }

    if (fromKind === 'symbol' && toKind === 'device') {
      if (connectionType !== 'Ethernet') {
        errors.push("Data outlet outputs must use Ethernet");
      }
      const sourceSymbol = getAnnotationByEndpointId(fromId);
      if (!sourceSymbol) {
        errors.push("Source data outlet symbol not found");
        return { valid: false, errors, warnings };
      }

      const { uplinks, downstream } = countSymbolEthernetConnections(fromId);
      const outletCapacity = Math.max(1, Number(sourceSymbol?.specs?.ports || 1));
      if (uplinks.length === 0) {
        errors.push("This data outlet has no uplink from a switch/router");
      }
      if (downstream.length >= outletCapacity) {
        errors.push("No available data outlet outputs remaining");
      }
    }

    if (errors.length > 0) {
      return { valid: false, errors, warnings };
    }

    if (connectionType === 'Ethernet') {
      const fromNeedsNetwork = fromProduct && ['televisions', 'projectors', 'video_distribution', 'matrix_switchers', 
                                'audio_streamers', 'media_streamers', 'soundbars', 'multizone_amps', 
                                'surround_processors', 'av_receivers'].includes(fromProduct.product.category);
      const toNeedsNetwork = toProduct && ['televisions', 'projectors', 'video_distribution', 'matrix_switchers', 
                              'audio_streamers', 'media_streamers', 'soundbars', 'multizone_amps', 
                              'surround_processors', 'av_receivers'].includes(toProduct.product.category);

      const fromIp = fromNetworkInfo?.ip;
      const toIp = toNetworkInfo?.ip;

      if (fromNeedsNetwork && (!fromIp || fromIp === '000.000.000.000' || fromIp === '')) {
        warnings.push(`${fromProduct.label || fromProduct.product.brand} requires network configuration (IP address)`);
      }
      if (toNeedsNetwork && (!toIp || toIp === '000.000.000.000' || toIp === '')) {
        warnings.push(`${toProduct.label || toProduct.product.brand} requires network configuration (IP address)`);
      }
    }
    
    const duplicateConnection = connections.find(
      (c) => c.from === fromId && c.to === toId && c.type === connectionType
    );
    if (duplicateConnection) {
      warnings.push("A connection of this type already exists between these devices");
    }
    
    return { valid: errors.length === 0, errors, warnings };
  };

  const handleConnectionTypeSelect = async (connectionData, endpointsOverride = null) => {
    const fromId = endpointsOverride?.fromId ?? connectingFrom;
    const toId = endpointsOverride?.toId ?? connectingTo;
    const fromKind = endpointsOverride?.fromKind ?? 'device';
    const toKind = endpointsOverride?.toKind ?? 'device';

    const validation = validateConnection({
      fromId,
      toId,
      connectionType: connectionData.type,
      fromKind,
      toKind
    });
    
    if (!validation.valid) {
      toast.error(`Cannot create connection: ${validation.errors.join(', ')}`);
      setConnectingFrom(null);
      setConnectingTo(null);
      setPendingConnection(null);
      return;
    }
    
    if (validation.warnings.length > 0) {
      const proceed = window.confirm(`Connection Warning\n\n${validation.warnings.join('\n\n')}\n\nContinue anyway?`);
      if (!proceed) {
        setConnectingFrom(null);
        setConnectingTo(null);
        setPendingConnection(null);
        return;
      }
    }
    
    const connectionCategories = {
      'HDMI': 'V', 'HDBaseT': 'V', 'Component': 'V', 'Composite': 'V', 'VGA': 'V',
      'Optical': 'A', 'Optical/TOSLINK': 'A', 'RCA': 'A', 'XLR': 'A', 'Speaker Wire': 'A',
      'Coaxial': 'A', 'Subwoofer': 'A', '3.5mm Jack': 'A', 'Wireless': 'A',
      'Ethernet': 'N', 'USB': 'N', 'RS232': 'C', 'Control': 'C', 'Power': 'P'
    };
    
    let wireId = null;
    let parentWireId = connectionData.parentWireId || null;

    if (parentWireId) {
      const childNums = connections
        .filter((c) => c.parentWireId === parentWireId)
        .map((c) => {
          const match = String(c.wireId || '').match(new RegExp(`^${parentWireId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}-([0-9]+)$`));
          return match ? Number(match[1]) : null;
        })
        .filter((n) => Number.isFinite(n));
      const nextChild = (childNums.length ? Math.max(...childNums) : 0) + 1;
      wireId = `${parentWireId}-${nextChild}`;
    } else {
      const prefix = connectionCategories[connectionData.type] || 'W';
      const existingOfType = connections.filter(c => {
        const cPrefix = connectionCategories[c.type] || 'W';
        return cPrefix === prefix;
      }).length;
      wireId = `${prefix}${String(existingOfType + 1).padStart(3, '0')}`;
    }
    
    setConnections([...connections, { 
      from: fromId, 
      to: toId,
      type: connectionData.type,
      fromPort: connectionData.fromPort,
      toPort: connectionData.toPort,
      wireId: wireId,
      wireSpec: connectionData.wireSpec || null,
      fromKind,
      toKind,
      parentWireId
    }]);

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
    setShowFloorplanManager(false);
    setShowRoomManager(false);
    setSelectedFloorplanId(null);
  };

  const handleConnectionHover = (index) => {
    setHoveredConnectionIndex(index);
  };

  const handleConnectionLeave = () => {
    setHoveredConnectionIndex(null);
  };

  const handlePortClick = (instanceId, connectionType, portName, isInput) => {
    const connectionIndex = connections.findIndex(conn => {
      if (conn.type !== connectionType) return false;
      
      if (isInput) {
        if (conn.to !== instanceId) return false;
        if (portName === 'type') return true;
        const connPort = conn.toPort;
        if (!connPort) return false;
        const pNorm = portName.toLowerCase().replace(/[-_]/g, '');
        const cNorm = connPort.toLowerCase().replace(/[-_]/g, '');
        return connPort === portName || pNorm.includes(cNorm) || cNorm.includes(pNorm);
      } else {
        if (conn.from !== instanceId) return false;
        if (portName === 'type') return true;
        const connPort = conn.fromPort;
        if (!connPort) return false;
        const pNorm = portName.toLowerCase().replace(/[-_]/g, '');
        const cNorm = connPort.toLowerCase().replace(/[-_]/g, '');
        return connPort === portName || pNorm.includes(cNorm) || cNorm.includes(pNorm);
      }
    });

    if (connectionIndex !== -1) {
      handleConnectionClick(connections[connectionIndex], connectionIndex);
    } else {
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

  const getPortId = (instanceId, connectionType, portName, isInput) => {
    return `${instanceId}:${isInput ? 'in' : 'out'}:${connectionType}:${portName}`;
  };

  const registerPort = (portId, element, instanceId, connectionType, portName, isInput, endpointKind = 'device', annotationId = null) => {
    if (element) {
      portRefs.current.set(portId, { element, instanceId, connectionType, portName, isInput, endpointKind, annotationId });
    } else {
      portRefs.current.delete(portId);
    }
  };
  
  const hitTestPort = (mouseX, mouseY) => {
    const canvasRect = canvasRef.current?.getBoundingClientRect();
    if (!canvasRect) return null;
    
    let closestPort = null;
    let closestDistance = PORT_HIT_RADIUS;
    
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
        closestPort = { portId, ...portData, position, distance };
      }
    }
    
    return closestPort;
  };

  const getPortPosition = (portElement) => {
    const canvasRect = canvasRef.current?.getBoundingClientRect();
    if (!canvasRect || !portElement) return null;

    const portRect = portElement.getBoundingClientRect();
    return {
      x: (portRect.left + portRect.width / 2 - canvasRect.left - pan.x) / zoom,
      y: (portRect.top + portRect.height / 2 - canvasRect.top - pan.y) / zoom
    };
  };

  const handlePortMouseDown = (instanceId, connectionType, portName, isInput, portElement, endpointKind = 'device', annotationId = null) => {
    const startPos = getPortPosition(portElement);
    if (!startPos) return;

    const newState = {
      mode: 'connecting',
      fromPort: { instanceId, connectionType, portName, isInput, endpointKind, annotationId },
      startPos,
      mousePos: startPos,
      startTime: Date.now(),
      clickX: window.event?.clientX,
      clickY: window.event?.clientY
    };

    setConnectingState(newState);
    connectingStateRef.current = newState;
  };

  const isNetworkDevice = (device) => {
    return device && ['network_switches', 'routers'].includes(device.product.category);
  };

  const handleGlobalMouseMove = React.useCallback((e) => {
    const currentState = connectingStateRef.current;
    if (!currentState) return;

    const canvasRect = canvasRef.current?.getBoundingClientRect();
    if (!canvasRect) return;

    const hitPort = hitTestPort(e.clientX, e.clientY);
    
    let validHitPort = null;
    if (hitPort) {
      const fromDevice = canvasProducts.find(cp => cp.instanceId === currentState.fromPort.instanceId);
      const toDevice = canvasProducts.find(cp => cp.instanceId === hitPort.instanceId);
      const fromIsNetworkDevice = isNetworkDevice(fromDevice);
      const toIsNetworkDevice = isNetworkDevice(toDevice);

      // Network devices with same connection type allow any direction
      const isNetworkEthernet = currentState.fromPort.connectionType === 'Ethernet' && hitPort.connectionType === 'Ethernet' && 
                               fromIsNetworkDevice && toIsNetworkDevice;
      const validDirection = isNetworkEthernet || 
                            currentState.fromPort.isInput !== hitPort.isInput;
      const sameType = currentState.fromPort.connectionType === hitPort.connectionType;
      const differentDevice = currentState.fromPort.instanceId !== hitPort.instanceId;

      if (validDirection && sameType && differentDevice) {
        validHitPort = hitPort;
      }
    }

    setHoveredPortId(validHitPort ? validHitPort.portId : null);

    const mousePos = validHitPort 
      ? validHitPort.position
      : {
          x: (e.clientX - canvasRect.left - pan.x) / zoom,
          y: (e.clientY - canvasRect.top - pan.y) / zoom
        };

    const newState = { ...currentState, mousePos, hoveredPort: validHitPort };
    setConnectingState(newState);
    connectingStateRef.current = newState;
  }, [zoom, pan, canvasProducts]);

  const handleGlobalMouseUp = React.useCallback((e) => {
    const currentState = connectingStateRef.current;
    if (!currentState) return;

    const timeDiff = Date.now() - (currentState.startTime || 0);
    const mouseMoveDist = Math.sqrt(
      Math.pow(e.clientX - (currentState.clickX || e.clientX), 2) +
      Math.pow(e.clientY - (currentState.clickY || e.clientY), 2)
    );

    if (timeDiff < 200 && mouseMoveDist < 10) {
      setConnectingState(null);
      connectingStateRef.current = null;
      setHoveredPortId(null);
      return;
    }

    if (currentState.hoveredPort) {
      const toPort = currentState.hoveredPort;
      const { fromPort } = currentState;
      
      const fromDevice = canvasProducts.find(cp => cp.instanceId === fromPort.instanceId);
      const toDevice = canvasProducts.find(cp => cp.instanceId === toPort.instanceId);
      const fromIsNetworkDevice = isNetworkDevice(fromDevice);
      const toIsNetworkDevice = isNetworkDevice(toDevice);
      
      // Network devices with same connection type allow any direction
      const isNetworkEthernet = fromPort.connectionType === 'Ethernet' && toPort.connectionType === 'Ethernet' && 
                               fromIsNetworkDevice && toIsNetworkDevice;
      const validDirection = isNetworkEthernet || 
                            fromPort.isInput !== toPort.isInput;
      const sameType = fromPort.connectionType === toPort.connectionType;
      const differentDevice = fromPort.instanceId !== toPort.instanceId;
      
      if (!validDirection || !sameType || !differentDevice) {
        setConnectingState(null);
        connectingStateRef.current = null;
        setHoveredPortId(null);
        return;
      }

      const resolvedFromPort = fromPort.isInput ? toPort : fromPort;
      const resolvedToPort = fromPort.isInput ? fromPort : toPort;
      const fromId = resolvedFromPort.instanceId;
      const toId = resolvedToPort.instanceId;
      const fromKind = resolvedFromPort.endpointKind || 'device';
      const toKind = resolvedToPort.endpointKind || 'device';

      const targetDevice = canvasProducts.find(cp => cp.instanceId === toId);
      const isEndpointDevice = targetDevice && ['speakers', 'subwoofers'].includes(targetDevice.product.category);

      if (fromKind === 'device' && toKind === 'device' && isEndpointDevice) {
        const existingConnection = connections.find(c => c.to === toId);
        if (existingConnection) {
          setConnectingState(null);
          connectingStateRef.current = null;
          setHoveredPortId(null);
          return;
        }
      }

      if (fromKind === 'symbol' || toKind === 'symbol') {
        const mode = toKind === 'symbol' ? 'uplink' : 'downstream';
        const symbolEndpointId = mode === 'uplink' ? toId : fromId;
        const portOptions = getSymbolPortOptions(symbolEndpointId, mode);
        const deviceId = mode === 'uplink' ? fromId : toId;
        const deviceDirection = mode === 'uplink' ? 'output' : 'input';
        const devicePortOptions = getDevicePortOptions(deviceId, 'Ethernet', deviceDirection);

        if (portOptions.length === 0 || devicePortOptions.length === 0) {
          toast.error(
            portOptions.length === 0
              ? (mode === 'uplink'
                  ? 'No available data outlet ports for uplink'
                  : 'No fed data outlet ports available for endpoint connection')
              : `No available Ethernet ${deviceDirection} ports on selected device`
          );
        } else {
          setPendingSymbolLink({
            fromId,
            toId,
            fromKind,
            toKind,
            mode,
            symbolEndpointId,
            connectionType: 'Ethernet',
            fromPortName: resolvedFromPort.portName || 'Ethernet',
            toPortName: resolvedToPort.portName || 'Ethernet',
            portOptions,
            selectedPort: portOptions[0],
            devicePortOptions,
            selectedDevicePort: devicePortOptions[0]
          });
        }
      } else {
        setPendingConnection({
          fromId,
          toId,
          connectionType: fromPort.connectionType,
          fromPortName: resolvedFromPort.portName || fromPort.connectionType,
          toPortName: resolvedToPort.portName || fromPort.connectionType
        });
        setConnectingFrom(fromId);
        setConnectingTo(toId);
      }
    }

    setConnectingState(null);
    connectingStateRef.current = null;
    setHoveredPortId(null);
  }, [canvasProducts, connections, handleConnectionTypeSelect, getSymbolPortOptions, getDevicePortOptions]);

  const handleDeleteConnection = () => {
    if (selectedConnection) {
      handleRemoveConnection(selectedConnection.index);
      setSelectedConnection(null);
    }
  };

  const clearCanvas = async () => {
    const proceed = window.confirm('This will clear the canvas. Any unsaved changes will be lost.');
    if (proceed) {
      clearCanvasData();
      setSelectedProduct(null);
      setSelectedConnection(null);
      setCurrentProject(null);
      toast.success('Canvas cleared');
    }
  };

  const handleFloorplanMouseDown = (e, floorplanId) => {
      // Don't allow floorplan dragging on mobile - only canvas pan/zoom
      if (isMobile) return;

      // If an annotation drawing tool is active, handle annotation drawing instead
      if (activeTool !== 'select' && activeTool !== 'text' && activeTool !== 'snapshot') {
        handleAnnotationMouseDown(e);
        return;
      }

      // Only allow left click (button 0) to drag floorplans
      if (e.button !== 0) return;

      // Don't start dragging if clicking on a resize handle
      if (e.target.closest('[data-resize-handle]')) {
        return;
      }

      const floorplan = floorplans.find(fp => fp.id === floorplanId);
      if (!floorplan || floorplan.locked) return;

      e.preventDefault();
      e.stopPropagation();

      setSelectedFloorplanId(floorplanId);

      const canvasRect = canvasRef.current.getBoundingClientRect();
      const mouseWorldX = (e.clientX - canvasRect.left - pan.x) / zoom;
      const mouseWorldY = (e.clientY - canvasRect.top - pan.y) / zoom;

      const currentPos = { x: floorplan.position?.x || 0, y: floorplan.position?.y || 0 };

      setDraggingFloorplan(floorplanId);
      setFloorplanDragStart({
        offsetX: mouseWorldX - currentPos.x,
        offsetY: mouseWorldY - currentPos.y,
        startPos: currentPos,
        startMouseX: e.clientX,
        startMouseY: e.clientY
      });
      // Initialize drag offset to current position to prevent jump
      setFloorplanDragOffset(currentPos);
    };

  const handleFloorplanClick = (e, floorplanId) => {
    // Only open panel if this was a click, not a drag
    if (floorplanDragStart && (
      Math.abs(e.clientX - floorplanDragStart.startMouseX) > 5 ||
      Math.abs(e.clientY - floorplanDragStart.startMouseY) > 5
    )) {
      return; // Was a drag, not a click
    }

    // If an annotation tool is active, let the canvas click handler place the annotation
    if (activeTool === 'snapshot') { handleSnapshotClick(e); return; }
    if (activeTool === 'text') { handleTextClick(e); return; }
    if (activeTool !== 'select') return; // drawing tools handled by mousedown

    // Don't open panel on mobile
    if (isMobile) {
      return;
    }

    e.stopPropagation();
    setShowFloorplanManager(true);
    setShowRoomManager(false);
    setSelectedFloorplanId(floorplanId);
    setSelectedProduct(null);
    setSelectedCanvasProduct(null);
    setSelectedConnection(null);
    setSelectedAnnotation(null);
    };

  const handleFloorplansUpdate = (updatedFloorplans) => {
    setFloorplans(updatedFloorplans);
    markLocalChange();
    // Immediately persist floorplan changes to database
    if (currentProject?.id) {
      appClient.updateProject(currentProject.id, {
        floorplans: updatedFloorplans,
        arrows: arrows
      }).catch(err => console.error('Failed to save floorplans:', err));
    }
  };

  const handleResizeStart = useCallback((e, floorplanId, corner) => {
      e.preventDefault();
      e.stopPropagation();
      
      const floorplan = floorplans.find(fp => fp.id === floorplanId);
      if (!floorplan || floorplan.locked) {
        return;
      }

      // Get current valid values
      const currentPosition = {
        x: (typeof floorplan.position?.x === 'number' && !isNaN(floorplan.position.x)) ? floorplan.position.x : 100,
        y: (typeof floorplan.position?.y === 'number' && !isNaN(floorplan.position.y)) ? floorplan.position.y : 100
      };
      const currentScale = (typeof floorplan.scale === 'number' && !isNaN(floorplan.scale) && floorplan.scale > 0) ? floorplan.scale : 1;

      // Calculate current rendered size - MUST match rendering logic exactly
      const hasCalibration = floorplan.imageWidth && floorplan.imageHeight && floorplan.pixelsPerInch;
      const hasAspectRatio = floorplan.imageWidth && floorplan.imageHeight;
      let currentWidth, currentHeight;
      
      if (hasCalibration) {
        const scaleFactor = (1 / floorplan.pixelsPerInch) * currentScale;
        currentWidth = floorplan.imageWidth * scaleFactor;
        currentHeight = floorplan.imageHeight * scaleFactor;
      } else if (hasAspectRatio) {
        // Has dimensions but no calibration - maintain aspect ratio
        currentWidth = 500 * currentScale;
        currentHeight = currentWidth * (floorplan.imageHeight / floorplan.imageWidth);
      } else {
        // Legacy: use simple scale factor (assume 500px default width)
        currentWidth = 500 * currentScale;
        currentHeight = 500 * currentScale;
      }

      const resizeState = {
        id: floorplanId,
        corner,
        startClientX: e.clientX,
        startClientY: e.clientY,
        startScale: currentScale,
        startPosition: { ...currentPosition },
        currentWidth,
        currentHeight,
        imageWidth: floorplan.imageWidth,
        imageHeight: floorplan.imageHeight,
        pixelsPerInch: floorplan.pixelsPerInch || 1,
        hasCalibration,
        hasAspectRatio
      };

      resizingRef.current = resizeState;
      setResizingFloorplan(resizeState);
      setResizeOffset({ 
        scale: currentScale, 
        position: { ...currentPosition }
      });
    }, [floorplans]);

  const handleResizeMove = useCallback((e) => {
      if (draggingFloorplan && floorplanDragStart) {
        const canvasRect = canvasRef.current?.getBoundingClientRect();
        if (!canvasRect) return;
        const mouseWorldX = (e.clientX - canvasRect.left - pan.x) / zoom;
        const mouseWorldY = (e.clientY - canvasRect.top - pan.y) / zoom;

        const newX = mouseWorldX - floorplanDragStart.offsetX;
        const newY = mouseWorldY - floorplanDragStart.offsetY;

        setFloorplanDragOffset({ x: newX, y: newY });
      }

      const resize = resizingRef.current;
      if (!resize) return;

      // Mouse movement in world coordinates
      const dx = (e.clientX - resize.startClientX) / zoom;
      const dy = (e.clientY - resize.startClientY) / zoom;

      let newWidth = resize.currentWidth;
      let newHeight = resize.currentHeight;
      let newX = resize.startPosition.x;
      let newY = resize.startPosition.y;

      // Calculate new dimensions based on corner
      if (resize.corner === 'se') {
        // Bottom-right: expand from top-left anchor
        newWidth = Math.max(50, resize.currentWidth + dx);
        newHeight = newWidth * (resize.imageHeight / resize.imageWidth);
      } else if (resize.corner === 'sw') {
        // Bottom-left: expand from top-right anchor
        newWidth = Math.max(50, resize.currentWidth - dx);
        newHeight = newWidth * (resize.imageHeight / resize.imageWidth);
        newX = resize.startPosition.x + (resize.currentWidth - newWidth);
      } else if (resize.corner === 'ne') {
        // Top-right: expand from bottom-left anchor
        newWidth = Math.max(50, resize.currentWidth + dx);
        newHeight = newWidth * (resize.imageHeight / resize.imageWidth);
        newY = resize.startPosition.y + (resize.currentHeight - newHeight);
      } else if (resize.corner === 'nw') {
        // Top-left: expand from bottom-right anchor
        newWidth = Math.max(50, resize.currentWidth - dx);
        newHeight = newWidth * (resize.imageHeight / resize.imageWidth);
        newX = resize.startPosition.x + (resize.currentWidth - newWidth);
        newY = resize.startPosition.y + (resize.currentHeight - newHeight);
      }

      // Convert back to scale using the same logic as rendering
      let newScale;
      
      if (resize.hasCalibration) {
        newScale = (newWidth / resize.imageWidth) * resize.pixelsPerInch;
      } else if (resize.hasAspectRatio) {
        // Calculate scale based on 500px default width
        newScale = newWidth / 500;
      } else {
        // Legacy: calculate scale based on 500px default width
        newScale = newWidth / 500;
      }

      setResizeOffset({ 
        scale: Math.max(0.1, newScale), 
        position: { x: newX, y: newY }
      });
    }, [draggingFloorplan, floorplanDragStart, pan.x, pan.y, zoom]);

  const handleResizeEnd = useCallback((e) => {
    if (draggingFloorplan && floorplanDragStart) {
      // Only update position if user actually moved the mouse (not just a click)
      const mouseMoveDist = Math.sqrt(
        Math.pow((e?.clientX || 0) - floorplanDragStart.startMouseX, 2) +
        Math.pow((e?.clientY || 0) - floorplanDragStart.startMouseY, 2)
      );
      
      if (mouseMoveDist > 5) {
        console.log('🎯 Floorplan drag ended - New position:', { id: draggingFloorplan, x: floorplanDragOffset.x, y: floorplanDragOffset.y });
        markLocalChange(); // Mark BEFORE state update
        setFloorplans(prev => {
          const updatedFloorplans = prev.map(fp => {
            if (fp.id === draggingFloorplan) {
              return {
                ...fp,
                position: {
                  x: floorplanDragOffset.x,
                  y: floorplanDragOffset.y
                }
              };
            }
            return fp;
          });

          return updatedFloorplans;
        });
      }
    }

    if (resizingRef.current) {
      markLocalChange(); // Mark BEFORE state update
      const resizingId = resizingRef.current.id;
      setFloorplans(prev => {
        const updatedFloorplans = prev.map(fp => {
          if (fp.id === resizingId) {
            return { ...fp, scale: resizeOffset.scale, position: resizeOffset.position };
          }
          return fp;
        });

        return updatedFloorplans;
      });
      resizingRef.current = null;
      setResizingFloorplan(null);
      setResizeOffset({ scale: 1, position: { x: 0, y: 0 } });
    }

    setDraggingFloorplan(null);
    setFloorplanDragStart(null);
    setFloorplanDragOffset({ x: 0, y: 0 });
  }, [draggingFloorplan, floorplanDragOffset, resizeOffset, markLocalChange]);



  const handleArrowStart = (instanceId) => {
    const device = canvasProducts.find(cp => cp.instanceId === instanceId);
    if (!device) return;

    const startX = device.position.x + CARD_WIDTH / 2;
    const startY = device.position.y + CARD_HEIGHT;

    setDrawingArrow({
      instanceId,
      start: { x: startX, y: startY },
      end: { x: startX, y: startY }
    });
  };

  const centerOnFloorplans = () => {
    const visibleFps = floorplans.filter(fp => fp.visible);
    if (!visibleFps.length) return;
    const bounds = visibleFps.reduce((acc, fp) => {
      const pos=fp.position||{x:0,y:0}; const scale=fp.scale||1;
      const hasCal=fp.imageWidth&&fp.imageHeight&&fp.pixelsPerInch;
      let w=(hasCal?fp.imageWidth*(1/fp.pixelsPerInch)*scale:500*scale);
      let h=fp.imageHeight?w*(fp.imageHeight/fp.imageWidth):500*scale;
      return{minX:Math.min(acc.minX,pos.x),minY:Math.min(acc.minY,pos.y),maxX:Math.max(acc.maxX,pos.x+w),maxY:Math.max(acc.maxY,pos.y+h)};
    }, {minX:Infinity,minY:Infinity,maxX:-Infinity,maxY:-Infinity});
    const cX=(bounds.minX+bounds.maxX)/2; const cY=(bounds.minY+bounds.maxY)/2;
    const r=canvasRef.current?.getBoundingClientRect();
    if(r){setPan({x:r.width/2-cX,y:r.height/2-cY});setZoom(1);}
  };

  const handleMouseDown = (e) => {
    if (e.button === 1) {
      e.preventDefault(); e.stopPropagation();
      const now=Date.now(); const dt=now-lastMiddleClickRef.current;
      if(dt<400){centerOnFloorplans();toast.success('Centered floorplans at 100% zoom');lastMiddleClickRef.current=0;return;}
      lastMiddleClickRef.current=now;
      handlePanStart(e, canvasRef.current); return;
    }
    const isEmptySpace = e.target===e.currentTarget||e.target.tagName==='svg'||e.target.getAttribute('data-canvas-background')==='true';
    if (isEmptySpace && !draggingFloorplan && !annotationMouseDownRef.current) handlePanStart(e, canvasRef.current);
  };

  // Floorplan coordinate helpers
  const canvasToFloorplanCoords = (canvasX, canvasY, floorplan) => {
    if (!floorplan) return { x: canvasX, y: canvasY };
    const fpPos = floorplan.position||{x:0,y:0}; const fpScale=floorplan.scale||1;
    let fpWidth,fpHeight; const hasCal=floorplan.imageWidth&&floorplan.imageHeight&&floorplan.pixelsPerInch;
    if(hasCal){const sf=(1/floorplan.pixelsPerInch)*fpScale;fpWidth=floorplan.imageWidth*sf;fpHeight=floorplan.imageHeight*sf;}
    else if(floorplan.imageWidth&&floorplan.imageHeight){fpWidth=500*fpScale;fpHeight=fpWidth*(floorplan.imageHeight/floorplan.imageWidth);}
    else{fpWidth=500*fpScale;fpHeight=500*fpScale;}
    return {x:(canvasX-fpPos.x)/fpWidth,y:(canvasY-fpPos.y)/fpHeight};
  };
  const floorplanToCanvasCoords = (relX, relY, floorplan) => {
    if (!floorplan) return { x: relX, y: relY };
    const fpPos = floorplan.position||{x:0,y:0}; const fpScale=floorplan.scale||1;
    let fpWidth,fpHeight; const hasCal=floorplan.imageWidth&&floorplan.imageHeight&&floorplan.pixelsPerInch;
    if(hasCal){const sf=(1/floorplan.pixelsPerInch)*fpScale;fpWidth=floorplan.imageWidth*sf;fpHeight=floorplan.imageHeight*sf;}
    else if(floorplan.imageWidth&&floorplan.imageHeight){fpWidth=500*fpScale;fpHeight=fpWidth*(floorplan.imageHeight/floorplan.imageWidth);}
    else{fpWidth=500*fpScale;fpHeight=500*fpScale;}
    return {x:fpPos.x+relX*fpWidth,y:fpPos.y+relY*fpHeight};
  };
  const getFloorplanAtPoint = (canvasX, canvasY) => {
    for(let i=floorplans.length-1;i>=0;i--){const fp=floorplans[i];if(!fp.visible)continue;
      const fpPos=fp.position||{x:0,y:0};const fpScale=fp.scale||1;let fpWidth,fpHeight;
      const hasCal=fp.imageWidth&&fp.imageHeight&&fp.pixelsPerInch;
      if(hasCal){const sf=(1/fp.pixelsPerInch)*fpScale;fpWidth=fp.imageWidth*sf;fpHeight=fp.imageHeight*sf;}
      else if(fp.imageWidth&&fp.imageHeight){fpWidth=500*fpScale;fpHeight=fpWidth*(fp.imageHeight/fp.imageWidth);}
      else{fpWidth=500*fpScale;fpHeight=500*fpScale;}
      if(canvasX>=fpPos.x&&canvasX<=fpPos.x+fpWidth&&canvasY>=fpPos.y&&canvasY<=fpPos.y+fpHeight)return fp;}
    return null;
  };

  const handleCanvasClick = (e) => {
    if (activeTool === 'snapshot' && currentProject) { handleSnapshotClick(e); return; }
    if (activeTool === 'text' && currentProject) { handleTextClick(e); return; }
    // Only trigger if clicking directly on the canvas background, not on products/connections
    const isEmptySpace = e.target === e.currentTarget || 
                        e.target.tagName === 'svg' || 
                        e.target.getAttribute('data-canvas-background') === 'true' ||
                        (!e.target.closest('[data-instance-id]') && 
                         !e.target.closest('[data-floorplan]') && 
                         !e.target.closest('path') && 
                         !e.target.closest('circle') &&
                         !e.target.closest('text') &&
                         !e.target.closest('rect') &&
                         !e.target.closest('line') &&
                         !e.target.closest('polygon') &&
                         !e.target.closest('g[class*="cursor-move"]'));

    if (isEmptySpace) {
      setSelectedProduct(null);
      setSelectedCanvasProduct(null);
      setSelectedConnection(null);
      setSelectedAnnotation(null);
      setHighlightedConnections([]);
      setPanelHistory([]);
      setShowFloorplanManager(false);
      setShowRoomManager(false);
      setSelectedFloorplanId(null);
      setEditingText(null);
    }
  };

  const handleCanvasTouchStart = (e) => {
    if (e.touches.length > 1) e.preventDefault();
    if (e.touches.length === 1) {
      const now=Date.now(); const dt=now-lastTapRef.current;
      if(dt<300){e.preventDefault();centerOnFloorplans();toast.success('Centered on floorplans');lastTapRef.current=0;return;}
      lastTapRef.current=now;
    }
    handleCanvasTouchStartPan(e, canvasRef.current);
  };
  const handleCanvasTouchMove = (e) => {
    if(e.touches.length>1) e.preventDefault();
    handleCanvasTouchMovePan(e, canvasRef.current);
  };
  const handleCanvasTouchEnd = () => handleCanvasTouchEndPan();

  useEffect(() => { connectingStateRef.current = connectingState; }, [connectingState]);
  useEffect(() => {
    const ps = (e) => { if(document.body.classList.contains('canvas-dragging')) e.preventDefault(); };
    document.addEventListener('selectstart', ps);
    return () => document.removeEventListener('selectstart', ps);
  }, []);

  const {
    activeTool, setActiveTool, drawingAnnotation,
    selectedAnnotation, setSelectedAnnotation, hoveredAnnotation, setHoveredAnnotation,
    annotationColor, setAnnotationColor, annotationStrokeWidth, setAnnotationStrokeWidth,
    annotationFill, setAnnotationFill, annotationFontSize, setAnnotationFontSize,
    editingText, setEditingText, annotationDragInitial,
    handleSnapshotClick, handleTextClick, handleAnnotationMouseDown,
    handleSymbolAnnotationDragStart, handleAnnotationTouchStart, handleAnnotationTouchEnd,
    handleUpdateAnnotation, handleDeleteAnnotation, handleDuplicateAnnotation,
    handleAnnotationGlobalMove, handleAnnotationGlobalUp, cancelAnnotationInteraction,
  } = useCanvasAnnotations({
    annotations, setAnnotations, floorplans, pan, zoom, canvasRef, markLocalChange,
    canvasToFloorplanCoords, floorplanToCanvasCoords, getFloorplanAtPoint, isMobile,
  });

  useEffect(() => {
    const resolvePointerTarget = (event, fallbackTarget) => {
      if (fallbackTarget instanceof Element) {
        return fallbackTarget;
      }
      const clientX = event?.clientX ?? event?.touches?.[0]?.clientX;
      const clientY = event?.clientY ?? event?.touches?.[0]?.clientY;
      if (typeof clientX === 'number' && typeof clientY === 'number') {
        return document.elementFromPoint(clientX, clientY);
      }
      return null;
    };

    const isUiOverlayInteraction = (target) =>
      target instanceof Element &&
      (target.closest('[data-ui-overlay="true"]') ||
        target.closest('[data-radix-popper-content-wrapper]') ||
        target.closest('[data-radix-select-content]') ||
        target.closest('[role="listbox"]'));

    const onMove = (e) => {
      const eventTarget = resolvePointerTarget(e, e.target);
      if (isUiOverlayInteraction(eventTarget)) {
        if (annotationDragInitial !== null || drawingAnnotation) {
          cancelAnnotationInteraction();
        }
        return;
      }
      if (isSidebarDragActiveRef.current) {
        const cX=e.clientX||(e.touches&&e.touches[0]?.clientX), cY=e.clientY||(e.touches&&e.touches[0]?.clientY);
        setDragMousePosition({x:cX,y:cY});
      }
      if(handleAnnotationGlobalMove(e,selectedAnnotation)) return;
      if(drawingArrow){const r=canvasRef.current?.getBoundingClientRect();if(r)setDrawingArrow(p=>({...p,end:{x:(e.clientX-r.left-pan.x)/zoom,y:(e.clientY-r.top-pan.y)/zoom}}));return;}
      handleGlobalMouseMove(e); handleResizeMove(e);
    };
    const onUp = (e) => {
      const eventTarget = resolvePointerTarget(e, e.target);
      if (isUiOverlayInteraction(eventTarget)) {
        if (annotationDragInitial !== null || drawingAnnotation) {
          cancelAnnotationInteraction();
        }
        return;
      }
      if(handleAnnotationGlobalUp(e)) return;
      if(drawingArrow){const d=Math.hypot(drawingArrow.end.x-drawingArrow.start.x,drawingArrow.end.y-drawingArrow.start.y);if(d>20){const na=[...arrows,drawingArrow];setArrows(na);if(markLocalChangeRef.current)markLocalChangeRef.current();if(currentProject?.id)appClient.updateProject(currentProject.id,{canvas_products:canvasProducts,connections,rooms,floorplans,arrows:na,annotations}).catch(()=>{});}setDrawingArrow(null);return;}
      handleGlobalMouseUp(e); handleResizeEnd(e);
    };
    window.addEventListener('mousemove',onMove);window.addEventListener('mouseup',onUp);
    window.addEventListener('touchmove',onMove);window.addEventListener('touchend',onUp);
    return()=>{window.removeEventListener('mousemove',onMove);window.removeEventListener('mouseup',onUp);window.removeEventListener('touchmove',onMove);window.removeEventListener('touchend',onUp);};
  },[handleGlobalMouseMove,handleGlobalMouseUp,handleResizeMove,handleResizeEnd,handleAnnotationGlobalMove,handleAnnotationGlobalUp,cancelAnnotationInteraction,annotationDragInitial,drawingAnnotation,drawingArrow,pan,zoom,annotations,selectedAnnotation,arrows,canvasProducts,connections,rooms,floorplans,currentProject]);

  const connectionsByCategory = CONNECTIONS_BY_CATEGORY;

  const getPortWorldPosition = (instanceId, connectionType, isOutput) => {
    if (isSymbolEndpointId(instanceId)) {
      const ann = getAnnotationByEndpointId(instanceId);
      if (!ann || ann.type !== 'symbol') return null;
      const fp = ann.floorplanId ? floorplans.find((f) => f.id === ann.floorplanId) : null;
      if (ann.floorplanId && (!fp || !fp.visible)) return null;
      const canvasPos = fp ? floorplanToCanvasCoords(ann.position.x, ann.position.y, fp) : ann.position;
      if (!canvasPos) return null;
      const offsetX = isOutput ? SYMBOL_SIZE / 2 : -SYMBOL_SIZE / 2;
      return { x: canvasPos.x + offsetX, y: canvasPos.y };
    }

    const product = canvasProducts.find(cp => cp.instanceId === instanceId);
    if (!product) return null;
    const defaultConns = connectionsByCategory[product.product.category] || { inputs: [], outputs: [] };
    const hasDb = (product.product.input_connections?.length > 0) || (product.product.output_connections?.length > 0);
    const norm = p => typeof p === 'string' ? { id: p, label: p } : p;
    let conns = hasDb ? {
      inputs: (product.product.input_connections||[]).map(c=>({type:c.type,ports:(c.ports||[]).map(norm)})),
      outputs: (product.product.output_connections||[]).map(c=>({type:c.type,ports:(c.ports||[]).map(norm)}))
    } : defaultConns;
    const types = (isOutput ? conns.outputs : conns.inputs).map(t=>({...t,ports:(t.ports||[]).map(norm)}));
    const portIndex = types.findIndex(t => t.type === connectionType);
    if (portIndex === -1) return null;
    const totalPorts = Math.min(types.length, 6);
    const totalHeight = (totalPorts - 1) * (PORT_DOT_SIZE + PORT_GAP);
    const startY = product.position.y + CARD_HEIGHT / 2 - totalHeight / 2;
    const portY = startY + portIndex * (PORT_DOT_SIZE + PORT_GAP);
    const portX = isOutput ? product.position.x + CARD_WIDTH + PORT_DOT_SIZE / 2 : product.position.x - PORT_DOT_SIZE / 2;
    return { x: portX, y: portY };
  };

  const getConnectionPointPosition = (instanceId, connectionType, portName, isOutput) => getPortWorldPosition(instanceId, connectionType, isOutput);

  const connectionPositions = connections.map((connection, index) => {
    const fromProduct = canvasProducts.find(cp => cp.instanceId === connection.from);
    const toProduct = canvasProducts.find(cp => cp.instanceId === connection.to);
    const fromSymbol = getAnnotationByEndpointId(connection.from);
    const toSymbol = getAnnotationByEndpointId(connection.to);

    if ((!fromProduct && !fromSymbol) || (!toProduct && !toSymbol)) {
      return { fromPoint: null, toPoint: null, fromEdge: null, toEdge: null };
    }

    const fromPoint = getConnectionPointPosition(connection.from, connection.type, connection.fromPort, true);
    const toPoint = getConnectionPointPosition(connection.to, connection.type, connection.toPort, false);

    let fromEdge = null, toEdge = null;

    if (fromPoint && fromProduct) {
      const fromLeft = fromProduct.position.x;
      const fromRight = fromProduct.position.x + CARD_WIDTH;
      const fromTop = fromProduct.position.y;
      const fromBottom = fromProduct.position.y + CARD_HEIGHT;

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

    if (toPoint && toProduct) {
      const toLeft = toProduct.position.x;
      const toRight = toProduct.position.x + CARD_WIDTH;
      const toTop = toProduct.position.y;
      const toBottom = toProduct.position.y + CARD_HEIGHT;

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

    if (fromPoint && fromSymbol) {
      fromEdge = 'right';
    }
    if (toPoint && toSymbol) {
      toEdge = 'left';
    }

    return { fromPoint, toPoint, fromEdge, toEdge };
  });

  return (
    <DragDropContext onDragStart={onDragStart} onDragEnd={onDragEnd}>
      <div className="flex h-[100dvh] w-full bg-gray-950 overflow-hidden">
        {/* Mobile overlay sidebar - Hidden on mobile view-only mode */}
        {!isMobile && (
        <div className={`fixed md:relative inset-y-0 left-0 z-50 transition-transform duration-300 ${showSidebar ? 'translate-x-0 w-full sm:w-96 md:w-auto' : '-translate-x-full md:-translate-x-full md:w-0 pointer-events-none'}`}>
          {showSidebar && (
            <>
              {/* Mobile backdrop */}
              {showSidebar && (
                <div 
                  className="fixed inset-0 bg-black/60 md:hidden z-40"
                  onClick={() => setShowSidebar(false)}
                />
              )}
              <div className="relative z-50 h-full">
                  <ProductSidebar 
                products={products} 
                onProductSelect={(product) => {
                  setSelectedProduct(product);
                  setSelectedCanvasProduct(null);
                  setSelectedConnection(null);
                  setShowFloorplanManager(false);
                  setShowRoomManager(false);
                  setSelectedFloorplanId(null);
                  setPanelHistory(prev => {
                    const filtered = prev.filter(p => p !== 'productDetails');
                    return [...filtered.slice(-1), 'productDetails'];
                  });
                  if (isMobile) {
                    setShowSidebar(false);
                  }
                }}
              />
              </div>
            </>
          )}
        </div>
        )}

        <div className="flex-1 flex flex-col min-w-0 relative">
           {/* Sidebar toggle button - hidden on mobile view-only mode */}
           {!isMobile && (
           <button 
             onClick={() => setShowSidebar(!showSidebar)}
             className={`fixed md:absolute top-4 md:top-1/2 md:-translate-y-1/2 z-[60] h-12 w-12 md:h-[72px] md:w-[22px] bg-gray-800 border border-gray-700 text-gray-300 hover:bg-gray-700 hover:text-white transition-all flex items-center justify-center shadow-lg md:shadow-none rounded-lg md:rounded-r-md ${
               showSidebar ? 'left-4 md:left-0 md:rounded-l-none md:border-l-0' : 'left-4 md:left-0'
             }`}
             title={showSidebar ? "Hide sidebar" : "Show sidebar"}
           >
             {showSidebar ? <PanelLeftClose className="w-4 h-4 md:w-3 md:h-3" /> : <PanelLeftOpen className="w-4 h-4 md:w-3 md:h-3" />}
           </button>
           )}

          <div className="bg-gray-900 border-b border-gray-800 px-3 md:px-6 py-3 md:py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex-1 min-w-0">
              <h1 className="text-lg md:text-2xl font-bold text-white truncate">AV System Design</h1>
              <div className="flex items-center gap-2 md:gap-3 mt-0.5">
                <p className="text-xs md:text-sm text-gray-400 truncate">
                  {currentProject ? (
                    <>Project: <span className="text-blue-400 font-medium">{currentProject.name}</span></>
                  ) : (
                    <span className="hidden sm:inline">Drag products to canvas and create connections</span>
                  )}
                </p>
                <CollaboratorIndicator 
                  projectId={currentProject?.id} 
                  currentUserEmail={currentUserEmail}
                />
              </div>
            </div>
            <div className="flex gap-1.5 md:gap-2 flex-wrap self-end sm:self-auto">
              {/* Project/Tools menus hidden on mobile */}
              {!isMobile && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700 hover:text-white hover:border-gray-500 text-xs md:text-sm">
                    <FolderOpen className="w-3 h-3 md:w-4 md:h-4 md:mr-2" />
                    <span className="hidden md:inline">Project</span>
                    <ChevronDown className="w-3 h-3 md:w-4 md:h-4 md:ml-2" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="bg-gray-800 border-gray-700">
                  <DropdownMenuItem onClick={() => setShowProjectManager(true)} className="text-gray-300 hover:bg-gray-700 hover:text-white cursor-pointer">
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
                          await appClient.updateProject(currentProject.id, {
                            canvas_products: canvasProducts,
                            connections: connections,
                            rooms: rooms,
                            floorplans: floorplans,
                            arrows: arrows,
                            annotations: annotations
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
                  <DropdownMenuItem onClick={() => setShowProjectManager(true)} className="text-gray-300 hover:bg-gray-700 hover:text-white cursor-pointer">
                    <Download className="w-4 h-4 mr-2" />
                    Load Project
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setShowProjectManager(true)} className="text-gray-300 hover:bg-gray-700 hover:text-white cursor-pointer">
                    <Plus className="w-4 h-4 mr-2" />
                    Create New Project
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => {
                      if (canvasProducts.length === 0 && floorplans.length === 0 && annotations.length === 0) {
                        toast.warning('Canvas is empty. Add devices or floorplans first.');
                        return;
                      }
                      setShowExportDialog(true);
                    }}
                    className="text-gray-300 hover:bg-gray-700 hover:text-white cursor-pointer"
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    Export to PDF
                  </DropdownMenuItem>

                  <DropdownMenuItem onClick={clearCanvas} disabled={canvasProducts.length === 0} className="text-gray-300 hover:bg-red-500/10 hover:text-red-400 cursor-pointer">
                    <Trash2 className="w-4 h-4 mr-2" />
                    Clear Canvas
                  </DropdownMenuItem>
                  </DropdownMenuContent>
                  </DropdownMenu>
              )}

                  {currentProject && !isMobile && (
                    <Button 
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setShowFloorplanManager(true);
                        setShowRoomManager(false);
                        setSelectedProduct(null);
                        setSelectedCanvasProduct(null);
                        setSelectedConnection(null);
                        setSelectedFloorplanId(null);
                      }} 
                      className="bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700 hover:text-white hover:border-gray-500 text-xs md:text-sm">
                      <Layers className="w-3 h-3 md:w-4 md:h-4 md:mr-2" />
                      <span className="hidden md:inline">Floorplans</span>
                    </Button>
                  )}

                  {!isMobile && (
                  <DropdownMenu>
                   <DropdownMenuTrigger asChild>
                   <Button variant="outline" size="sm" className="bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700 hover:text-white hover:border-gray-500 text-xs md:text-sm">
                   <Wrench className="w-3 h-3 md:w-4 md:h-4 md:mr-2" />
                   <span className="hidden md:inline">Tools</span>
                   <ChevronDown className="w-3 h-3 md:w-4 md:h-4 md:ml-2" />
                   </Button>
                   </DropdownMenuTrigger>
                <DropdownMenuContent className="bg-gray-800 border-gray-700">
                  <DropdownMenuItem onClick={() => window.location.href = createPageUrl("DeviceManager")} className="text-gray-300 hover:bg-gray-700 hover:text-white cursor-pointer">
                    <Settings className="w-4 h-4 mr-2" />
                    Manage Devices
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => window.location.href = createPageUrl("WirePricing")} className="text-gray-300 hover:bg-gray-700 hover:text-white cursor-pointer">
                    <Link2 className="w-4 h-4 mr-2" />
                    Wire Pricing
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => window.location.href = createPageUrl("NetworkMapping")} className="text-gray-300 hover:bg-gray-700 hover:text-white cursor-pointer">
                    <Settings className="w-4 h-4 mr-2" />
                    Network Agent
                    <Badge className="ml-2 bg-blue-500/20 text-blue-400 border-blue-500/30 text-[10px] px-1.5 py-0">Coming Soon</Badge>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setShowImportDialog(true)} disabled={importProgress?.status === 'running'} className="text-gray-300 hover:bg-gray-700 hover:text-white cursor-pointer">
                    <Plus className="w-4 h-4 mr-2" />
                    {importProgress?.status === 'running' ? 'Importing...' : 'Import Products'}
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                      onClick={() => setShowEnrichDialog(true)}
                      disabled={enrichmentProgress?.status === 'running'}
                      className="text-gray-300 hover:bg-gray-700 hover:text-white cursor-pointer"
                    >
                      <Link2 className="w-4 h-4 mr-2" />
                      {enrichmentProgress?.status === 'running' ? 'Enriching...' : 'Enrich Connections'}
                    </DropdownMenuItem>
                </DropdownMenuContent>
                </DropdownMenu>
                )}

                {(enrichmentProgress?.status === 'running' || importProgress?.status === 'running') && !isMobile && (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-500/20 border border-blue-500/40 rounded-lg">
                  <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                  <span className="text-xs text-blue-300 font-medium">
                    {importProgress?.status === 'running' && 'Importing products...'}
                    {enrichmentProgress?.status === 'running' && 'Enriching connections...'}
                  </span>
                </div>
              )}
              
              <div className="hidden md:flex items-center gap-0.5 md:gap-1 bg-gray-800 border border-gray-700 rounded-lg px-1 md:px-2 py-1">
                <Button size="icon" variant="ghost" onClick={handleZoomOut} className="h-8 w-8 md:h-7 md:w-7 text-gray-300 hover:text-white">
                  <ZoomOut className="w-4 h-4" />
                </Button>
                <span className="text-xs md:text-sm text-gray-400 min-w-[2.5rem] md:min-w-[3rem] text-center">
                  {Math.round(zoom * 100)}%
                </span>
                <Button size="icon" variant="ghost" onClick={handleZoomIn} className="h-8 w-8 md:h-7 md:w-7 text-gray-300 hover:text-white">
                  <ZoomIn className="w-4 h-4" />
                </Button>
                <Button size="icon" variant="ghost" onClick={handleZoomReset} className="h-8 w-8 md:h-7 md:w-7 text-gray-300 hover:text-white">
                  <Maximize2 className="w-3 h-3" />
                </Button>
              </div>
              



              <Link to={createPageUrl("Settings")} className="hidden sm:block">
                <Button variant="outline" size="sm" className="bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700 hover:text-white hover:border-gray-500">
                  <Settings className="w-3 h-3 md:w-4 md:h-4" />
                </Button>
              </Link>
              
              {isAtLeast(ROLES.ADMINISTRATOR) && (
                <Link to={createPageUrl("Admin")} className="hidden sm:block">
                  <Button variant="outline" size="sm" className="bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700 hover:text-white hover:border-gray-500">
                    <Users className="w-3 h-3 md:w-4 md:h-4" />
                  </Button>
                </Link>
              )}
              
              {!isMobile && (
              <Link to={createPageUrl("account")}>
                <Button variant="outline" size="sm" className="bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700 hover:text-white hover:border-gray-500">
                  <User className="w-3 h-3 md:w-4 md:h-4" />
                </Button>
              </Link>
              )}
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
           style={{ ...provided.droppableProps.style, backgroundColor: 'transparent !important' }}
           onWheel={currentProject ? (e) => handleWheel(e, canvasRef.current) : undefined}
           onWheelCapture={currentProject ? (e) => {
             if (e.defaultPrevented) return;
             e.preventDefault();
           } : undefined}
            onMouseDown={currentProject ? (e) => {
              document.body.classList.add('canvas-dragging');
              document.body.style.userSelect = 'none';
              if (activeTool !== 'select' && activeTool !== 'text' && activeTool !== 'snapshot') {
                handleAnnotationMouseDown(e);
              } else {
                handleMouseDown(e);
              }
            } : undefined}
            onMouseUp={() => {
              document.body.classList.remove('canvas-dragging');
              document.body.style.userSelect = '';
            }}
            onMouseLeave={() => {
              document.body.classList.remove('canvas-dragging');
              document.body.style.userSelect = '';
            }}
            onClick={currentProject ? handleCanvasClick : undefined}
              onTouchStart={currentProject ? handleCanvasTouchStart : undefined}
              onTouchMove={currentProject ? handleCanvasTouchMove : undefined}
              onTouchEnd={currentProject ? handleCanvasTouchEnd : undefined}
              className={`flex-1 relative overflow-hidden bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 transition-colors ${isPanning || spacePressed ? 'cursor-grab' : ''} ${isPanning ? 'cursor-grabbing' : ''}`}
             data-canvas-background="true"
              style={{
                touchAction: 'none',
                WebkitUserSelect: 'none',
                userSelect: 'none',
                backgroundImage: orgSettings?.canvas_theme === 'grid' || orgSettings?.canvas_theme === 'dark' 
                  ? 'radial-gradient(circle, rgba(59, 130, 246, 0.05) 1px, transparent 1px)' 
                  : 'none',
                backgroundSize: `${(orgSettings?.grid_size || 30) * zoom}px ${(orgSettings?.grid_size || 30) * zoom}px`,
                backgroundPosition: `${pan.x}px ${pan.y}px`,
                backgroundColor: orgSettings?.canvas_theme === 'light' ? '#f8fafc' : '#0f172a'
              }}
          >
            {/* Unified Canvas Container - All elements share same transform */}
            <div style={{ 
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              transformOrigin: 'top left',
              transition: isPanning || draggingFloorplan ? 'none' : 'none',
              pointerEvents: 'auto'
            }}>
              {/* Annotation + Floorplan Layer */}
              <AnnotationLayer
                annotations={annotations} floorplans={floorplans}
                selectedAnnotation={selectedAnnotation} hoveredAnnotation={hoveredAnnotation}
                activeTool={activeTool} isMobile={isMobile}
                setSelectedAnnotation={setSelectedAnnotation} setSelectedProduct={setSelectedProduct}
                setSelectedCanvasProduct={setSelectedCanvasProduct} setSelectedConnection={setSelectedConnection}
                setShowFloorplanManager={setShowFloorplanManager} setShowRoomManager={setShowRoomManager}
                setSelectedFloorplanId={setSelectedFloorplanId} setPanelHistory={setPanelHistory}
                setHoveredAnnotation={setHoveredAnnotation}
                handleSymbolAnnotationDragStart={handleSymbolAnnotationDragStart}
                handleAnnotationTouchStart={handleAnnotationTouchStart}
                handleAnnotationTouchEnd={handleAnnotationTouchEnd}
                floorplanToCanvasCoords={floorplanToCanvasCoords}
                drawingAnnotation={drawingAnnotation}
                resizingRef={resizingRef} resizeOffset={resizeOffset}
                draggingFloorplan={draggingFloorplan} floorplanDragStart={floorplanDragStart}
                floorplanDragOffset={floorplanDragOffset} selectedFloorplanId={selectedFloorplanId}
                resizingFloorplan={resizingFloorplan}
                handleFloorplanMouseDown={handleFloorplanMouseDown} handleFloorplanClick={handleFloorplanClick}
                handleResizeStart={handleResizeStart} setFloorplans={setFloorplans}
                setCurrentProject={setCurrentProject} currentProject={currentProject}
                registerPort={registerPort}
                getPortId={getPortId}
                hoveredPortId={hoveredPortId}
                connectingFromPortId={connectingState?.fromPort ? getPortId(
                  connectingState.fromPort.instanceId,
                  connectingState.fromPort.connectionType,
                  connectingState.fromPort.portName,
                  connectingState.fromPort.isInput
                ) : null}
                onPortMouseDown={handlePortMouseDown}
                onPortClick={handlePortClick}
              />
            </div>

            <svg className="absolute pointer-events-none" style={{ zIndex: 1, top: 0, left: 0, width: '100%', height: '100%', minWidth: '4000px', minHeight: '4000px', overflow: 'visible' }}>
              <g style={{ pointerEvents: 'auto' }} transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
                <CanvasConnectionLayer
                  connections={connections} canvasProducts={canvasProducts}
                  connectionPositions={connectionPositions}
                  hoveredConnectionIndex={hoveredConnectionIndex}
                  highlightedConnections={highlightedConnections}
                  selectedConnection={selectedConnection}
                  zoom={zoom} pan={pan}
                  handleRemoveConnection={handleRemoveConnection}
                  handleConnectionClick={handleConnectionClick}
                  handleConnectionHover={handleConnectionHover}
                  handleConnectionLeave={handleConnectionLeave}
                  setConnections={setConnections}
                  CARD_WIDTH={CARD_WIDTH} CARD_HEIGHT={CARD_HEIGHT}
                />
                {connectingState?.startPos && connectingState?.mousePos && (
                  <g style={{ pointerEvents: 'none' }}>
                    <line
                      x1={connectingState.startPos.x}
                      y1={connectingState.startPos.y}
                      x2={connectingState.mousePos.x}
                      y2={connectingState.mousePos.y}
                      stroke={connectionTypeColors[connectingState.fromPort?.connectionType] || '#60a5fa'}
                      strokeWidth="3"
                      strokeDasharray="8 6"
                      strokeLinecap="round"
                      opacity="0.95"
                    />
                    <circle
                      cx={connectingState.startPos.x}
                      cy={connectingState.startPos.y}
                      r="5"
                      fill={connectionTypeColors[connectingState.fromPort?.connectionType] || '#60a5fa'}
                      opacity="0.95"
                    />
                    <circle
                      cx={connectingState.mousePos.x}
                      cy={connectingState.mousePos.y}
                      r="4"
                      fill={connectionTypeColors[connectingState.fromPort?.connectionType] || '#60a5fa'}
                      opacity="0.9"
                    />
                  </g>
                )}
              </g>
            </svg>

            {!currentProject && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-50">
                <div className="text-center bg-gray-900/95 border border-gray-700 rounded-xl p-8 pointer-events-auto">
                  <div className="w-16 h-16 rounded-full bg-blue-500/20 flex items-center justify-center mx-auto mb-4">
                    <FolderOpen className="w-8 h-8 text-blue-400" />
                  </div>
                  <p className="text-white text-lg font-medium mb-2">No Project Loaded</p>
                  <p className="text-gray-400 text-sm mb-6">Create a new project or load an existing one to start designing</p>
                  <Button onClick={() => setShowProjectManager(true)} className="bg-blue-600 hover:bg-blue-700">
                    <FolderOpen className="w-4 h-4 mr-2" />
                    Open Project Manager
                  </Button>
                </div>
              </div>
            )}

            {currentProject && canvasProducts.length === 0 && floorplans.length === 0 && annotations.length === 0 && !snapshot.isDraggingOver && !isMobile && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="text-center">
                  <div className="w-16 h-16 rounded-full bg-gray-800 flex items-center justify-center mx-auto mb-4">
                    <Plus className="w-8 h-8 text-gray-600" />
                  </div>
                  <p className="text-gray-500 text-lg font-medium">Drag products here to start</p>
                  <p className="text-gray-600 text-sm mt-1">Upload a floorplan or build your AV system layout</p>
                </div>
              </div>
            )}



            <div style={{ 
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              zIndex: 2,
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              transformOrigin: 'top left',
              transition: isPanning || draggingFloorplan ? 'none' : 'none',
              pointerEvents: 'none'
            }}>
              {canvasProducts.map((cp) => {
                const isHighlighted = highlightedConnections.some(idx => {
                  const conn = connections[idx];
                  return conn && (conn.from === cp.instanceId || conn.to === cp.instanceId);
                }) || hoveredDeviceId === cp.instanceId;
                return (
                  <CanvasProduct
                        key={cp.instanceId}
                        instanceId={cp.instanceId}
                        product={cp.product}
                        position={cp.position}
                        onRemove={handleRemoveProductWithSelection}
                        onConnect={handleConnect}
                        onPositionChange={handlePositionChange}
                        isConnecting={connectingFrom === cp.instanceId}
                        isHighlighted={isHighlighted}
                        isSelected={selectedCanvasProduct?.instanceId === cp.instanceId}
                        label={cp.label}
                        networkInfo={ensureNetworkInfo(cp).networkInfo}
                        zoom={zoom}
                        responsiveDimensions={responsiveDimensions}
                        onClick={() => {
                        setSelectedCanvasProduct(ensureNetworkInfo(cp));
                        setSelectedProduct(null);
                        setSelectedConnection(null);
                        setSelectedAnnotation(null);
                        setShowFloorplanManager(false);
                        setShowRoomManager(false);
                        setSelectedFloorplanId(null);
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
                        onProductUpdate={(updatedProduct) => {
                                          projectData.setCanvasProducts(prev => prev.map(p => 
                                            p.instanceId === cp.instanceId
                                              ? { ...p, product: updatedProduct }
                                              : p
                                          ));
                                          queryClient.invalidateQueries({ queryKey: ['avProducts'] });
                                        }}
                                        onPreviewManual={setPreviewManual}
                                        onArrowStart={handleArrowStart}
                                      />
                );
              })}
            </div>
            {provided.placeholder}
          </div>
          )}
          </Droppable>

          {/* Annotation Toolbar - Only show on mobile for annotations, hide on desktop with editing controls */}
          {currentProject && (
            <AnnotationToolbar
              activeTool={activeTool}
              onToolChange={setActiveTool}
              color={annotationColor}
              onColorChange={setAnnotationColor}
              strokeWidth={annotationStrokeWidth}
              onStrokeWidthChange={setAnnotationStrokeWidth}
              fill={annotationFill}
              onFillChange={setAnnotationFill}
              fontSize={annotationFontSize}
              onFontSizeChange={setAnnotationFontSize}
              onAddSymbol={(symbol) => {
                if (!canvasRef.current || !currentProject?.id) return;
                const canvasRect = canvasRef.current.getBoundingClientRect();
                const canvasX = (canvasRect.width / 2 - pan.x) / zoom;
                const canvasY = (canvasRect.height / 2 - pan.y) / zoom;

                const floorplan = getFloorplanAtPoint(canvasX, canvasY);
                const position = floorplan
                  ? canvasToFloorplanCoords(canvasX, canvasY, floorplan)
                  : { x: canvasX, y: canvasY };

                const newAnnotation = {
                  id: Date.now().toString(),
                  type: 'symbol',
                  symbolId: symbol,
                  floorplanId: floorplan?.id,
                  position,
                  color: annotationColor,
                  scale: 1,
                  rotation: 0,
                  flipped: false
                };
                const updated = [...annotations, newAnnotation];
                setAnnotations(updated);
                markLocalChange();
              }}
            />
          )}



          {/* Text editing overlay */}
          {editingText && annotations.find(a => a.id === editingText) && (() => {
            const ann = annotations.find(a => a.id === editingText);
            const floorplan = ann.floorplanId ? floorplans.find(fp => fp.id === ann.floorplanId) : null;
            const canvasPos = floorplan
              ? floorplanToCanvasCoords(ann.position.x, ann.position.y, floorplan)
              : ann.position;
            const screenX = canvasPos.x * zoom + pan.x;
            const screenY = canvasPos.y * zoom + pan.y;
            return (
              <div
                style={{
                  position: 'fixed',
                  left: `${screenX}px`,
                  top: `${screenY - 10}px`,
                  zIndex: 9999
                }}
              >
                <input
                  type="text"
                  autoFocus
                  value={ann.text}
                  onChange={(e) => {
                    const updated = annotations.map(a => 
                      a.id === editingText ? { ...a, text: e.target.value } : a
                    );
                    setAnnotations(updated);
                  }}
                  onBlur={() => {
                    setEditingText(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === 'Escape') {
                      setEditingText(null);
                    }
                  }}
                  className="bg-gray-900 border-2 border-blue-500 rounded px-2 py-1 text-white"
                  style={{ fontSize: `${ann.fontSize}px`, minWidth: '100px' }}
                />
              </div>
            );
          })()}
        </div>

        {/* Hide connection/device panels on mobile (view-only) */}
        {selectedConnection && !isMobile && (
           <ConnectionDetailsPanel
            connection={selectedConnection}
            fromProduct={canvasProducts.find(cp => cp.instanceId === selectedConnection.from)?.product}
            toProduct={canvasProducts.find(cp => cp.instanceId === selectedConnection.to)?.product}
            fromLabel={canvasProducts.find(cp => cp.instanceId === selectedConnection.from)?.label}
            toLabel={canvasProducts.find(cp => cp.instanceId === selectedConnection.to)?.label}
            fromPosition={connectionPositions[selectedConnection.index]?.fromPoint || null}
            toPosition={connectionPositions[selectedConnection.index]?.toPoint || null}
            allConnections={connections}
            floorplans={floorplans}
            onClose={() => setSelectedConnection(null)}
            onDelete={handleDeleteConnection}
          />
        )}

        {!selectedConnection && selectedCanvasProduct && !isMobile && (
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
              projectData.setCanvasProducts(prev => {
                const updated = prev.map(cp => 
                  cp.product.id === updatedProduct.id
                    ? { ...cp, product: { ...cp.product, ...updatedProduct } }
                    : cp
                );
                return updated;
              });
              setSelectedCanvasProduct(prev => ({
                ...prev,
                product: { ...prev.product, ...updatedProduct }
              }));
              queryClient.invalidateQueries({ queryKey: ['avProducts'] });
              toast.success('Device updated successfully');
            }}
          />
        )}

        {!selectedConnection && !selectedCanvasProduct && selectedProduct && !isMobile && (
           <ProductDetailsPanel
            product={selectedProduct}
            onClose={() => {
              setSelectedProduct(null);
              setPanelHistory(prev => prev.filter(p => p !== 'productDetails'));
            }}
            onDeviceUpdate={(updatedProduct) => {
              setSelectedProduct(updatedProduct);
              queryClient.invalidateQueries({ queryKey: ['avProducts'] });
              toast.success('Device updated successfully');
            }}
          />
        )}

        <AnnotationPanelRouter
          annotations={annotations}
          connections={connections}
          selectedAnnotation={selectedAnnotation}
          onClose={() => setSelectedAnnotation(null)}
          onUpdate={handleUpdateAnnotation}
          onDelete={handleDeleteAnnotation}
          onDuplicate={() => handleDuplicateAnnotation(selectedAnnotation)}
          connectionTypeOptions={Array.from(
            new Set(
              (connections || [])
                .flatMap((c) => [
                  c?.wireId,
                  c?.wire_id,
                  c?.label,
                  c?.connectionLabel,
                  c?.connection_label
                ])
                .filter((v) => typeof v === "string")
                .map((v) => v.trim())
                .filter((v) => /^[A-Za-z]\d{3,}$/.test(v))
            )
          ).sort()}
        />

        {connectingFrom !== null &&
          connectingTo !== null &&
          canvasProducts.find(cp => cp.instanceId === connectingFrom) &&
          canvasProducts.find(cp => cp.instanceId === connectingTo) && (
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

        {pendingSymbolLink && (
          <div
            data-ui-overlay="true"
            className="fixed inset-0 z-[12000] bg-black/60 flex items-center justify-center p-4"
          >
            <div className="w-full max-w-md rounded-xl border border-gray-700 bg-gray-900 p-5 space-y-4">
              <div>
                <h3 className="text-white text-lg font-semibold">
                  Assign Data Outlet Port
                </h3>
                <p className="text-gray-400 text-sm mt-1">
                  {pendingSymbolLink.mode === 'uplink'
                    ? 'Select which outlet port receives this switch/router uplink.'
                    : 'Select which fed outlet port serves this endpoint device.'}
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-sm text-gray-300">
                  {pendingSymbolLink.mode === 'uplink' ? 'Switch/Router Port' : 'Device Ethernet Input'}
                </label>
                <Select
                  value={pendingSymbolLink.selectedDevicePort}
                  onValueChange={(value) => setPendingSymbolLink((prev) => ({ ...prev, selectedDevicePort: value }))}
                >
                  <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                    <SelectValue placeholder="Select device port" />
                  </SelectTrigger>
                  <SelectContent
                    data-ui-overlay="true"
                    avoidCollisions={false}
                    side="bottom"
                    sideOffset={6}
                    className="bg-gray-800 border-gray-700 z-[14000]"
                  >
                    {pendingSymbolLink.devicePortOptions.map((port) => (
                      <SelectItem key={port} value={port} className="text-white focus:bg-gray-700">
                        {port}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm text-gray-300">Outlet Port</label>
                <Select
                  value={pendingSymbolLink.selectedPort}
                  onValueChange={(value) => setPendingSymbolLink((prev) => ({ ...prev, selectedPort: value }))}
                >
                  <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                    <SelectValue placeholder="Select outlet port" />
                  </SelectTrigger>
                  <SelectContent
                    data-ui-overlay="true"
                    avoidCollisions={false}
                    side="bottom"
                    sideOffset={6}
                    className="bg-gray-800 border-gray-700 z-[14000]"
                  >
                    {pendingSymbolLink.portOptions.map((port) => (
                      <SelectItem key={port} value={port} className="text-white focus:bg-gray-700">
                        {port}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  variant="outline"
                  className="border-gray-700 bg-gray-800 text-gray-200 hover:bg-gray-700"
                  onClick={() => setPendingSymbolLink(null)}
                >
                  Cancel
                </Button>
                <Button
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                  onClick={() => {
                    const isUplink = pendingSymbolLink.mode === 'uplink';
                    const parentUplinkConnection = !isUplink
                      ? connections.find(
                          (c) =>
                            c.type === 'Ethernet' &&
                            c.to === pendingSymbolLink.symbolEndpointId &&
                            c.toPort === pendingSymbolLink.selectedPort
                        )
                      : null;
                    handleConnectionTypeSelect(
                      {
                        type: pendingSymbolLink.connectionType,
                        fromPort: isUplink ? pendingSymbolLink.selectedDevicePort : pendingSymbolLink.selectedPort,
                        toPort: isUplink ? pendingSymbolLink.selectedPort : pendingSymbolLink.selectedDevicePort,
                        wireSpec: null,
                        parentWireId: parentUplinkConnection?.wireId || null
                      },
                      {
                        fromId: pendingSymbolLink.fromId,
                        toId: pendingSymbolLink.toId,
                        fromKind: pendingSymbolLink.fromKind,
                        toKind: pendingSymbolLink.toKind
                      }
                    );
                    setPendingSymbolLink(null);
                  }}
                >
                  Create Connection
                </Button>
              </div>
            </div>
          </div>
        )}

        {showProjectManager && (
          <ProjectManager
            currentProject={currentProject}
            canvasProducts={canvasProducts}
            connections={connections}
            rooms={rooms}
            floorplans={floorplans}
            onProjectLoad={handleProjectLoad}
            onClose={() => setShowProjectManager(false)}
          />
        )}

        {showFloorplanManager && (
          <FloorplanManager
            floorplans={floorplans}
            onUpdate={handleFloorplansUpdate}
            onClose={() => setShowFloorplanManager(false)}
            selectedFloorplanId={selectedFloorplanId}
            onSelectFloorplan={setSelectedFloorplanId}
            rooms={rooms}
            onAddRoom={handleAddRoom}
            onDeleteRoom={handleDeleteRoom}
            onRenameRoom={handleRenameRoom}
            canvasProducts={canvasProducts}
            onDeviceRoomChange={(instanceId, newRoom) => {
              projectData.setCanvasProducts(prev => prev.map(cp => 
                cp.instanceId === instanceId ? { ...cp, room: newRoom } : cp
              ));
            }}
            onDeviceHover={setHoveredDeviceId}
            onCenterDevice={(device) => {
              if (canvasRef.current && device.position) {
                const canvasRect = canvasRef.current.getBoundingClientRect();
                const viewportCenterX = canvasRect.width / 2;
                const viewportCenterY = canvasRect.height / 2;
                const deviceCenterX = device.position.x + 160;
                const deviceCenterY = device.position.y + 140;
                
                setPan({
                  x: viewportCenterX - deviceCenterX,
                  y: viewportCenterY - deviceCenterY
                });
                setZoom(1);
              }
            }}
            annotations={annotations}
            onAnnotationsChange={setAnnotations}
          />
        )}



        <ExportDialogs
          showExportDialog={showExportDialog} setShowExportDialog={setShowExportDialog}
          showEnrichDialog={showEnrichDialog} setShowEnrichDialog={setShowEnrichDialog}
          showImportDialog={showImportDialog} setShowImportDialog={setShowImportDialog}
          previewManual={previewManual} setPreviewManual={setPreviewManual}
          pendingProductDrop={pendingProductDrop} setPendingProductDrop={setPendingProductDrop}
          isExporting={isExporting} setIsExporting={setIsExporting}
          exportEngine={exportEngine} setExportEngine={setExportEngine}
          enrichmentProgress={enrichmentProgress} setEnrichmentProgress={setEnrichmentProgress}
          importProgress={importProgress} setImportProgress={setImportProgress}
          currentProject={currentProject}
          canvasProducts={canvasProducts} connections={connections} rooms={rooms}
          floorplans={floorplans} arrows={arrows} annotations={annotations}
          orgSettings={orgSettings}
          selectedFloorplanId={selectedFloorplanId}
          handleAddRoom={handleAddRoom}
          addProductToCanvas={addProductToCanvas}
          projectData={projectData}
          queryClient={queryClient}
          products={products}
        />

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
  return <AVCanvasContent />;
}
