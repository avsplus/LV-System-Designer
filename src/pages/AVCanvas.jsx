import React, { useState, useRef, useEffect, useCallback } from 'react';
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { DragDropContext, Droppable } from '@hello-pangea/dnd';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trash2, Download, Plus, ZoomIn, ZoomOut, Maximize2, Link2, Settings, FolderOpen, Save, ChevronDown, FileText, User, Home, Users, X, Crop, Layers, Wrench } from "lucide-react";
import FloorplanManager from "../components/canvas/FloorplanManager";
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
import ExportPDFDialog from "../components/canvas/ExportPDFDialog";
import ImportProductsDialog from "../components/canvas/ImportProductsDialog";
import EnrichConnectionsDialog from "../components/canvas/EnrichConnectionsDialog";

import { trackActivity, ActivityActions } from "../components/activity/activityTracker";
import { usePermissions } from "../components/auth/usePermissions";
import { ROLES } from "../components/auth/permissions";
import { useSettings } from "../components/settings/SettingsContext";
import useCanvasZoomPan from "../components/canvas/hooks/useCanvasZoomPan";
import useProjectData, { ensureNetworkInfo } from "../components/canvas/hooks/useProjectData";
import useResponsiveCanvas from "../components/canvas/hooks/useResponsiveCanvas";

function AVCanvasContent() {
    const toast = useToast();
    const confirmDialog = useConfirm();
    const queryClient = useQueryClient();
    const { isAtLeast, loading: permLoading } = usePermissions();
    const { settings: orgSettings } = useSettings();

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
      handleZoomIn, handleZoomOut, handleZoomReset, handleWheel, handlePanStart
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
  const [arrows, setArrows] = useState([]);
  const [drawingArrow, setDrawingArrow] = useState(null);
  const [hoveredArrow, setHoveredArrow] = useState(null);

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
    setArrows(project.arrows || []);
    setSelectedProduct(null);
    setSelectedConnection(null);
    setSelectedCanvasProduct(null);
  };



  const onDragEnd = (result) => {
    const { source, destination, draggableId } = result;

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
    const proceed = await confirmDialog('This will clear the canvas. Any unsaved changes will be lost.', {
      title: 'Clear Canvas',
      type: 'danger',
      confirmText: 'Clear Canvas',
      cancelText: 'Cancel'
    });
    if (proceed) {
      clearCanvasData();
      setSelectedProduct(null);
      setSelectedConnection(null);
      setCurrentProject(null);
      toast.success('Canvas cleared');
    }
  };

  const handleFloorplanMouseDown = (e, floorplanId) => {
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
    
    if (isEmptySpace && !draggingFloorplan) {
      handlePanStart(e, canvasRef.current);
    }
  };

  const handleCanvasClick = (e) => {
    // Only trigger if clicking directly on the canvas background, not on products/connections
    const isEmptySpace = e.target === e.currentTarget || 
                        e.target.tagName === 'svg' || 
                        e.target.getAttribute('data-canvas-background') === 'true' ||
                        (!e.target.closest('[data-instance-id]') && 
                         !e.target.closest('[data-floorplan]') && 
                         !e.target.closest('path') && 
                         !e.target.closest('circle'));

    if (isEmptySpace) {
      setSelectedProduct(null);
      setSelectedCanvasProduct(null);
      setSelectedConnection(null);
      setHighlightedConnections([]);
      setPanelHistory([]);
      setShowFloorplanManager(false);
      setShowRoomManager(false);
      setSelectedFloorplanId(null);
    }
  };

  // Touch handlers for pinch-to-zoom
  const handleCanvasTouchStart = (e) => {
    if (e.touches.length === 2) {
      handlePinchStart(e, zoom);
    }
  };

  const handleCanvasTouchMove = (e) => {
    if (e.touches.length === 2) {
      handlePinchMove(e, setZoom);
    }
  };

  const handleCanvasTouchEnd = () => {
    handlePinchEnd();
  };

  useEffect(() => {
    const handleDragMove = (e) => {
      setDragMousePosition({ x: e.clientX, y: e.clientY });
      
      // Handle arrow drawing
      if (drawingArrow) {
        const canvasRect = canvasRef.current?.getBoundingClientRect();
        if (canvasRect) {
          const mouseWorldX = (e.clientX - canvasRect.left - pan.x) / zoom;
          const mouseWorldY = (e.clientY - canvasRect.top - pan.y) / zoom;
          setDrawingArrow(prev => ({
            ...prev,
            end: { x: mouseWorldX, y: mouseWorldY }
          }));
        }
        return;
      }

      handleGlobalMouseMove(e);
      handleResizeMove(e);
    };

    const handleDragEnd = (e) => {
      // Complete arrow drawing
      if (drawingArrow) {
        const dist = Math.sqrt(
          Math.pow(drawingArrow.end.x - drawingArrow.start.x, 2) +
          Math.pow(drawingArrow.end.y - drawingArrow.start.y, 2)
        );
        // Only save if arrow was actually dragged (min 20px)
        if (dist > 20) {
          const newArrows = [...arrows, drawingArrow];
          setArrows(newArrows);
          if (markLocalChangeRef.current) markLocalChangeRef.current();
          if (currentProject?.id) {
            base44.entities.AVProject.update(currentProject.id, {
              canvas_products: canvasProducts,
              connections: connections,
              rooms: rooms,
              floorplans: floorplans,
              arrows: newArrows
            }).catch(err => console.error('Failed to save arrows:', err));
          }
        }
        setDrawingArrow(null);
        return;
      }

      handleGlobalMouseUp(e);
      handleResizeEnd(e);
    };

    window.addEventListener('mousemove', handleDragMove);
    window.addEventListener('mouseup', handleDragEnd);
    return () => {
      window.removeEventListener('mousemove', handleDragMove);
      window.removeEventListener('mouseup', handleDragEnd);
    };
  }, [handleGlobalMouseMove, handleGlobalMouseUp, handleResizeMove, handleResizeEnd, drawingArrow, pan, zoom]);

  useEffect(() => {
    connectingStateRef.current = connectingState;
  }, [connectingState]);

  // Default port definitions by product category - fallback when database doesn't have connections
  // All ports normalized to {id, label, direction} objects to prevent React reconciliation errors
  const connectionsByCategory = {
    televisions: {
      inputs: [
        { type: "HDMI", ports: [{ id: "hdmi-1", label: "HDMI-1", direction: "input" }, { id: "hdmi-2", label: "HDMI-2", direction: "input" }, { id: "hdmi-3", label: "HDMI-3", direction: "input" }, { id: "hdmi-4", label: "HDMI-4", direction: "input" }] },
        { type: "Component", ports: [{ id: "component-1", label: "Component-1", direction: "input" }] },
        { type: "Composite", ports: [{ id: "composite-1", label: "Composite-1", direction: "input" }] },
        { type: "Optical", ports: [{ id: "optical-in", label: "Optical-In", direction: "input" }] },
        { type: "Ethernet", ports: [{ id: "eth-lan", label: "LAN", direction: "input" }] },
        { type: "IR", ports: [{ id: "ir-in", label: "IR-In", direction: "input" }] }
      ],
      outputs: [
        { type: "Optical", ports: [{ id: "optical-out", label: "Optical-Out", direction: "output" }] },
        { type: "3.5mm Jack", ports: [{ id: "headphone", label: "Headphone", direction: "output" }] }
      ]
    },
    projectors: {
      inputs: [
        { type: "HDMI", ports: [{ id: "hdmi-1", label: "HDMI-1", direction: "input" }, { id: "hdmi-2", label: "HDMI-2", direction: "input" }] },
        { type: "VGA", ports: [{ id: "vga", label: "VGA", direction: "input" }] },
        { type: "Component", ports: [{ id: "component-1", label: "Component-1", direction: "input" }] },
        { type: "Ethernet", ports: [{ id: "eth-lan", label: "LAN", direction: "input" }] },
        { type: "IR", ports: [{ id: "ir-in", label: "IR-In", direction: "input" }] },
        { type: "RS232", ports: [{ id: "rs232", label: "RS232", direction: "input" }] }
      ],
      outputs: [
        { type: "3.5mm Jack", ports: [{ id: "audio-out", label: "Audio-Out", direction: "output" }] }
      ]
    },
    projector_screens: {
      inputs: [
        { type: "Control", ports: [{ id: "trigger-1", label: "Trigger-1", direction: "input" }, { id: "trigger-2", label: "Trigger-2", direction: "input" }] },
        { type: "RS232", ports: [{ id: "rs232", label: "RS232", direction: "input" }] }
      ],
      outputs: []
    },
    video_distribution: {
      inputs: [
        { type: "HDMI", ports: [{ id: "hdmi-1", label: "HDMI-1", direction: "input" }, { id: "hdmi-2", label: "HDMI-2", direction: "input" }, { id: "hdmi-3", label: "HDMI-3", direction: "input" }, { id: "hdmi-4", label: "HDMI-4", direction: "input" }] },
        { type: "Ethernet", ports: [{ id: "eth-lan", label: "LAN", direction: "input" }] },
        { type: "IR", ports: [{ id: "ir-in", label: "IR-In", direction: "input" }] },
        { type: "RS232", ports: [{ id: "rs232", label: "RS232", direction: "input" }] }
      ],
      outputs: [
        { type: "HDMI", ports: [{ id: "hdmi-out-1", label: "HDMI-Out-1", direction: "output" }, { id: "hdmi-out-2", label: "HDMI-Out-2", direction: "output" }, { id: "hdmi-out-3", label: "HDMI-Out-3", direction: "output" }, { id: "hdmi-out-4", label: "HDMI-Out-4", direction: "output" }, { id: "hdmi-out-5", label: "HDMI-Out-5", direction: "output" }, { id: "hdmi-out-6", label: "HDMI-Out-6", direction: "output" }] },
        { type: "HDBaseT", ports: [{ id: "hdbaset-1", label: "HDBaseT-1", direction: "output" }, { id: "hdbaset-2", label: "HDBaseT-2", direction: "output" }, { id: "hdbaset-3", label: "HDBaseT-3", direction: "output" }, { id: "hdbaset-4", label: "HDBaseT-4", direction: "output" }] }
      ]
    },
    matrix_switchers: {
      inputs: [
        { type: "HDMI", ports: [{ id: "hdmi-1", label: "HDMI-1", direction: "input" }, { id: "hdmi-2", label: "HDMI-2", direction: "input" }, { id: "hdmi-3", label: "HDMI-3", direction: "input" }, { id: "hdmi-4", label: "HDMI-4", direction: "input" }, { id: "hdmi-5", label: "HDMI-5", direction: "input" }, { id: "hdmi-6", label: "HDMI-6", direction: "input" }, { id: "hdmi-7", label: "HDMI-7", direction: "input" }, { id: "hdmi-8", label: "HDMI-8", direction: "input" }] },
        { type: "Ethernet", ports: [{ id: "eth-lan", label: "LAN", direction: "input" }] },
        { type: "RS232", ports: [{ id: "rs232", label: "RS232", direction: "input" }] }
      ],
      outputs: [
        { type: "HDMI", ports: [{ id: "hdmi-out-1", label: "HDMI-Out-1", direction: "output" }, { id: "hdmi-out-2", label: "HDMI-Out-2", direction: "output" }, { id: "hdmi-out-3", label: "HDMI-Out-3", direction: "output" }, { id: "hdmi-out-4", label: "HDMI-Out-4", direction: "output" }, { id: "hdmi-out-5", label: "HDMI-Out-5", direction: "output" }, { id: "hdmi-out-6", label: "HDMI-Out-6", direction: "output" }, { id: "hdmi-out-7", label: "HDMI-Out-7", direction: "output" }, { id: "hdmi-out-8", label: "HDMI-Out-8", direction: "output" }] }
      ]
    },
    audio_streamers: {
      inputs: [
        { type: "Ethernet", ports: [{ id: "eth-lan", label: "LAN", direction: "input" }] },
        { type: "USB", ports: [{ id: "usb", label: "USB", direction: "input" }] },
        { type: "Optical", ports: [{ id: "optical-in", label: "Optical-In", direction: "input" }] },
        { type: "IR", ports: [{ id: "ir-in", label: "IR-In", direction: "input" }] }
      ],
      outputs: [
        { type: "RCA", ports: [{ id: "rca-l", label: "Out-L", direction: "output" }, { id: "rca-r", label: "Out-R", direction: "output" }] },
        { type: "Optical", ports: [{ id: "optical-out", label: "Optical-Out", direction: "output" }] },
        { type: "Coaxial", ports: [{ id: "coaxial-out", label: "Coaxial-Out", direction: "output" }] },
        { type: "XLR", ports: [{ id: "xlr-l", label: "XLR-L", direction: "output" }, { id: "xlr-r", label: "XLR-R", direction: "output" }] }
      ]
    },
    media_streamers: {
      inputs: [
        { type: "Ethernet", ports: [{ id: "eth-lan", label: "LAN", direction: "input" }] },
        { type: "USB", ports: [{ id: "usb", label: "USB", direction: "input" }] }
      ],
      outputs: [
        { type: "HDMI", ports: [{ id: "hdmi-out", label: "HDMI-Out", direction: "output" }] }
      ]
    },
    speakers: {
      inputs: [{ type: "Speaker Wire", ports: [{ id: "speaker-in", label: "Input", direction: "input" }] }],
      outputs: []
    },
    soundbars: {
      inputs: [
        { type: "HDMI", ports: [{ id: "hdmi-1", label: "HDMI-1", direction: "input" }, { id: "hdmi-2", label: "HDMI-2", direction: "input" }] },
        { type: "Optical", ports: [{ id: "optical-in", label: "Optical-In", direction: "input" }] },
        { type: "RCA", ports: [{ id: "rca-l", label: "RCA-L", direction: "input" }, { id: "rca-r", label: "RCA-R", direction: "input" }] },
        { type: "Ethernet", ports: [{ id: "eth-lan", label: "LAN", direction: "input" }] },
        { type: "IR", ports: [{ id: "ir-in", label: "IR-In", direction: "input" }] }
      ],
      outputs: [
        { type: "HDMI", ports: [{ id: "hdmi-out", label: "HDMI-Out", direction: "output" }] },
        { type: "Subwoofer", ports: [{ id: "sub-out", label: "Sub-Out", direction: "output" }] }
      ]
    },
    subwoofers: {
      inputs: [{ type: "Subwoofer", ports: [{ id: "sub-in", label: "Input", direction: "input" }] }],
      outputs: []
    },
    stereo_amps: {
      inputs: [
        { type: "RCA", ports: [{ id: "rca-1", label: "RCA-1", direction: "input" }, { id: "rca-2", label: "RCA-2", direction: "input" }] },
        { type: "XLR", ports: [{ id: "xlr-l", label: "XLR-L", direction: "input" }, { id: "xlr-r", label: "XLR-R", direction: "input" }] },
        { type: "Optical", ports: [{ id: "optical-1", label: "Optical-1", direction: "input" }] },
        { type: "Coaxial", ports: [{ id: "coaxial", label: "Coaxial", direction: "input" }] },
        { type: "IR", ports: [{ id: "ir-in", label: "IR-In", direction: "input" }] },
        { type: "RS232", ports: [{ id: "rs232", label: "RS232", direction: "input" }] }
      ],
      outputs: [
        { type: "Speaker Wire", ports: [{ id: "speaker-l", label: "Speaker-L", direction: "output" }, { id: "speaker-r", label: "Speaker-R", direction: "output" }] },
        { type: "RCA", ports: [{ id: "preout-l", label: "Pre-Out-L", direction: "output" }, { id: "preout-r", label: "Pre-Out-R", direction: "output" }] }
      ]
    },
    multizone_amps: {
      inputs: [
        { type: "RCA", ports: [{ id: "zone1-l", label: "Zone-1-L", direction: "input" }, { id: "zone1-r", label: "Zone-1-R", direction: "input" }, { id: "zone2-l", label: "Zone-2-L", direction: "input" }, { id: "zone2-r", label: "Zone-2-R", direction: "input" }, { id: "zone3-l", label: "Zone-3-L", direction: "input" }, { id: "zone3-r", label: "Zone-3-R", direction: "input" }, { id: "zone4-l", label: "Zone-4-L", direction: "input" }, { id: "zone4-r", label: "Zone-4-R", direction: "input" }] },
        { type: "XLR", ports: [{ id: "xlr-1l", label: "XLR-1-L", direction: "input" }, { id: "xlr-1r", label: "XLR-1-R", direction: "input" }, { id: "xlr-2l", label: "XLR-2-L", direction: "input" }, { id: "xlr-2r", label: "XLR-2-R", direction: "input" }] },
        { type: "Ethernet", ports: [{ id: "eth-lan", label: "LAN", direction: "input" }] },
        { type: "IR", ports: [{ id: "ir-in", label: "IR-In", direction: "input" }] },
        { type: "RS232", ports: [{ id: "rs232", label: "RS232", direction: "input" }] }
      ],
      outputs: [
        { type: "Speaker Wire", ports: [{ id: "zone1-l", label: "Zone-1-L", direction: "output" }, { id: "zone1-r", label: "Zone-1-R", direction: "output" }, { id: "zone2-l", label: "Zone-2-L", direction: "output" }, { id: "zone2-r", label: "Zone-2-R", direction: "output" }, { id: "zone3-l", label: "Zone-3-L", direction: "output" }, { id: "zone3-r", label: "Zone-3-R", direction: "output" }, { id: "zone4-l", label: "Zone-4-L", direction: "output" }, { id: "zone4-r", label: "Zone-4-R", direction: "output" }] }
      ]
    },
    surround_processors: {
      inputs: [
        { type: "HDMI", ports: [{ id: "hdmi-1", label: "HDMI-1", direction: "input" }, { id: "hdmi-2", label: "HDMI-2", direction: "input" }, { id: "hdmi-3", label: "HDMI-3", direction: "input" }, { id: "hdmi-4", label: "HDMI-4", direction: "input" }, { id: "hdmi-5", label: "HDMI-5", direction: "input" }, { id: "hdmi-6", label: "HDMI-6", direction: "input" }, { id: "hdmi-7", label: "HDMI-7", direction: "input" }] },
        { type: "RCA", ports: [{ id: "rca-1", label: "RCA-1", direction: "input" }, { id: "rca-2", label: "RCA-2", direction: "input" }] },
        { type: "XLR", ports: [{ id: "xlr-l", label: "XLR-L", direction: "input" }, { id: "xlr-r", label: "XLR-R", direction: "input" }] },
        { type: "Optical", ports: [{ id: "optical-1", label: "Optical-1", direction: "input" }, { id: "optical-2", label: "Optical-2", direction: "input" }] },
        { type: "Coaxial", ports: [{ id: "coaxial-1", label: "Coaxial-1", direction: "input" }] },
        { type: "Ethernet", ports: [{ id: "eth-lan", label: "LAN", direction: "input" }] }
      ],
      outputs: [
        { type: "HDMI", ports: [{ id: "hdmi-out-1", label: "HDMI-Out-1", direction: "output" }, { id: "hdmi-out-2", label: "HDMI-Out-2", direction: "output" }] },
        { type: "RCA", ports: [{ id: "rca-fl", label: "FL", direction: "output" }, { id: "rca-fr", label: "FR", direction: "output" }, { id: "rca-c", label: "C", direction: "output" }, { id: "rca-sl", label: "SL", direction: "output" }, { id: "rca-sr", label: "SR", direction: "output" }, { id: "rca-sbl", label: "SBL", direction: "output" }, { id: "rca-sbr", label: "SBR", direction: "output" }, { id: "rca-sub", label: "Sub", direction: "output" }] },
        { type: "XLR", ports: [{ id: "xlr-fl", label: "XLR-FL", direction: "output" }, { id: "xlr-fr", label: "XLR-FR", direction: "output" }, { id: "xlr-c", label: "XLR-C", direction: "output" }, { id: "xlr-sl", label: "XLR-SL", direction: "output" }, { id: "xlr-sr", label: "XLR-SR", direction: "output" }, { id: "xlr-sub", label: "XLR-Sub", direction: "output" }] }
      ]
    },
    av_receivers: {
      inputs: [
        { type: "HDMI", ports: [{ id: "hdmi-1", label: "HDMI-1", direction: "input" }, { id: "hdmi-2", label: "HDMI-2", direction: "input" }, { id: "hdmi-3", label: "HDMI-3", direction: "input" }, { id: "hdmi-4", label: "HDMI-4", direction: "input" }, { id: "hdmi-5", label: "HDMI-5", direction: "input" }, { id: "hdmi-6", label: "HDMI-6", direction: "input" }, { id: "hdmi-7", label: "HDMI-7", direction: "input" }] },
        { type: "RCA", ports: [{ id: "rca-cd", label: "CD", direction: "input" }, { id: "rca-phono", label: "Phono", direction: "input" }, { id: "rca-aux1", label: "AUX-1", direction: "input" }, { id: "rca-aux2", label: "AUX-2", direction: "input" }] },
        { type: "Optical", ports: [{ id: "optical-1", label: "Optical-1", direction: "input" }, { id: "optical-2", label: "Optical-2", direction: "input" }] },
        { type: "Coaxial", ports: [{ id: "coaxial", label: "Coaxial", direction: "input" }] },
        { type: "USB", ports: [{ id: "usb-a", label: "USB-A", direction: "input" }, { id: "usb-b", label: "USB-B", direction: "input" }] },
        { type: "Ethernet", ports: [{ id: "eth-lan", label: "LAN", direction: "input" }] }
      ],
      outputs: [
        { type: "HDMI", ports: [{ id: "hdmi-out-1", label: "HDMI-Out-1", direction: "output" }, { id: "hdmi-out-2", label: "HDMI-Out-2", direction: "output" }] },
        { type: "Speaker Wire", ports: [{ id: "speaker-fl", label: "Front-L", direction: "output" }, { id: "speaker-fr", label: "Front-R", direction: "output" }, { id: "speaker-c", label: "Center", direction: "output" }, { id: "speaker-sl", label: "Surround-L", direction: "output" }, { id: "speaker-sr", label: "Surround-R", direction: "output" }, { id: "speaker-sbl", label: "Surround-Back-L", direction: "output" }, { id: "speaker-sbr", label: "Surround-Back-R", direction: "output" }, { id: "speaker-sub1", label: "Sub-1", direction: "output" }, { id: "speaker-sub2", label: "Sub-2", direction: "output" }] },
        { type: "RCA", ports: [{ id: "rca-zone2l", label: "Zone-2-L", direction: "output" }, { id: "rca-zone2r", label: "Zone-2-R", direction: "output" }] },
        { type: "Optical", ports: [{ id: "optical-out", label: "Optical-Out", direction: "output" }] }
      ]
    },
    network_switches: {
      inputs: [
        { type: "Ethernet", ports: [] }
      ],
      outputs: [
        { type: "Ethernet", ports: [] }
      ]
    }
  };

  const CARD_WIDTH = 320;
  const CARD_HEIGHT = 280;
  const PORT_DOT_SIZE = 20;
  const PORT_GAP = 12;

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
          }}
        />

        <div className="flex-1 flex flex-col min-w-0">
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
                  <Button variant="outline" className="bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700 hover:text-white hover:border-gray-500">
                    <FolderOpen className="w-4 h-4 mr-2" />
                    Project
                    <ChevronDown className="w-4 h-4 ml-2" />
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
                            arrows: arrows
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
                      if (canvasProducts.length === 0) {
                        toast.warning('Canvas is empty. Add some devices first.');
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

                  {currentProject && (
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        setShowFloorplanManager(true);
                        setShowRoomManager(false);
                        setSelectedProduct(null);
                        setSelectedCanvasProduct(null);
                        setSelectedConnection(null);
                        setSelectedFloorplanId(null);
                      }} 
                      className="bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700 hover:text-white hover:border-gray-500">
                      <Layers className="w-4 h-4 mr-2" />
                      Floorplans
                    </Button>
                  )}

                  <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700 hover:text-white hover:border-gray-500">
                  <Wrench className="w-4 h-4 mr-2" />
                  Tools
                  <ChevronDown className="w-4 h-4 ml-2" />
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
                <Button size="icon" variant="ghost" onClick={handleZoomOut} className="h-7 w-7 text-gray-300 hover:text-white">
                  <ZoomOut className="w-4 h-4" />
                </Button>
                <span className="text-sm text-gray-400 min-w-[3rem] text-center">
                  {Math.round(zoom * 100)}%
                </span>
                <Button size="icon" variant="ghost" onClick={handleZoomIn} className="h-7 w-7 text-gray-300 hover:text-white">
                  <ZoomIn className="w-4 h-4" />
                </Button>
                <Button size="icon" variant="ghost" onClick={handleZoomReset} className="h-7 w-7 text-gray-300 hover:text-white">
                  <Maximize2 className="w-3 h-3" />
                </Button>
              </div>
              

              
              <Link to={createPageUrl("Settings")}>
                <Button variant="outline" className="bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700 hover:text-white hover:border-gray-500">
                  <Settings className="w-4 h-4" />
                </Button>
              </Link>
              
              {isAtLeast(ROLES.ADMINISTRATOR) && (
                <Link to={createPageUrl("Admin")}>
                  <Button variant="outline" className="bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700 hover:text-white hover:border-gray-500">
                    <Users className="w-4 h-4" />
                  </Button>
                </Link>
              )}
              
              <Link to={createPageUrl("account")}>
                <Button variant="outline" className="bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700 hover:text-white hover:border-gray-500">
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
            onWheel={currentProject ? (e) => handleWheel(e, canvasRef.current) : undefined}
              onMouseDown={currentProject ? handleMouseDown : undefined}
              onClick={currentProject ? handleCanvasClick : undefined}
              onTouchStart={currentProject ? handleCanvasTouchStart : undefined}
              onTouchMove={currentProject ? handleCanvasTouchMove : undefined}
              onTouchEnd={currentProject ? handleCanvasTouchEnd : undefined}
              className={`flex-1 relative overflow-hidden bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 transition-colors ${
                snapshot.isDraggingOver && currentProject ? 'bg-blue-950/20' : ''
              } ${isPanning || spacePressed ? 'cursor-grab' : ''} ${isPanning ? 'cursor-grabbing' : ''}`}
              style={{
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
                        cursor: fp.locked ? 'not-allowed' : (isThisOneDragging ? 'grabbing' : 'grab'),
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
                      {/* Floorplan name overlay */}
                      <div 
                        className="absolute bottom-4 right-4 text-center"
                        style={{ pointerEvents: 'none' }}
                      >
                        <div className="text-5xl font-bold" style={{ color: '#1e40af', textShadow: '1px 1px 3px rgba(255,255,255,0.4)' }}>{fp.name}</div>
                        <div className="text-xl font-normal mt-1 inline-block px-3 py-1 border border-black" style={{ color: '#000', backgroundColor: 'rgba(255,255,255,0.7)' }}>
                          Uploaded Date: {new Date(parseInt(fp.id)).toLocaleDateString()}
                        </div>
                      </div>
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
              </div>
            </div>

            <svg className="absolute pointer-events-none" style={{ zIndex: 1, top: 0, left: 0, width: '100%', height: '100%', minWidth: '4000px', minHeight: '4000px', overflow: 'visible' }}>
              <g style={{ pointerEvents: 'none' }} transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
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

                {/* Saved arrows */}
                {arrows.map((arrow, idx) => {
                  const isHovered = hoveredArrow === idx;
                  return (
                    <g key={idx}>
                      {/* Invisible hit area for easier interaction */}
                      <line
                        x1={arrow.start.x}
                        y1={arrow.start.y}
                        x2={arrow.end.x}
                        y2={arrow.end.y}
                        stroke="transparent"
                        strokeWidth="20"
                        className="pointer-events-auto cursor-pointer"
                        onMouseEnter={() => setHoveredArrow(idx)}
                        onMouseLeave={() => setHoveredArrow(null)}
                        onClick={async () => {
                          const confirmed = await confirmDialog('Are you sure you want to delete this arrow?', {
                            title: 'Delete Arrow',
                            type: 'warning'
                          });
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
                        x1={arrow.start.x}
                        y1={arrow.start.y}
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

            {currentProject && canvasProducts.length === 0 && !snapshot.isDraggingOver && (
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
        </div>

        {selectedConnection && (
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

        {!selectedConnection && selectedCanvasProduct && (
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

        {!selectedConnection && !selectedCanvasProduct && selectedProduct && (
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
          />
        )}



        {showExportDialog && (
          <ExportPDFDialog
            open={showExportDialog}
            onClose={() => setShowExportDialog(false)}
            projectName={currentProject?.name}
            projectId={currentProject?.id}
            isExporting={isExporting}
            exportEngine={exportEngine}
            onExportEngineChange={setExportEngine}
            canvasProducts={canvasProducts}
            connections={connections}
            rooms={rooms}
            floorplans={floorplans}
            arrows={arrows}
            onExport={async ({ clientName, location, engine, exportType, floorplans: exportFloorplans }) => {
              setIsExporting(true);
              try {
                if (engine === 'apitemplate') {
                  const response = await base44.functions.invoke('apiTemplateService', {
                    action: 'generateInstallationPackage',
                    canvasProducts,
                    connections,
                    rooms,
                    floorplans: exportFloorplans || [],
                    arrows,
                    projectName: currentProject?.name || 'AV-System-Design',
                    clientName,
                    location,
                    orgSettings,
                    exportType: exportType || 'installer'
                  });

                  if (response.data.download_url) {
                    window.open(response.data.download_url, '_blank');
                    toast.success('PDF generated successfully');
                  } else {
                    throw new Error(response.data.error || 'No download URL returned');
                  }
                } else {
                  const response = await base44.functions.invoke('exportCanvasToPDF', {
                    canvasProducts,
                    connections,
                    rooms,
                    floorplans: exportFloorplans || [],
                    arrows,
                    projectName: currentProject?.name || 'AV-System-Design',
                    clientName,
                    location,
                    orgSettings,
                    exportType: exportType || 'installer'
                  });

                  const base64 = response.data.pdf;
                  const binaryString = atob(base64);
                  const bytes = new Uint8Array(binaryString.length);
                  for (let i = 0; i < binaryString.length; i++) {
                    bytes[i] = binaryString.charCodeAt(i);
                  }

                  const exportTypeNames = { installer: 'Installer-Package', client: 'Client-Proposal', documentation: 'Full-Documentation' };
                  const blob = new Blob([bytes], { type: 'application/pdf' });
                  const url = window.URL.createObjectURL(blob);
                  const fileName = `${currentProject?.name || 'AV-System-Design'}-${exportTypeNames[exportType] || 'Package'}.pdf`;

                  // Safari-compatible download
                  const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
                  if (isSafari) {
                    // For Safari, open in new tab and let user save
                    const newWindow = window.open(url, '_blank');
                    if (!newWindow) {
                      // Popup blocked - fallback to direct navigation
                      window.location.href = url;
                    }
                  } else {
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = fileName;
                    document.body.appendChild(a);
                    a.click();
                    a.remove();
                  }
                  // Delay URL revocation to allow download to complete
                  setTimeout(() => window.URL.revokeObjectURL(url), 5000);
                  toast.success('PDF exported successfully');
                }
                setShowExportDialog(false);
              } catch (error) {
                console.error('Export error:', error);
                toast.error('Failed to export PDF');
              }
              setIsExporting(false);
            }}
            onGenerateWireSchedule={async ({ canvasProducts: devices, connections: conns, projectName: pName, clientName: cName }) => {
              setIsExporting(true);
              try {
                const response = await base44.functions.invoke('exportCanvasToPDF', {
                  action: 'generateWireSchedule',
                  canvasProducts: devices,
                  connections: conns,
                  projectName: pName || currentProject?.name,
                  clientName: cName,
                  orgSettings
                });

                const base64 = response.data.pdf;
                const binaryString = atob(base64);
                const bytes = new Uint8Array(binaryString.length);
                for (let i = 0; i < binaryString.length; i++) {
                  bytes[i] = binaryString.charCodeAt(i);
                }

                const blob = new Blob([bytes], { type: 'application/pdf' });
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `${currentProject?.name || 'Project'}-Wire-Schedule.pdf`;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                a.remove();
                toast.success('Wire schedule exported');
              } catch (error) {
                console.error('Wire schedule error:', error);
                toast.error('Failed to export wire schedule');
              }
              setIsExporting(false);
            }}
            onGenerateBOM={async ({ canvasProducts: devices, connections: conns, projectName: pName, clientName: cName }) => {
              setIsExporting(true);
              try {
                const response = await base44.functions.invoke('exportCanvasToPDF', {
                  action: 'generateBOM',
                  canvasProducts: devices,
                  connections: conns,
                  projectName: pName || currentProject?.name,
                  clientName: cName,
                  orgSettings
                });

                const base64 = response.data.pdf;
                const binaryString = atob(base64);
                const bytes = new Uint8Array(binaryString.length);
                for (let i = 0; i < binaryString.length; i++) {
                  bytes[i] = binaryString.charCodeAt(i);
                }

                const blob = new Blob([bytes], { type: 'application/pdf' });
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `${currentProject?.name || 'Project'}-BOM.pdf`;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                a.remove();
                toast.success('Bill of Materials exported');
              } catch (error) {
                console.error('BOM generation error:', error);
                toast.error('Failed to export BOM');
              }
              setIsExporting(false);
            }}
          />
        )}

        {showEnrichDialog && (
            <EnrichConnectionsDialog
              open={showEnrichDialog}
              onClose={() => setShowEnrichDialog(false)}
              isEnriching={enrichmentProgress?.status === 'running'}
              products={products}
              onEnrich={async (params) => {
                setShowEnrichDialog(false);
                try {
                  const desc = params.mode === 'search' 
                    ? `${params.brand}${params.model ? ' ' + params.model : ''}`
                    : params.category || 'all products';
                  setEnrichmentProgress({ status: 'running', message: `Enriching ${desc}...` });
                  const { data } = await base44.functions.invoke('enrichProductConnectionsV2', params);
                  setEnrichmentProgress({ status: 'complete', enriched: data.enriched, total: data.total, failed: data.failed });
                  toast.success(`Successfully enriched ${data.enriched} products with real connection data!`);

                  // Refetch products and update canvas
                  await queryClient.invalidateQueries({ queryKey: ['avProducts'] });
                  const updatedProducts = await queryClient.getQueryData(['avProducts']);
                  if (updatedProducts && canvasProducts.length > 0) {
                    projectData.setCanvasProducts(prev => prev.map(cp => {
                      const updated = updatedProducts.find(p => p.id === cp.product.id);
                      return updated ? { ...cp, product: updated } : cp;
                    }));
                  }
                } catch (error) {
                  console.error('Enrichment error:', error);
                  const errorMsg = error.response?.data?.error || error.message;
                  setEnrichmentProgress({ status: 'error', message: errorMsg });
                  toast.error(`Enrichment failed: ${errorMsg}`);
                  setTimeout(() => setEnrichmentProgress(null), 5000);
                }
              }}
            />
          )}

        {showImportDialog && (
            <ImportProductsDialog
            open={showImportDialog}
            onClose={() => setShowImportDialog(false)}
            isImporting={importProgress?.status === 'running'}
            onImport={async (params) => {
              setShowImportDialog(false);
              try {
                const searchDesc = params.mode === 'search' 
                  ? `${params.brand}${params.model ? ' ' + params.model : ''}`
                  : params.category;
                setImportProgress({ status: 'running', message: `Searching for ${searchDesc}...` });
                const { data } = await base44.functions.invoke('scrapeSnapAV', params);
                setImportProgress({ status: 'complete', imported: data.productsFound, skipped: data.skippedDuplicates || 0 });
                toast.success(`Imported ${data.productsFound} new products${data.skippedDuplicates ? `, skipped ${data.skippedDuplicates} duplicates` : ''}`);

                // Auto-trigger enrichment for imported products
                setTimeout(async () => {
                  try {
                    setImportProgress(null);
                    setEnrichmentProgress({ status: 'running', message: `Enriching ${data.productsFound} products...` });
                    const enrichParams = params.mode === 'search' 
                          ? { mode: 'search', brand: params.brand, model: params.model }
                          : { mode: 'category', category: params.category };
                    const { data: enrichData } = await base44.functions.invoke('enrichProductConnectionsV2', enrichParams);
                    setEnrichmentProgress({ status: 'complete', enriched: enrichData.enriched, total: enrichData.total });
                    toast.success(`Enriched ${enrichData.enriched} products with connection data!`);

                    // Refetch products and update canvas
                    await queryClient.invalidateQueries({ queryKey: ['avProducts'] });
                    const updatedProducts = await queryClient.getQueryData(['avProducts']);
                    if (updatedProducts && canvasProducts.length > 0) {
                      projectData.setCanvasProducts(prev => prev.map(cp => {
                        const updated = updatedProducts.find(p => p.id === cp.product.id);
                        return updated ? { ...cp, product: updated } : cp;
                      }));
                    }
                    setEnrichmentProgress(null);
                  } catch (enrichError) {
                    console.error('Auto-enrichment error:', enrichError);
                    setEnrichmentProgress(null);
                  }
                }, 500);
              } catch (error) {
                console.error('Import error:', error);
                const errorMsg = error.response?.data?.error || error.message;
                setImportProgress({ status: 'error', message: errorMsg });
                toast.error(`Failed to import products: ${errorMsg}`);
                setTimeout(() => setImportProgress(null), 5000);
              }
            }}
          />
        )}

        {/* Manual Preview Modal */}
        {previewManual && (
          <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
            <div className="bg-gray-900 border border-gray-700 rounded-xl w-full max-w-5xl h-[90vh] flex flex-col">
              <div className="p-4 border-b border-gray-700 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-white">
                  {previewManual.type === 'installation' ? 'Installation Manual' : 'User Manual'}
                </h3>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => setPreviewManual(null)}
                  className="text-gray-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>
              <div className="flex-1 p-4">
                <iframe 
                  src={previewManual.url}
                  className="w-full h-full rounded border border-gray-600"
                  title={previewManual.type === 'installation' ? 'Installation Manual' : 'User Manual'}
                />
              </div>
              <div className="p-4 border-t border-gray-700 flex justify-end">
                <a
                  href={previewManual.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Open in New Tab
                </a>
              </div>
            </div>
          </div>
        )}

        {pendingProductDrop && (
          <RoomSelectDialog
            rooms={rooms}
            productName={`${pendingProductDrop.product.brand} ${pendingProductDrop.product.model}`}
            onSelect={(roomId) => {
              addProductToCanvas(pendingProductDrop.product, pendingProductDrop.position, roomId);
              setPendingProductDrop(null);
            }}
            onCancel={() => setPendingProductDrop(null)}
            onCreateRoom={(roomName) => {
              // Always ensure we have a valid floorplan ID
              let targetFloorplanId = selectedFloorplanId;
              if (!targetFloorplanId && floorplans.length > 0) {
                targetFloorplanId = floorplans[0].id;
              }
              const newRoom = handleAddRoom(roomName, targetFloorplanId);
              return newRoom?.id;
            }}
          />
        )}
        
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