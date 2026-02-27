import React, { useState, useRef, useEffect, useCallback } from 'react';
import { base44 } from "@/api/base44Client";
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
import SymbolRenderer from "../components/canvas/SymbolRenderer";
import SymbolLegend from "../components/canvas/SymbolLegend";

import { trackActivity, ActivityActions } from "../components/activity/activityTracker";
import { usePermissions } from "../components/auth/usePermissions";
import { ROLES } from "../components/auth/permissions";
import { useSettings } from "../components/settings/SettingsContext";
import useCanvasZoomPan from "../components/canvas/hooks/useCanvasZoomPan";
import useProjectData, { ensureNetworkInfo } from "../components/canvas/hooks/useProjectData";
import useResponsiveCanvas from "../components/canvas/hooks/useResponsiveCanvas";

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
    base44.auth.me().then(user => setCurrentUserEmail(user.email)).catch(() => {});
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



  const lastMiddleClickRef = useRef(0);
  const lastTapRef = useRef(0);
  const annotationMouseDownRef = useRef(null);
  
  const canvasRef = useRef(null);
  const portRefs = useRef(new Map());
  const connectingStateRef = useRef(null);
  
  const PORT_HIT_RADIUS = 50; // Hit detection radius for port snapping
  const PORT_OFFSET = 20;    // Offset from port dots when drawing temporary connection lines
  
  // Generates orthogonal (right-angle) connection routing to avoid cluttered visual paths
  // Handles different direction combinations (left/right to left/right edges)
  const generateOrthogonalPath = (fromPos, toPos, fromIsInput, toIsInput) => {
    const fromDirection = fromIsInput ? 'left' : 'right';
    const toDirection = toIsInput ? 'left' : 'right';
    
    const fromOffset = {
      x: fromPos.x + (fromDirection === 'right' ? PORT_OFFSET : -PORT_OFFSET),
      y: fromPos.y
    };
    
    const toOffset = {
      x: toPos.x + (toDirection === 'right' ? PORT_OFFSET : -PORT_OFFSET),
      y: toPos.y
    };
    
    const points = [fromPos, fromOffset];
    const dx = toOffset.x - fromOffset.x;
    const dy = toOffset.y - fromOffset.y;
    
    if (fromDirection === 'right' && toDirection === 'left') {
      if (dx > 0) {
        const midX = fromOffset.x + dx / 2;
        points.push({ x: midX, y: fromOffset.y });
        points.push({ x: midX, y: toOffset.y });
      } else {
        const midX = fromOffset.x + Math.max(20, -dx / 2);
        const midY = fromOffset.y + dy / 2;
        points.push({ x: midX, y: fromOffset.y });
        points.push({ x: midX, y: midY });
        points.push({ x: toOffset.x - 20, y: midY });
        points.push({ x: toOffset.x - 20, y: toOffset.y });
      }
    } else if (fromDirection === 'left' && toDirection === 'right') {
      const midX = fromOffset.x + dx / 2;
      const midY = fromOffset.y + dy / 2;
      points.push({ x: fromOffset.x - 20, y: fromOffset.y });
      points.push({ x: fromOffset.x - 20, y: midY });
      points.push({ x: toOffset.x + 20, y: midY });
      points.push({ x: toOffset.x + 20, y: toOffset.y });
    } else {
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
  
  // Converts array of {x,y} points to SVG path data format
  // Used for rendering both permanent connections and temporary drag-preview lines
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

  // Subscribe to real-time product changes
  useEffect(() => {
    const unsubscribe = base44.entities.AVProduct.subscribe((event) => {
      queryClient.invalidateQueries({ queryKey: ['avProducts'] });
    });
    return unsubscribe;
  }, [queryClient]);

  // Project load handler
  const handleProjectLoad = (project) => {
    setCurrentProject(project);
    loadProject(project);
    setSelectedProduct(null);
    setSelectedConnection(null);
    setSelectedCanvasProduct(null);
  };



  const onDragEnd = (result) => {
    const { source, destination, draggableId } = result;

    // Ignore drag-drop operations if we're dragging an annotation
    if (annotationMouseDownRef.current !== null || draggingAnnotation !== null) {
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

  const validateConnection = (fromId, toId, connectionType) => {
    const errors = [];
    const warnings = [];

    const rawFromProduct = canvasProducts.find(cp => cp.instanceId === fromId);
    const rawToProduct = canvasProducts.find(cp => cp.instanceId === toId);

    if (!rawFromProduct || !rawToProduct) {
      errors.push("Invalid device selection");
      return { valid: false, errors, warnings };
    }

    const fromProduct = ensureNetworkInfo(rawFromProduct);
    const toProduct = ensureNetworkInfo(rawToProduct);
    const fromNetworkInfo = fromProduct.networkInfo;
    const toNetworkInfo = toProduct.networkInfo;

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
    
    const duplicateConnection = connections.find(c => 
      c.from === fromId && c.to === toId && c.type === connectionType
    );
    if (duplicateConnection) {
      warnings.push("A connection of this type already exists between these devices");
    }
    
    return { valid: errors.length === 0, errors, warnings };
  };

  const handleConnectionTypeSelect = async (connectionData) => {
    const validation = validateConnection(connectingFrom, connectingTo, connectionData.type);
    
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
    
    const prefix = connectionCategories[connectionData.type] || 'W';
    const existingOfType = connections.filter(c => {
      const cPrefix = connectionCategories[c.type] || 'W';
      return cPrefix === prefix;
    }).length;
    
    const wireId = `${prefix}${String(existingOfType + 1).padStart(3, '0')}`;
    
    setConnections([...connections, { 
      from: connectingFrom, 
      to: connectingTo,
      type: connectionData.type,
      fromPort: connectionData.fromPort,
      toPort: connectionData.toPort,
      wireId: wireId,
      wireSpec: connectionData.wireSpec || null
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

  const registerPort = (portId, element, instanceId, connectionType, portName, isInput) => {
    if (element) {
      portRefs.current.set(portId, { element, instanceId, connectionType, portName, isInput });
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

  const handlePortMouseDown = (instanceId, connectionType, portName, isInput, portElement) => {
    const startPos = getPortPosition(portElement);
    if (!startPos) return;

    const newState = {
      mode: 'connecting',
      fromPort: { instanceId, connectionType, portName, isInput },
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
  }, [zoom, pan]);

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

      const fromId = fromPort.isInput ? toPort.instanceId : fromPort.instanceId;
      const toId = fromPort.isInput ? fromPort.instanceId : toPort.instanceId;

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

      setPendingConnection({ fromId, toId, connectionType: fromPort.connectionType });
      setConnectingFrom(fromId);
      setConnectingTo(toId);
    }

    setConnectingState(null);
    connectingStateRef.current = null;
    setHoveredPortId(null);
  }, [canvasProducts, connections]);

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
    };

  const handleFloorplansUpdate = (updatedFloorplans) => {
    setFloorplans(updatedFloorplans);
    markLocalChange();
    // Immediately persist floorplan changes to database
    if (currentProject?.id) {
      base44.entities.AVProject.update(currentProject.id, {
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

  const handleMouseDown = (e) => {
    // Handle middle mouse button - double-click to center/reset, single-click to pan
    if (e.button === 1) {
      e.preventDefault();
      e.stopPropagation();
      
      const now = Date.now();
      const timeSinceLastClick = now - lastMiddleClickRef.current;
      
      if (timeSinceLastClick < 400) {
        // Double middle-click detected
        
        if (floorplans.length > 0) {
          // Calculate center of all visible floorplans with correct aspect ratio
          const visibleFloorplans = floorplans.filter(fp => fp.visible);
          if (visibleFloorplans.length > 0) {
            const bounds = visibleFloorplans.reduce((acc, fp) => {
              const pos = fp.position || { x: 0, y: 0 };
              const scale = fp.scale || 1;
              const hasDimensions = fp.imageWidth && fp.imageHeight;
              const hasCalibration = hasDimensions && fp.pixelsPerInch;
              let width, height;

              if (hasDimensions) {
                // Calculate width based on calibration or default
                if (hasCalibration) {
                  const scaleFactor = (1 / fp.pixelsPerInch) * scale;
                  width = fp.imageWidth * scaleFactor;
                } else {
                  width = 500 * scale;
                }
                // Always calculate height from width to preserve aspect ratio
                height = width * (fp.imageHeight / fp.imageWidth);
              } else {
                width = 500 * scale;
                height = 500 * scale;
              }

              return {
                minX: Math.min(acc.minX, pos.x),
                minY: Math.min(acc.minY, pos.y),
                maxX: Math.max(acc.maxX, pos.x + width),
                maxY: Math.max(acc.maxY, pos.y + height)
              };
            }, { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity });

            const centerX = (bounds.minX + bounds.maxX) / 2;
            const centerY = (bounds.minY + bounds.maxY) / 2;

            // Get canvas center
            const canvasRect = canvasRef.current?.getBoundingClientRect();
            if (canvasRect) {
              const viewportCenterX = canvasRect.width / 2;
              const viewportCenterY = canvasRect.height / 2;

              // Calculate pan to center floorplans at 100% zoom
              setPan({
                x: viewportCenterX - centerX,
                y: viewportCenterY - centerY
              });
              setZoom(1);
              toast.success('Centered floorplans at 100% zoom');
            }
          }
        }
        lastMiddleClickRef.current = 0;
        return;
      } else {
        lastMiddleClickRef.current = now;
      }
      
      // Allow middle-click panning anywhere on canvas
      handlePanStart(e, canvasRef.current);
      return;
    }
    
    // Only pan with other buttons when clicking on empty canvas space
    const isEmptySpace = e.target === e.currentTarget || 
                        e.target.tagName === 'svg' || 
                        e.target.getAttribute('data-canvas-background') === 'true';
    
    // Don't start panning if we might be dragging an annotation
    if (isEmptySpace && !draggingFloorplan && !annotationMouseDownRef.current) {
      handlePanStart(e, canvasRef.current);
    }
  };

  // Helper: Convert canvas coordinates to floorplan-relative coordinates
  const canvasToFloorplanCoords = (canvasX, canvasY, floorplan) => {
    if (!floorplan) return { x: canvasX, y: canvasY };
    
    const fpPos = floorplan.position || { x: 0, y: 0 };
    const fpScale = floorplan.scale || 1;
    
    // Calculate floorplan dimensions
    let fpWidth, fpHeight;
    const hasCalibration = floorplan.imageWidth && floorplan.imageHeight && floorplan.pixelsPerInch;
    if (hasCalibration) {
      const scaleFactor = (1 / floorplan.pixelsPerInch) * fpScale;
      fpWidth = floorplan.imageWidth * scaleFactor;
      fpHeight = floorplan.imageHeight * scaleFactor;
    } else if (floorplan.imageWidth && floorplan.imageHeight) {
      fpWidth = 500 * fpScale;
      fpHeight = fpWidth * (floorplan.imageHeight / floorplan.imageWidth);
    } else {
      fpWidth = 500 * fpScale;
      fpHeight = 500 * fpScale;
    }
    
    // Convert to floorplan-relative coordinates (0-1 normalized)
    const relX = (canvasX - fpPos.x) / fpWidth;
    const relY = (canvasY - fpPos.y) / fpHeight;
    
    return { x: relX, y: relY };
  };

  // Helper: Convert floorplan-relative coordinates to canvas coordinates
  const floorplanToCanvasCoords = (relX, relY, floorplan) => {
    if (!floorplan) return { x: relX, y: relY };
    
    const fpPos = floorplan.position || { x: 0, y: 0 };
    const fpScale = floorplan.scale || 1;
    
    // Calculate floorplan dimensions
    let fpWidth, fpHeight;
    const hasCalibration = floorplan.imageWidth && floorplan.imageHeight && floorplan.pixelsPerInch;
    if (hasCalibration) {
      const scaleFactor = (1 / floorplan.pixelsPerInch) * fpScale;
      fpWidth = floorplan.imageWidth * scaleFactor;
      fpHeight = floorplan.imageHeight * scaleFactor;
    } else if (floorplan.imageWidth && floorplan.imageHeight) {
      fpWidth = 500 * fpScale;
      fpHeight = fpWidth * (floorplan.imageHeight / floorplan.imageWidth);
    } else {
      fpWidth = 500 * fpScale;
      fpHeight = 500 * fpScale;
    }
    
    // Convert to canvas coordinates
    const canvasX = fpPos.x + relX * fpWidth;
    const canvasY = fpPos.y + relY * fpHeight;
    
    return { x: canvasX, y: canvasY };
  };

  // Helper: Find which floorplan a canvas point is on
  const getFloorplanAtPoint = (canvasX, canvasY) => {
    // Check floorplans in reverse order (top to bottom z-order)
    for (let i = floorplans.length - 1; i >= 0; i--) {
      const fp = floorplans[i];
      if (!fp.visible) continue;
      
      const fpPos = fp.position || { x: 0, y: 0 };
      const fpScale = fp.scale || 1;
      
      let fpWidth, fpHeight;
      const hasCalibration = fp.imageWidth && fp.imageHeight && fp.pixelsPerInch;
      if (hasCalibration) {
        const scaleFactor = (1 / fp.pixelsPerInch) * fpScale;
        fpWidth = fp.imageWidth * scaleFactor;
        fpHeight = fp.imageHeight * scaleFactor;
      } else if (fp.imageWidth && fp.imageHeight) {
        fpWidth = 500 * fpScale;
        fpHeight = fpWidth * (fp.imageHeight / fp.imageWidth);
      } else {
        fpWidth = 500 * fpScale;
        fpHeight = 500 * fpScale;
      }
      
      if (canvasX >= fpPos.x && canvasX <= fpPos.x + fpWidth &&
          canvasY >= fpPos.y && canvasY <= fpPos.y + fpHeight) {
        return fp;
      }
    }
    return null;
  };

  const handleCanvasClick = (e) => {
    // Handle text tool click
    if (activeTool === 'text' && currentProject) {
      const canvasRect = canvasRef.current?.getBoundingClientRect();
      if (canvasRect) {
        const canvasX = (e.clientX - canvasRect.left - pan.x) / zoom;
        const canvasY = (e.clientY - canvasRect.top - pan.y) / zoom;
        
        const floorplan = getFloorplanAtPoint(canvasX, canvasY);
        const fpCoords = floorplan ? canvasToFloorplanCoords(canvasX, canvasY, floorplan) : { x: canvasX, y: canvasY };
        
        const newAnnotation = {
          id: Date.now().toString(),
          type: 'text',
          floorplanId: floorplan?.id,
          position: fpCoords,
          text: 'Text',
          color: annotationColor,
          fontSize: annotationFontSize
        };
        setAnnotations([...annotations, newAnnotation]);
        setEditingText(newAnnotation.id);
        markLocalChange();
      }
      return;
    }
    
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

  // Touch handlers for pinch-to-zoom and pan
  const handleCanvasTouchStart = (e) => {
    // Prevent default only if we have multiple touches (pinch)
    if (e.touches.length > 1) {
      e.preventDefault();
    }
    
    // Double-tap to center (similar to middle-click double-click)
    if (e.touches.length === 1) {
      const now = Date.now();
      const timeSinceLastTap = now - lastTapRef.current;
      
      if (timeSinceLastTap < 300) {
        // Double-tap detected - center on floorplans
        e.preventDefault();
        if (floorplans.length > 0) {
          const visibleFloorplans = floorplans.filter(fp => fp.visible);
          if (visibleFloorplans.length > 0) {
            const bounds = visibleFloorplans.reduce((acc, fp) => {
              const pos = fp.position || { x: 0, y: 0 };
              const scale = fp.scale || 1;
              const hasDimensions = fp.imageWidth && fp.imageHeight;
              const hasCalibration = hasDimensions && fp.pixelsPerInch;
              let width, height;

              if (hasDimensions) {
                if (hasCalibration) {
                  const scaleFactor = (1 / fp.pixelsPerInch) * scale;
                  width = fp.imageWidth * scaleFactor;
                } else {
                  width = 500 * scale;
                }
                height = width * (fp.imageHeight / fp.imageWidth);
              } else {
                width = 500 * scale;
                height = 500 * scale;
              }

              return {
                minX: Math.min(acc.minX, pos.x),
                minY: Math.min(acc.minY, pos.y),
                maxX: Math.max(acc.maxX, pos.x + width),
                maxY: Math.max(acc.maxY, pos.y + height)
              };
            }, { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity });

            const centerX = (bounds.minX + bounds.maxX) / 2;
            const centerY = (bounds.minY + bounds.maxY) / 2;

            const canvasRect = canvasRef.current?.getBoundingClientRect();
            if (canvasRect) {
              const viewportCenterX = canvasRect.width / 2;
              const viewportCenterY = canvasRect.height / 2;

              setPan({
                x: viewportCenterX - centerX,
                y: viewportCenterY - centerY
              });
              setZoom(1);
              toast.success('Centered on floorplans');
            }
          }
        }
        lastTapRef.current = 0;
        return;
      } else {
        lastTapRef.current = now;
      }
    }
    
    handleCanvasTouchStartPan(e, canvasRef.current);
  };

  const handleCanvasTouchMove = (e) => {
    // Only prevent default for multi-touch (pinch)
    if (e.touches.length > 1) {
      e.preventDefault();
    }
    handleCanvasTouchMovePan(e, canvasRef.current);
  };

  const handleCanvasTouchEnd = () => {
    handleCanvasTouchEndPan();
  };

  useEffect(() => {
    connectingStateRef.current = connectingState;
  }, [connectingState]);

  // Prevent browser selection during canvas interactions (works instantly)
  useEffect(() => {
    const preventSelect = (e) => {
      if (document.body.classList.contains('canvas-dragging')) {
        e.preventDefault();
      }
    };
    document.addEventListener('selectstart', preventSelect);
    return () => document.removeEventListener('selectstart', preventSelect);
  }, []);

  const connectionsByCategory = CONNECTIONS_BY_CATEGORY;
  const CARD_WIDTH = 320, CARD_HEIGHT = 280, PORT_DOT_SIZE = 20, PORT_GAP = 12;

  // Calculates world position of a connection port on the canvas
  // Used to position connection line endpoints and determine visual port locations
  const getPortWorldPosition = (instanceId, connectionType, isOutput) => {
    const product = canvasProducts.find(cp => cp.instanceId === instanceId);
    if (!product) return null;

    const defaultConnections = connectionsByCategory[product.product.category] || { inputs: [], outputs: [] };
    const hasDbConnections = (product.product.input_connections?.length > 0) || 
                              (product.product.output_connections?.length > 0);
    // NOTE: Database connections might have string ports from legacy data, so normalize to {id, label, direction} objects
    // This prevents React error #31 which occurs when component children use inconsistent data types
    let conns = hasDbConnections ? {
      inputs: (product.product.input_connections || []).map(conn => ({
        type: conn.type,
        ports: (conn.ports || []).map(p => typeof p === 'string' ? { id: p, label: p, direction: 'input' } : p)
      })),
      outputs: (product.product.output_connections || []).map(conn => ({
        type: conn.type,
        ports: (conn.ports || []).map(p => typeof p === 'string' ? { id: p, label: p, direction: 'output' } : p)
      }))
    } : defaultConnections;

    const types = isOutput ? conns.outputs : conns.inputs;
    // Normalize ports to objects - ensures consistent data structure throughout rendering
    // Handles both old string format and new {id, label, direction} object format
    const normalizedTypes = types.map(t => ({
      ...t,
      ports: (t.ports || []).map(p => typeof p === 'string' ? { id: p, label: p, direction: isOutput ? 'output' : 'input' } : p)
    }));
    const portIndex = normalizedTypes.findIndex(t => t.type === connectionType);
    
    if (portIndex === -1) return null;

    const totalPorts = Math.min(normalizedTypes.length, 6);
    const totalHeight = (totalPorts - 1) * (PORT_DOT_SIZE + PORT_GAP);
    const startY = product.position.y + CARD_HEIGHT / 2 - totalHeight / 2;
    const portY = startY + portIndex * (PORT_DOT_SIZE + PORT_GAP);

    const portX = isOutput 
      ? product.position.x + CARD_WIDTH + PORT_DOT_SIZE / 2
      : product.position.x - PORT_DOT_SIZE / 2;

    return { x: portX, y: portY };
  };

  // Wrapper for consistency - gets port position by connection type
  // Delegates to getPortWorldPosition for actual calculation
  const getConnectionPointPosition = (instanceId, connectionType, portName, isOutput) => {
    return getPortWorldPosition(instanceId, connectionType, isOutput);
  };

  // Pre-calculates all connection endpoint positions and edge sides (for visual routing)
  // Cached to avoid recalculating during every render
  const connectionPositions = connections.map((connection, index) => {
    const fromProduct = canvasProducts.find(cp => cp.instanceId === connection.from);
    const toProduct = canvasProducts.find(cp => cp.instanceId === connection.to);

    if (!fromProduct || !toProduct) return { fromPoint: null, toPoint: null, fromEdge: null, toEdge: null };

    const fromPoint = getConnectionPointPosition(connection.from, connection.type, connection.fromPort, true);
    const toPoint = getConnectionPointPosition(connection.to, connection.type, connection.toPort, false);

    let fromEdge = null, toEdge = null;

    if (fromPoint) {
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

    if (toPoint) {
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

    return { fromPoint, toPoint, fromEdge, toEdge };
  });

  // Calculates which edge of a product card a connection should exit/enter
  // Determines smart routing by finding which devices are connected and their relative positions
  const getProductEdgePoint = (fromId, toId, connectionIndex) => {
    const connection = connections[connectionIndex];
    if (!connection) return { from: { x: 0, y: 0 }, to: { x: 0, y: 0 } };

    const { fromPoint, toPoint } = connectionPositions[connectionIndex] || {};
    if (fromPoint && toPoint) return { from: fromPoint, to: toPoint };

    const fromProduct = canvasProducts.find(cp => cp.instanceId === fromId);
    const toProduct = canvasProducts.find(cp => cp.instanceId === toId);
    if (!fromProduct || !toProduct) return { from: { x: 0, y: 0 }, to: { x: 0, y: 0 } };

    const fromCenter = {
      x: fromProduct.position.x + CARD_WIDTH / 2,
      y: fromProduct.position.y + CARD_HEIGHT / 2
    };

    const toCenter = {
      x: toProduct.position.x + CARD_WIDTH / 2,
      y: toProduct.position.y + CARD_HEIGHT / 2
    };

    const dx = toCenter.x - fromCenter.x;
    const dy = toCenter.y - fromCenter.y;

    // Helper: Finds all connections on a specific edge, used to distribute multiple wires
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
          x: otherProduct.position.x + CARD_WIDTH / 2,
          y: otherProduct.position.y + CARD_HEIGHT / 2
        };
        const deviceCenter = {
          x: deviceProduct.position.x + CARD_WIDTH / 2,
          y: deviceProduct.position.y + CARD_HEIGHT / 2
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

        if (matchesEdge) indices.push(idx);
      });
      return indices.sort((a, b) => a - b);
    };

    let fromEdge, toEdge;

    if (Math.abs(dx) > Math.abs(dy)) {
      if (dx > 0) {
        const fromIndices = getEdgeConnectionIndices(fromId, 'right');
        const toIndices = getEdgeConnectionIndices(toId, 'left');
        const fromPosition = fromIndices.indexOf(connectionIndex);
        const toPosition = toIndices.indexOf(connectionIndex);
        const fromTotal = fromIndices.length;
        const toTotal = toIndices.length;

        const fromOffset = fromTotal > 1 ? ((fromPosition - (fromTotal - 1) / 2) * 30) : 0;
        const toOffset = toTotal > 1 ? ((toPosition - (toTotal - 1) / 2) * 30) : 0;

        fromEdge = { x: fromProduct.position.x + CARD_WIDTH, y: fromCenter.y + fromOffset };
        toEdge = { x: toProduct.position.x, y: toCenter.y + toOffset };
      } else {
        const fromIndices = getEdgeConnectionIndices(fromId, 'left');
        const toIndices = getEdgeConnectionIndices(toId, 'right');
        const fromPosition = fromIndices.indexOf(connectionIndex);
        const toPosition = toIndices.indexOf(connectionIndex);
        const fromTotal = fromIndices.length;
        const toTotal = toIndices.length;

        const fromOffset = fromTotal > 1 ? ((fromPosition - (fromTotal - 1) / 2) * 30) : 0;
        const toOffset = toTotal > 1 ? ((toPosition - (toTotal - 1) / 2) * 30) : 0;

        fromEdge = { x: fromProduct.position.x, y: fromCenter.y + fromOffset };
        toEdge = { x: toProduct.position.x + CARD_WIDTH, y: toCenter.y + toOffset };
      }
    } else {
      if (dy > 0) {
        const fromIndices = getEdgeConnectionIndices(fromId, 'bottom');
        const toIndices = getEdgeConnectionIndices(toId, 'top');
        const fromPosition = fromIndices.indexOf(connectionIndex);
        const toPosition = toIndices.indexOf(connectionIndex);
        const fromTotal = fromIndices.length;
        const toTotal = toIndices.length;

        const fromOffset = fromTotal > 1 ? ((fromPosition - (fromTotal - 1) / 2) * 30) : 0;
        const toOffset = toTotal > 1 ? ((toPosition - (toTotal - 1) / 2) * 30) : 0;

        fromEdge = { x: fromCenter.x + fromOffset, y: fromProduct.position.y + CARD_HEIGHT };
        toEdge = { x: toCenter.x + toOffset, y: toProduct.position.y };
      } else {
        const fromIndices = getEdgeConnectionIndices(fromId, 'top');
        const toIndices = getEdgeConnectionIndices(toId, 'bottom');
        const fromPosition = fromIndices.indexOf(connectionIndex);
        const toPosition = toIndices.indexOf(connectionIndex);
        const fromTotal = fromIndices.length;
        const toTotal = toIndices.length;

        const fromOffset = fromTotal > 1 ? ((fromPosition - (fromTotal - 1) / 2) * 30) : 0;
        const toOffset = toTotal > 1 ? ((toPosition - (toTotal - 1) / 2) * 30) : 0;

        fromEdge = { x: fromCenter.x + fromOffset, y: fromProduct.position.y };
        toEdge = { x: toCenter.x + toOffset, y: toProduct.position.y + CARD_HEIGHT };
      }
    }

    return { from: fromEdge, to: toEdge };
  };

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className="flex h-[100dvh] w-full bg-gray-950 overflow-hidden">
        {/* Mobile overlay sidebar - Hidden on mobile view-only mode */}
        {!isMobile && (
        <div className={`fixed md:relative inset-y-0 left-0 z-50 transition-transform duration-300 ${showSidebar ? 'translate-x-0' : '-translate-x-full md:translate-x-0'} ${showSidebar ? 'w-full sm:w-96 md:w-auto' : 'md:w-0'}`}>
          {(showSidebar || window.innerWidth >= 768) && (
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
                  setShowSidebar(false); // Close sidebar on mobile after selection
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
                          await base44.entities.AVProject.update(currentProject.id, {
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
              {/* Floorplans Layer */}
              <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 10, pointerEvents: 'none', overflow: 'visible' }}>
                {annotations.map((ann, idx) => {
                  const isHovered = hoveredAnnotation === idx;
                  const isSelected = selectedAnnotation === idx;

                  const floorplan = ann.floorplanId ? floorplans.find(fp => fp.id === ann.floorplanId) : null;
                  if (ann.floorplanId && (!floorplan || !floorplan.visible)) return null;
                  if (ann.hidden) return null;

                  const canvasPos = floorplan 
                    ? floorplanToCanvasCoords(ann.position.x, ann.position.y, floorplan)
                    : ann.position;

                  const isLocked = ann.locked && !isMobile;

                  const handleAnnotationClick = (e) => {
                    if (activeTool === 'select' && !isLocked) {
                      e.stopPropagation();
                      setSelectedAnnotation(idx);
                      setSelectedProduct(null);
                      setSelectedCanvasProduct(null);
                      setSelectedConnection(null);
                      setShowFloorplanManager(false);
                      setShowRoomManager(false);
                      setSelectedFloorplanId(null);
                      setPanelHistory([{ panel: 'annotationDetails', index: idx }]);
                      if (!isMobile) {
                        handleSymbolAnnotationDragStart(e, idx);
                      }
                    }
                  };

                  const handleAnnotationTouch = (e) => {
                    if (activeTool === 'select' && !isLocked) {
                      e.stopPropagation();
                      setSelectedAnnotation(idx);
                      setSelectedProduct(null);
                      setSelectedCanvasProduct(null);
                      setSelectedConnection(null);
                      setShowFloorplanManager(false);
                      setShowRoomManager(false);
                      setSelectedFloorplanId(null);
                      setPanelHistory([{ panel: 'annotationDetails', index: idx }]);
                      handleAnnotationTouchStart(e, idx);
                    }
                  };

                  // Render symbols only (SVG annotations rendered below)
                  if (ann.type === 'symbol') {
                    const symbolSize = 120;
                    
                    const handleSymbolMouseDown = (e) => {
                      if (activeTool !== 'select' || isLocked) return;
                      e.preventDefault();
                      e.stopPropagation();
                      setSelectedAnnotation(idx);
                      setSelectedProduct(null);
                      setSelectedCanvasProduct(null);
                      setSelectedConnection(null);
                      setShowFloorplanManager(false);
                      setShowRoomManager(false);
                      setSelectedFloorplanId(null);
                      setPanelHistory([{ panel: 'annotationDetails', index: idx }]);
                      if (!isMobile) {
                        handleSymbolAnnotationDragStart(e, idx);
                      }
                    };

                    const handleSymbolClick = (e) => {
                      if (activeTool !== 'select' || isLocked) return;
                      e.preventDefault();
                      e.stopPropagation();
                    };
                    
                    return (
                      <div key={ann.id}
                        className={isLocked ? 'cursor-not-allowed' : 'cursor-move'}
                        onMouseEnter={() => !isLocked && setHoveredAnnotation(idx)}
                        onMouseLeave={() => setHoveredAnnotation(null)}
                        onMouseDown={handleSymbolMouseDown}
                        onClick={handleSymbolClick}
                        onTouchStart={handleAnnotationTouch}
                        onTouchEnd={handleAnnotationTouchEnd}
                        style={{
                          position: 'absolute',
                          left: `${canvasPos.x}px`,
                          top: `${canvasPos.y}px`,
                          width: `${symbolSize}px`,
                          height: `${symbolSize}px`,
                          transform: 'translate(-50%, -50%)',
                          zIndex: 1200,
                          pointerEvents: 'auto'
                        }}
                      >
                        <svg width="100%" height="100%" viewBox="-60 -60 120 120" style={{ overflow: 'visible', display: 'block' }}>
                          <SymbolRenderer 
                            symbolId={ann.symbolId} 
                            position={{ x: 0, y: 0 }}
                            color={isSelected ? '#ef4444' : (ann.color || '#3b82f6')}
                            scale={ann.scale || 1}
                            rotation={ann.rotation || 0}
                            flipped={ann.flipped || false}
                          />
                        </svg>
                      </div>
                    );
                  }
                  
                  return null;
                })}

                {/* SVG annotations (non-symbols) */}
                 <svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', overflow: 'visible', zIndex: 1200 }}>
                {annotations.map((ann, idx) => {
                  const isHovered = hoveredAnnotation === idx;
                  const isSelected = selectedAnnotation === idx;
                  const strokeColor = isHovered || isSelected ? '#ef4444' : ann.color;

                  const floorplan = ann.floorplanId ? floorplans.find(fp => fp.id === ann.floorplanId) : null;
                  if (ann.floorplanId && (!floorplan || !floorplan.visible)) return null;
                  if (ann.hidden) return null;

                  const canvasPos = floorplan 
                    ? floorplanToCanvasCoords(ann.position.x, ann.position.y, floorplan)
                    : ann.position;

                  const isLocked = ann.locked && !isMobile;

                  const handleAnnotationClick = (e) => {
                    if (activeTool === 'select' && !isLocked) {
                      e.stopPropagation();
                      setSelectedAnnotation(idx);
                      setSelectedProduct(null);
                      setSelectedCanvasProduct(null);
                      setSelectedConnection(null);
                      setShowFloorplanManager(false);
                      setShowRoomManager(false);
                      setSelectedFloorplanId(null);
                      setPanelHistory([{ panel: 'annotationDetails', index: idx }]);
                      if (!isMobile) {
                        handleSymbolAnnotationDragStart(e, idx);
                      }
                    }
                  };

                  const handleAnnotationTouch = (e) => {
                    if (activeTool === 'select' && !isLocked) {
                      e.stopPropagation();
                      setSelectedAnnotation(idx);
                      setSelectedProduct(null);
                      setSelectedCanvasProduct(null);
                      setSelectedConnection(null);
                      setShowFloorplanManager(false);
                      setShowRoomManager(false);
                      setSelectedFloorplanId(null);
                      setPanelHistory([{ panel: 'annotationDetails', index: idx }]);
                      handleAnnotationTouchStart(e, idx);
                    }
                  };

                  // Skip symbols and snapshots (rendered as DOM elements above)
                  if (ann.type === 'symbol' || ann.type === 'snapshot') return null;

                  if (ann.type === 'text') {
                    return (
                      <text key={ann.id}
                        x={canvasPos.x}
                        y={canvasPos.y}
                        fill={ann.color}
                        fontSize={ann.fontSize}
                        fontWeight="500"
                        className={`pointer-events-auto select-none ${isLocked ? 'cursor-not-allowed' : 'cursor-move'}`}
                        onMouseEnter={() => !isLocked && setHoveredAnnotation(idx)}
                        onMouseLeave={() => setHoveredAnnotation(null)}
                        onMouseDown={handleAnnotationClick}
                        onTouchStart={handleAnnotationTouch}
                        onTouchEnd={handleAnnotationTouchEnd}
                        onDoubleClick={(e) => {
                          e.stopPropagation();
                          if (activeTool === 'select' || activeTool === 'text') {
                            setEditingText(ann.id);
                          }
                        }}
                      >
                        {ann.text}
                      </text>
                    );
                  }

                  if (ann.type === 'rectangle') {
                    let canvasWidth, canvasHeight;
                    if (floorplan) {
                      const fpScale = floorplan.scale || 1;
                      const hasCalibration = floorplan.imageWidth && floorplan.imageHeight && floorplan.pixelsPerInch;
                      let fpWidth, fpHeight;
                      if (hasCalibration) {
                        const scaleFactor = (1 / floorplan.pixelsPerInch) * fpScale;
                        fpWidth = floorplan.imageWidth * scaleFactor;
                        fpHeight = floorplan.imageHeight * scaleFactor;
                      } else if (floorplan.imageWidth && floorplan.imageHeight) {
                        fpWidth = 500 * fpScale;
                        fpHeight = fpWidth * (floorplan.imageHeight / floorplan.imageWidth);
                      } else {
                        fpWidth = 500 * fpScale;
                        fpHeight = 500 * fpScale;
                      }
                      canvasWidth = ann.width * fpWidth;
                      canvasHeight = ann.height * fpHeight;
                    } else {
                      canvasWidth = ann.width || 0;
                      canvasHeight = ann.height || 0;
                    }

                    return (
                      <g key={ann.id}>
                        <rect
                          x={canvasPos.x - 10}
                          y={canvasPos.y - 10}
                          width={canvasWidth + 20}
                          height={canvasHeight + 20}
                          fill="transparent"
                          className={`pointer-events-auto ${isLocked ? 'cursor-not-allowed' : 'cursor-move'}`}
                          onMouseEnter={() => !isLocked && setHoveredAnnotation(idx)}
                          onMouseLeave={() => setHoveredAnnotation(null)}
                          onMouseDown={handleAnnotationClick}
                          onTouchStart={handleAnnotationTouch}
                          onTouchEnd={handleAnnotationTouchEnd}
                        />
                        <rect
                          x={canvasPos.x}
                          y={canvasPos.y}
                          width={canvasWidth}
                          height={canvasHeight}
                          stroke={strokeColor}
                          strokeWidth={ann.strokeWidth}
                          fill={ann.fill ? ann.color : 'none'}
                          fillOpacity={ann.fill ? 0.3 : 0}
                          className="pointer-events-none"
                        />
                      </g>
                    );
                  }

                  if (ann.type === 'circle') {
                    let canvasRadius;
                    if (floorplan) {
                      const fpScale = floorplan.scale || 1;
                      const hasCalibration = floorplan.imageWidth && floorplan.imageHeight && floorplan.pixelsPerInch;
                      let fpWidth;
                      if (hasCalibration) {
                        const scaleFactor = (1 / floorplan.pixelsPerInch) * fpScale;
                        fpWidth = floorplan.imageWidth * scaleFactor;
                      } else {
                        fpWidth = 500 * fpScale;
                      }
                      canvasRadius = ann.radius * fpWidth;
                    } else {
                      canvasRadius = ann.radius || 0;
                    }

                    return (
                      <g key={ann.id}>
                        <circle
                          cx={canvasPos.x}
                          cy={canvasPos.y}
                          r={canvasRadius + 10}
                          fill="transparent"
                          className={`pointer-events-auto ${isLocked ? 'cursor-not-allowed' : 'cursor-move'}`}
                          onMouseEnter={() => !isLocked && setHoveredAnnotation(idx)}
                          onMouseLeave={() => setHoveredAnnotation(null)}
                          onMouseDown={handleAnnotationClick}
                          onTouchStart={handleAnnotationTouch}
                          onTouchEnd={handleAnnotationTouchEnd}
                        />
                        <circle
                          cx={canvasPos.x}
                          cy={canvasPos.y}
                          r={canvasRadius}
                          stroke={strokeColor}
                          strokeWidth={ann.strokeWidth}
                          fill={ann.fill ? ann.color : 'none'}
                          fillOpacity={ann.fill ? 0.3 : 0}
                          className="pointer-events-none"
                        />
                      </g>
                    );
                  }

                  if (ann.type === 'line' && ann.endPosition) {
                    const endCanvasPos = floorplan 
                      ? floorplanToCanvasCoords(ann.endPosition.x, ann.endPosition.y, floorplan)
                      : ann.endPosition;
                    
                    return (
                      <g key={ann.id}>
                        <line
                          x1={canvasPos.x}
                          y1={canvasPos.y}
                          x2={endCanvasPos.x}
                          y2={endCanvasPos.y}
                          stroke={strokeColor}
                          strokeWidth={isHovered || isSelected ? ann.strokeWidth + 1 : ann.strokeWidth}
                          className="pointer-events-none"
                        />
                        <line
                          x1={canvasPos.x}
                          y1={canvasPos.y}
                          x2={endCanvasPos.x}
                          y2={endCanvasPos.y}
                          stroke="transparent"
                          strokeWidth="40"
                          className={`pointer-events-auto ${isLocked ? 'cursor-not-allowed' : 'cursor-move'}`}
                          onMouseEnter={() => !isLocked && setHoveredAnnotation(idx)}
                          onMouseLeave={() => setHoveredAnnotation(null)}
                          onMouseDown={handleAnnotationClick}
                          onTouchStart={handleAnnotationTouch}
                          onTouchEnd={handleAnnotationTouchEnd}
                        />
                      </g>
                    );
                  }

                  return null;
                })}
                </svg>

                {floorplans.filter(fp => fp.visible).map((fp, index) => {
                  // Check if this floorplan is being resized
                  const isThisOneResizing = resizingRef.current?.id === fp.id;
                  const currentScale = isThisOneResizing ? resizeOffset.scale : ((typeof fp.scale === 'number' && !isNaN(fp.scale) && fp.scale > 0) ? fp.scale : 1);

                  // Ensure valid position values (handle NaN, undefined, null)
                  const safePosition = {
                    x: (typeof fp.position?.x === 'number' && !isNaN(fp.position.x)) ? fp.position.x : 100,
                    y: (typeof fp.position?.y === 'number' && !isNaN(fp.position.y)) ? fp.position.y : 100
                  };
                  const currentPosition = isThisOneResizing ? resizeOffset.position : safePosition;

                  // Always preserve aspect ratio if dimensions are available
                  const hasCalibration = fp.imageWidth && fp.imageHeight && fp.pixelsPerInch;
                  const hasDimensions = fp.imageWidth && fp.imageHeight;
                  let displayWidth, displayHeight;

                  if (hasDimensions) {
                    // Calculate width based on calibration or default
                    if (hasCalibration) {
                      const scaleFactor = (1 / fp.pixelsPerInch) * currentScale;
                      displayWidth = fp.imageWidth * scaleFactor;
                    } else {
                      displayWidth = 500 * currentScale;
                    }
                    // Always calculate height from width to preserve aspect ratio
                    displayHeight = displayWidth * (fp.imageHeight / fp.imageWidth);
                  } else {
                    // No dimensions yet - square placeholder
                    displayWidth = 500 * currentScale;
                    displayHeight = 500 * currentScale;
                  }

                  let renderWidth = displayWidth;
                  let renderHeight = displayHeight;

                  // Only this specific floorplan gets the drag offset applied
                  const isThisOneDragging = draggingFloorplan === fp.id;
                  const currentX = isThisOneDragging && floorplanDragStart ? floorplanDragOffset.x : currentPosition.x;
                  const currentY = isThisOneDragging && floorplanDragStart ? floorplanDragOffset.y : currentPosition.y;
                  const isSelected = selectedFloorplanId === fp.id;

                  return (
                    <div
                      key={fp.id}
                      data-floorplan="true"
                      data-floorplan-id={fp.id}
                      onMouseDown={(e) => handleFloorplanMouseDown(e, fp.id)}
                      onClick={(e) => handleFloorplanClick(e, fp.id)}
                      style={{
                        position: 'absolute',
                        top: `${currentY}px`,
                        left: `${currentX}px`,
                        width: `${renderWidth}px`,
                        height: `${renderHeight}px`,
                        pointerEvents: 'auto',
                        cursor: isThisOneDragging ? 'grabbing' : 'grab',
                        outline: isSelected ? '3px solid #3b82f6' : 'none',
                        outlineOffset: isSelected ? '4px' : '0',
                        boxShadow: isSelected ? '0 0 20px rgba(59, 130, 246, 0.5)' : 'none',
                        zIndex: isSelected ? 1000 : index,
                        transition: isThisOneDragging || resizingFloorplan?.id === fp.id ? 'none' : 'all 0.2s ease',
                        flexShrink: 0,
                        overflow: 'visible',
                        backgroundColor: '#000'
                      }}
                      >
                      <img 
                        src={fp.url} 
                        alt={fp.name}
                        onLoad={(e) => {
                          // Capture natural dimensions if missing
                          if (!fp.imageWidth || !fp.imageHeight) {
                            const updatedFloorplans = floorplans.map(f => 
                              f.id === fp.id 
                                ? { ...f, imageWidth: e.target.naturalWidth, imageHeight: e.target.naturalHeight }
                                : f
                            );
                            setFloorplans(updatedFloorplans);
                            if (currentProject?.id) {
                              setCurrentProject(curr => ({ ...curr, floorplans: updatedFloorplans }));
                              base44.entities.AVProject.update(currentProject.id, {
                                floorplans: updatedFloorplans
                              }).catch(err => console.error('Failed to update floorplan dimensions:', err));
                            }
                          }
                        }}
                        style={{
                          width: '100%',
                          height: '100%',
                          opacity: fp.opacity,
                          filter: fp.locked ? 'brightness(0.8)' : 'none',
                          display: 'block',
                          pointerEvents: 'none'
                        }}
                      />

                      {isSelected && !fp.locked && (
                        <>
                          {/* Corner resize handles */}
                          <div
                            data-resize-handle="nw"
                            onMouseDown={(e) => {
                              if (e.button !== 0) return;
                              e.preventDefault();
                              e.stopPropagation();
                              handleResizeStart(e, fp.id, 'nw');
                            }}
                            style={{
                              position: 'absolute',
                              top: '-6px',
                              left: '-6px',
                              width: '12px',
                              height: '12px',
                              cursor: 'nw-resize',
                              zIndex: 1003,
                              background: '#3b82f6',
                              border: '2px solid white',
                              borderRadius: '50%',
                              boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
                            }}
                          />
                          <div
                            data-resize-handle="ne"
                            onMouseDown={(e) => {
                              if (e.button !== 0) return;
                              e.preventDefault();
                              e.stopPropagation();
                              handleResizeStart(e, fp.id, 'ne');
                            }}
                            style={{
                              position: 'absolute',
                              top: '-6px',
                              right: '-6px',
                              width: '12px',
                              height: '12px',
                              cursor: 'ne-resize',
                              zIndex: 1003,
                              background: '#3b82f6',
                              border: '2px solid white',
                              borderRadius: '50%',
                              boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
                            }}
                          />
                          <div
                            data-resize-handle="sw"
                            onMouseDown={(e) => {
                              if (e.button !== 0) return;
                              e.preventDefault();
                              e.stopPropagation();
                              handleResizeStart(e, fp.id, 'sw');
                            }}
                            style={{
                              position: 'absolute',
                              bottom: '-6px',
                              left: '-6px',
                              width: '12px',
                              height: '12px',
                              cursor: 'sw-resize',
                              zIndex: 1003,
                              background: '#3b82f6',
                              border: '2px solid white',
                              borderRadius: '50%',
                              boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
                            }}
                          />
                          <div
                            data-resize-handle="se"
                            onMouseDown={(e) => {
                              if (e.button !== 0) return;
                              e.preventDefault();
                              e.stopPropagation();
                              handleResizeStart(e, fp.id, 'se');
                            }}
                            style={{
                              position: 'absolute',
                              bottom: '-6px',
                              right: '-6px',
                              width: '12px',
                              height: '12px',
                              cursor: 'se-resize',
                              zIndex: 1003,
                              background: '#3b82f6',
                              border: '2px solid white',
                              borderRadius: '50%',
                              boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
                            }}
                          />
                        </>
                      )}
                    </div>
                  );
                })}

                {/* Symbol Legends - rendered within canvas transform */}
                {floorplans.filter(fp => fp.visible).map(floorplan => {
                  const fpPos = floorplan.position || { x: 0, y: 0 };
                  const fpScale = floorplan.scale || 1;
                  
                  let fpWidth, fpHeight;
                  const hasCalibration = floorplan.imageWidth && floorplan.imageHeight && floorplan.pixelsPerInch;
                  if (hasCalibration) {
                    const scaleFactor = (1 / floorplan.pixelsPerInch) * fpScale;
                    fpWidth = floorplan.imageWidth * scaleFactor;
                    fpHeight = floorplan.imageHeight * scaleFactor;
                  } else if (floorplan.imageWidth && floorplan.imageHeight) {
                    fpWidth = 500 * fpScale;
                    fpHeight = fpWidth * (floorplan.imageHeight / floorplan.imageWidth);
                  } else {
                    fpWidth = 500 * fpScale;
                    fpHeight = 500 * fpScale;
                  }
                  
                  // Fixed spacing from bottom-left corner (20px in floorplan space)
                  const spacing = 20;
                  const legendCanvasX = fpPos.x + spacing;
                  const legendCanvasY = fpPos.y + fpHeight - spacing;
                  
                  return (
                    <div key={floorplan.id} style={{
                      position: 'absolute',
                      left: `${legendCanvasX}px`,
                      top: `${legendCanvasY}px`,
                      transform: 'translateY(-100%)',
                      transformOrigin: 'bottom left',
                      pointerEvents: 'auto',
                      zIndex: 1000
                    }}>
                      <SymbolLegend annotations={annotations} floorplans={floorplans} floorplanId={floorplan.id} />
                    </div>
                  );
                })}
              </div>
            </div>

            <svg className="absolute pointer-events-none" style={{ zIndex: 1, top: 0, left: 0, width: '100%', height: '100%', minWidth: '4000px', minHeight: '4000px', overflow: 'visible' }}>
              <g style={{ pointerEvents: 'auto' }} transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
                {/* Connections - render FIRST so annotations appear on top */}
                {connections.map((connection, index) => {
                  if (index === hoveredConnectionIndex) return null;
                  const fromProduct = canvasProducts.find(cp => cp.instanceId === connection.from);
                  const toProduct = canvasProducts.find(cp => cp.instanceId === connection.to);
                  if (!fromProduct || !toProduct) return null;

                  let { fromPoint, toPoint, fromEdge, toEdge } = connectionPositions[index] || {};

                  if (!fromPoint || !toPoint || !fromEdge || !toEdge) {
                    const fallback = getProductEdgePoint(connection.from, connection.to, index);
                    fromPoint = fromPoint || fallback.from;
                    toPoint = toPoint || fallback.to;

                    if (!fromEdge || !toEdge) {
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
                      isSelected={selectedConnection?.index === index}
                      offset={0}
                      zoom={zoom}
                      pan={pan}
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

                {hoveredConnectionIndex !== null && connections[hoveredConnectionIndex] && (() => {
                  const index = hoveredConnectionIndex;
                  const connection = connections[index];
                  if (!connection) return null;
                  const fromProduct = canvasProducts.find(cp => cp.instanceId === connection.from);
                  const toProduct = canvasProducts.find(cp => cp.instanceId === connection.to);
                  if (!fromProduct || !toProduct) return null;

                  let { fromPoint, toPoint, fromEdge, toEdge } = connectionPositions[index] || {};

                  if (!fromPoint || !toPoint || !fromEdge || !toEdge) {
                    const fallback = getProductEdgePoint(connection.from, connection.to, index);
                    fromPoint = fromPoint || fallback.from;
                    toPoint = toPoint || fallback.to;

                    if (!fromEdge || !toEdge) {
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
                        isSelected={selectedConnection?.index === index}
                        offset={0}
                        zoom={zoom}
                        pan={pan}
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
                      <circle cx={connectingState.startPos.x} cy={connectingState.startPos.y} r="6" fill={isValidTarget ? "#22c55e" : "#3b82f6"} className="pointer-events-none" />
                      <circle cx={connectingState.mousePos.x} cy={connectingState.mousePos.y} r="6" fill={isValidTarget ? "#22c55e" : "#3b82f6"} className="pointer-events-none" opacity={isValidTarget ? "1" : "0.5"} />
                    </g>
                  );
                })()}

                {/* Arrow being drawn */}
                {drawingArrow && (
                  <g>
                    <line
                      x1={drawingArrow.start.x}
                      y1={drawingArrow.start.y}
                      x2={drawingArrow.end.x}
                      y2={drawingArrow.end.y}
                      stroke="#3b82f6"
                      strokeWidth="3"
                      strokeDasharray="8,4"
                      markerEnd="url(#arrowhead)"
                      className="pointer-events-none"
                      opacity="0.8"
                    />
                  </g>
                )}

                {/* Saved arrows - render AFTER connections */}
                {arrows.map((arrow, idx) => {
                  const isHovered = hoveredArrow === idx;
                  
                  // Calculate dynamic start position based on device's current position
                  const device = canvasProducts.find(cp => cp.instanceId === arrow.instanceId);
                  const startX = device ? device.position.x + CARD_WIDTH / 2 : arrow.start.x;
                  const startY = device ? device.position.y + CARD_HEIGHT : arrow.start.y;
                  
                  return (
                    <g key={idx}>
                      {/* Invisible hit area for easier interaction */}
                      <line
                        x1={startX}
                        y1={startY}
                        x2={arrow.end.x}
                        y2={arrow.end.y}
                        stroke="transparent"
                        strokeWidth="20"
                        className="pointer-events-auto cursor-pointer"
                        onMouseEnter={() => setHoveredArrow(idx)}
                        onMouseLeave={() => setHoveredArrow(null)}
                        onClick={async () => {
                          const confirmed = window.confirm('Are you sure you want to delete this arrow?');
                          if (confirmed) {
                            const updated = arrows.filter((_, i) => i !== idx);
                            setArrows(updated);
                            if (markLocalChangeRef.current) markLocalChangeRef.current();
                            if (currentProject?.id) {
                              base44.entities.AVProject.update(currentProject.id, {
                                canvas_products: canvasProducts,
                                connections: connections,
                                rooms: rooms,
                                floorplans: floorplans,
                                arrows: updated
                              }).catch(err => console.error('Failed to save arrows:', err));
                            }
                          }
                        }}
                      />
                      {/* Visible arrow line */}
                      <line
                        x1={startX}
                        y1={startY}
                        x2={arrow.end.x}
                        y2={arrow.end.y}
                        stroke={isHovered ? "#ef4444" : "#3b82f6"}
                        strokeWidth={isHovered ? "4" : "3"}
                        markerEnd={isHovered ? "url(#arrowhead-hover)" : "url(#arrowhead)"}
                        className="pointer-events-none"
                      />
                    </g>
                  );
                })}

                {/* Drawing annotation preview */}
                {drawingAnnotation && drawingAnnotation.type !== 'symbol' && (() => {
                  const floorplan = floorplans.find(fp => fp.id === drawingAnnotation.floorplanId);
                  if (!floorplan) return null;

                  const startCanvasPos = floorplanToCanvasCoords(drawingAnnotation.position.x, drawingAnnotation.position.y, floorplan);
                  
                  const fpScale = floorplan.scale || 1;
                  const hasCalibration = floorplan.imageWidth && floorplan.imageHeight && floorplan.pixelsPerInch;
                  let fpWidth, fpHeight;
                  if (hasCalibration) {
                    const scaleFactor = (1 / floorplan.pixelsPerInch) * fpScale;
                    fpWidth = floorplan.imageWidth * scaleFactor;
                    fpHeight = floorplan.imageHeight * scaleFactor;
                  } else if (floorplan.imageWidth && floorplan.imageHeight) {
                    fpWidth = 500 * fpScale;
                    fpHeight = fpWidth * (floorplan.imageHeight / floorplan.imageWidth);
                  } else {
                    fpWidth = 500 * fpScale;
                    fpHeight = 500 * fpScale;
                  }

                  return (
                    <g>
                      {drawingAnnotation.type === 'rectangle' && drawingAnnotation.width && (
                        <rect
                          x={startCanvasPos.x}
                          y={startCanvasPos.y}
                          width={drawingAnnotation.width * fpWidth}
                          height={drawingAnnotation.height * fpHeight}
                          stroke={drawingAnnotation.color}
                          strokeWidth={drawingAnnotation.strokeWidth}
                          fill={drawingAnnotation.fill ? drawingAnnotation.color : 'none'}
                          fillOpacity={drawingAnnotation.fill ? 0.3 : 0}
                          strokeDasharray="8,4"
                          className="pointer-events-none"
                          opacity="0.8"
                        />
                      )}
                      {drawingAnnotation.type === 'circle' && drawingAnnotation.radius && (
                        <circle
                          cx={startCanvasPos.x}
                          cy={startCanvasPos.y}
                          r={drawingAnnotation.radius * fpWidth}
                          stroke={drawingAnnotation.color}
                          strokeWidth={drawingAnnotation.strokeWidth}
                          fill={drawingAnnotation.fill ? drawingAnnotation.color : 'none'}
                          fillOpacity={drawingAnnotation.fill ? 0.3 : 0}
                          strokeDasharray="8,4"
                          className="pointer-events-none"
                          opacity="0.8"
                        />
                      )}
                      {drawingAnnotation.type === 'line' && drawingAnnotation.endPosition && (
                        <line
                          x1={startCanvasPos.x}
                          y1={startCanvasPos.y}
                          x2={floorplanToCanvasCoords(drawingAnnotation.endPosition.x, drawingAnnotation.endPosition.y, floorplan).x}
                          y2={floorplanToCanvasCoords(drawingAnnotation.endPosition.x, drawingAnnotation.endPosition.y, floorplan).y}
                          stroke={drawingAnnotation.color}
                          strokeWidth={drawingAnnotation.strokeWidth}
                          strokeDasharray="8,4"
                          className="pointer-events-none"
                          opacity="0.8"
                        />
                      )}
                    </g>
                  );
                })()}

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
                      <circle cx={connectingState.startPos.x} cy={connectingState.startPos.y} r="6" fill={isValidTarget ? "#22c55e" : "#3b82f6"} className="pointer-events-none" />
                      <circle cx={connectingState.mousePos.x} cy={connectingState.mousePos.y} r="6" fill={isValidTarget ? "#22c55e" : "#3b82f6"} className="pointer-events-none" opacity={isValidTarget ? "1" : "0.5"} />
                    </g>
                  );
                })()}

                {/* Arrow being drawn */}
                {drawingArrow && (
                  <g>
                    <line
                      x1={drawingArrow.start.x}
                      y1={drawingArrow.start.y}
                      x2={drawingArrow.end.x}
                      y2={drawingArrow.end.y}
                      stroke="#3b82f6"
                      strokeWidth="3"
                      strokeDasharray="8,4"
                      markerEnd="url(#arrowhead)"
                      className="pointer-events-none"
                      opacity="0.8"
                    />
                  </g>
                )}

                {/* Saved arrows - render AFTER connections */}
                {arrows.map((arrow, idx) => {
                  const isHovered = hoveredArrow === idx;
                  
                  // Calculate dynamic start position based on device's current position
                  const device = canvasProducts.find(cp => cp.instanceId === arrow.instanceId);
                  const startX = device ? device.position.x + CARD_WIDTH / 2 : arrow.start.x;
                  const startY = device ? device.position.y + CARD_HEIGHT : arrow.start.y;
                  
                  return (
                    <g key={idx}>
                      {/* Invisible hit area for easier interaction */}
                      <line
                        x1={startX}
                        y1={startY}
                        x2={arrow.end.x}
                        y2={arrow.end.y}
                        stroke="transparent"
                        strokeWidth="20"
                        className="pointer-events-auto cursor-pointer"
                        onMouseEnter={() => setHoveredArrow(idx)}
                        onMouseLeave={() => setHoveredArrow(null)}
                        onClick={async () => {
                          const confirmed = window.confirm('Are you sure you want to delete this arrow?');
                          if (confirmed) {
                            const updated = arrows.filter((_, i) => i !== idx);
                            setArrows(updated);
                            if (markLocalChangeRef.current) markLocalChangeRef.current();
                            if (currentProject?.id) {
                              base44.entities.AVProject.update(currentProject.id, {
                                canvas_products: canvasProducts,
                                connections: connections,
                                rooms: rooms,
                                floorplans: floorplans,
                                arrows: updated
                              }).catch(err => console.error('Failed to save arrows:', err));
                            }
                          }
                        }}
                      />
                      {/* Visible arrow line */}
                      <line
                        x1={startX}
                        y1={startY}
                        x2={arrow.end.x}
                        y2={arrow.end.y}
                        stroke={isHovered ? "#ef4444" : "#3b82f6"}
                        strokeWidth={isHovered ? "4" : "3"}
                        markerEnd={isHovered ? "url(#arrowhead-hover)" : "url(#arrowhead)"}
                        className="pointer-events-none"
                      />
                    </g>
                  );
                })}

                {/* Drawing annotation preview */}
                {drawingAnnotation && drawingAnnotation.type !== 'symbol' && (() => {
                  const floorplan = floorplans.find(fp => fp.id === drawingAnnotation.floorplanId);
                  if (!floorplan) return null;

                  const startCanvasPos = floorplanToCanvasCoords(drawingAnnotation.position.x, drawingAnnotation.position.y, floorplan);
                  
                  const fpScale = floorplan.scale || 1;
                  const hasCalibration = floorplan.imageWidth && floorplan.imageHeight && floorplan.pixelsPerInch;
                  let fpWidth, fpHeight;
                  if (hasCalibration) {
                    const scaleFactor = (1 / floorplan.pixelsPerInch) * fpScale;
                    fpWidth = floorplan.imageWidth * scaleFactor;
                    fpHeight = floorplan.imageHeight * scaleFactor;
                  } else if (floorplan.imageWidth && floorplan.imageHeight) {
                    fpWidth = 500 * fpScale;
                    fpHeight = fpWidth * (floorplan.imageHeight / floorplan.imageWidth);
                  } else {
                    fpWidth = 500 * fpScale;
                    fpHeight = 500 * fpScale;
                  }

                  return (
                    <g>
                      {drawingAnnotation.type === 'rectangle' && drawingAnnotation.width && (
                        <rect
                          x={startCanvasPos.x}
                          y={startCanvasPos.y}
                          width={drawingAnnotation.width * fpWidth}
                          height={drawingAnnotation.height * fpHeight}
                          stroke={drawingAnnotation.color}
                          strokeWidth={drawingAnnotation.strokeWidth}
                          fill={drawingAnnotation.fill ? drawingAnnotation.color : 'none'}
                          fillOpacity={drawingAnnotation.fill ? 0.3 : 0}
                          strokeDasharray="8,4"
                          className="pointer-events-none"
                          opacity="0.8"
                        />
                      )}
                      {drawingAnnotation.type === 'circle' && drawingAnnotation.radius && (
                        <circle
                          cx={startCanvasPos.x}
                          cy={startCanvasPos.y}
                          r={drawingAnnotation.radius * fpWidth}
                          stroke={drawingAnnotation.color}
                          strokeWidth={drawingAnnotation.strokeWidth}
                          fill={drawingAnnotation.fill ? drawingAnnotation.color : 'none'}
                          fillOpacity={drawingAnnotation.fill ? 0.3 : 0}
                          strokeDasharray="8,4"
                          className="pointer-events-none"
                          opacity="0.8"
                        />
                      )}
                      {drawingAnnotation.type === 'line' && drawingAnnotation.endPosition && (
                        <line
                          x1={startCanvasPos.x}
                          y1={startCanvasPos.y}
                          x2={floorplanToCanvasCoords(drawingAnnotation.endPosition.x, drawingAnnotation.endPosition.y, floorplan).x}
                          y2={floorplanToCanvasCoords(drawingAnnotation.endPosition.x, drawingAnnotation.endPosition.y, floorplan).y}
                          stroke={drawingAnnotation.color}
                          strokeWidth={drawingAnnotation.strokeWidth}
                          strokeDasharray="8,4"
                          className="pointer-events-none"
                          opacity="0.8"
                        />
                      )}
                    </g>
                  );
                })()}

                {/* Arrowhead marker definitions */}
                <defs>
                  <marker
                    id="arrowhead"
                    markerWidth="10"
                    markerHeight="10"
                    refX="9"
                    refY="3"
                    orient="auto"
                    markerUnits="strokeWidth"
                  >
                    <polygon points="0 0, 10 3, 0 6" fill="#3b82f6" />
                  </marker>
                  <marker
                    id="arrowhead-hover"
                    markerWidth="10"
                    markerHeight="10"
                    refX="9"
                    refY="3"
                    orient="auto"
                    markerUnits="strokeWidth"
                  >
                    <polygon points="0 0, 10 3, 0 6" fill="#ef4444" />
                  </marker>
                </defs>
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

            {currentProject && canvasProducts.length === 0 && !snapshot.isDraggingOver && !isMobile && (
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
                if (!floorplan) {
                  toast.error('Please place symbol on a floorplan');
                  return;
                }

                const fpCoords = canvasToFloorplanCoords(canvasX, canvasY, floorplan);
                const newAnnotation = {
                  id: Date.now().toString(),
                  type: 'symbol',
                  symbolId: symbol,
                  floorplanId: floorplan.id,
                  position: fpCoords,
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
            const floorplan = floorplans.find(fp => fp.id === ann.floorplanId);
            if (!floorplan) return null;
            
            const canvasPos = floorplanToCanvasCoords(ann.position.x, ann.position.y, floorplan);
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
            fromPosition={canvasProducts.find(cp => cp.instanceId === selectedConnection.from)?.position}
            toPosition={canvasProducts.find(cp => cp.instanceId === selectedConnection.to)?.position}
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
          selectedAnnotation={selectedAnnotation}
          onClose={() => setSelectedAnnotation(null)}
          onUpdate={handleUpdateAnnotation}
          onDelete={handleDeleteAnnotation}
          onDuplicate={() => handleDuplicateAnnotation(selectedAnnotation)}
        />

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