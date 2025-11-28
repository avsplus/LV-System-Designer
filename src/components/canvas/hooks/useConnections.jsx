import { useState, useRef, useCallback, useEffect } from 'react';
import { trackActivity, ActivityActions } from "../../activity/activityTracker";
import { CONNECTION_CATEGORIES, CONNECTIONS_BY_CATEGORY, PORT_HIT_RADIUS, PORT_OFFSET, CARD_WIDTH, CARD_HEIGHT, PORT_DOT_SIZE, PORT_GAP } from '../constants';

// Helper to ensure networkInfo is always defined
const ensureNetworkInfo = (product) => ({
  ...product,
  networkInfo: product.networkInfo || { sw: '', port: '', ip: '000.000.000.000', mac: '00:00:00:00:00:00' }
});

export default function useConnections({ 
  canvasProducts, 
  connections, 
  setConnections,
  currentProject,
  zoom,
  pan,
  canvasRef,
  toast,
  confirmDialog
}) {
  const [connectingFrom, setConnectingFrom] = useState(null);
  const [connectingTo, setConnectingTo] = useState(null);
  const [pendingConnection, setPendingConnection] = useState(null);
  const [selectedConnection, setSelectedConnection] = useState(null);
  const [highlightedConnections, setHighlightedConnections] = useState([]);
  const [hoveredConnectionIndex, setHoveredConnectionIndex] = useState(null);
  const [connectingState, setConnectingState] = useState(null);
  const [hoveredPortId, setHoveredPortId] = useState(null);
  
  const portRefs = useRef(new Map());
  const connectingStateRef = useRef(null);

  // Sync connectingState to ref
  useEffect(() => {
    connectingStateRef.current = connectingState;
  }, [connectingState]);

  // Port ID helper
  const getPortId = useCallback((instanceId, connectionType, portName, isInput) => {
    return `${instanceId}:${isInput ? 'in' : 'out'}:${connectionType}:${portName}`;
  }, []);

  // Register port element for hit-testing
  const registerPort = useCallback((portId, element, instanceId, connectionType, portName, isInput) => {
    if (element) {
      portRefs.current.set(portId, { element, instanceId, connectionType, portName, isInput });
    } else {
      portRefs.current.delete(portId);
    }
  }, []);

  // Hit test to find port near mouse position
  const hitTestPort = useCallback((mouseX, mouseY) => {
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
  }, [canvasRef, pan, zoom]);

  // Get port position in canvas coordinates
  const getPortPosition = useCallback((portElement) => {
    const canvasRect = canvasRef.current?.getBoundingClientRect();
    if (!canvasRect || !portElement) return null;

    const portRect = portElement.getBoundingClientRect();
    return {
      x: (portRect.left + portRect.width / 2 - canvasRect.left - pan.x) / zoom,
      y: (portRect.top + portRect.height / 2 - canvasRect.top - pan.y) / zoom
    };
  }, [canvasRef, pan, zoom]);

  // Validate connection
  const validateConnection = useCallback((fromId, toId, connectionType) => {
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
      const networkCategories = ['televisions', 'projectors', 'video_distribution', 'matrix_switchers', 
                                  'audio_streamers', 'media_streamers', 'soundbars', 'multizone_amps', 
                                  'surround_processors', 'av_receivers'];
      const fromNeedsNetwork = networkCategories.includes(fromProduct.product.category);
      const toNeedsNetwork = networkCategories.includes(toProduct.product.category);

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
  }, [canvasProducts, connections]);

  const handleConnect = useCallback((instanceId) => {
    if (connectingFrom === null) {
      setConnectingFrom(instanceId);
    } else if (connectingFrom !== instanceId) {
      setConnectingTo(instanceId);
    } else {
      setConnectingFrom(null);
    }
  }, [connectingFrom]);

  const handleConnectionTypeSelect = useCallback(async (connectionData) => {
    const validation = validateConnection(connectingFrom, connectingTo, connectionData.type);
    
    if (!validation.valid) {
      toast?.error(`Cannot create connection: ${validation.errors.join(', ')}`);
      setConnectingFrom(null);
      setConnectingTo(null);
      setPendingConnection(null);
      return;
    }
    
    if (validation.warnings.length > 0 && confirmDialog) {
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
    
    const prefix = CONNECTION_CATEGORIES[connectionData.type] || 'W';
    const existingOfType = connections.filter(c => {
      const cPrefix = CONNECTION_CATEGORIES[c.type] || 'W';
      return cPrefix === prefix;
    }).length;
    
    const wireId = `${prefix}${String(existingOfType + 1).padStart(3, '0')}`;
    
    setConnections(prev => [...prev, { 
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
  }, [connectingFrom, connectingTo, connections, setConnections, currentProject, validateConnection, toast, confirmDialog]);

  const handleConnectionClick = useCallback((connection, index) => {
    setSelectedConnection({ ...connection, index });
  }, []);

  const handleConnectionHover = useCallback((index) => {
    setHoveredConnectionIndex(index);
  }, []);

  const handleConnectionLeave = useCallback(() => {
    setHoveredConnectionIndex(null);
  }, []);

  const handleDeleteConnection = useCallback(() => {
    if (selectedConnection) {
      setConnections(prev => prev.filter((_, i) => i !== selectedConnection.index));
      setSelectedConnection(null);
    }
  }, [selectedConnection, setConnections]);

  // Start connecting from a port
  const handlePortMouseDown = useCallback((instanceId, connectionType, portName, isInput, portElement, event) => {
    const startPos = getPortPosition(portElement);
    if (!startPos) return;

    const newState = {
      mode: 'connecting',
      fromPort: { instanceId, connectionType, portName, isInput },
      startPos,
      mousePos: startPos,
      startTime: Date.now(),
      clickX: event?.clientX,
      clickY: event?.clientY
    };

    setConnectingState(newState);
    connectingStateRef.current = newState;
  }, [getPortPosition]);

  // Update mouse position while dragging
  const handleGlobalMouseMove = useCallback((e) => {
    const currentState = connectingStateRef.current;
    if (!currentState) return;

    const canvasRect = canvasRef.current?.getBoundingClientRect();
    if (!canvasRect) return;

    const hitPort = hitTestPort(e.clientX, e.clientY);
    
    let validHitPort = null;
    if (hitPort) {
      const validDirection = currentState.fromPort.isInput !== hitPort.isInput;
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
  }, [canvasRef, hitTestPort, pan, zoom]);

  const handleGlobalMouseUp = useCallback((e) => {
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
      
      const validDirection = fromPort.isInput !== toPort.isInput;
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

  // Handle port click for showing connection details
  const handlePortClick = useCallback((instanceId, connectionType, portName, isInput) => {
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
    }
  }, [connections, handleConnectionClick]);

  // Calculate port position in world coordinates
  const getPortWorldPosition = useCallback((instanceId, connectionType, isOutput) => {
    const product = canvasProducts.find(cp => cp.instanceId === instanceId);
    if (!product) return null;

    const defaultConnections = CONNECTIONS_BY_CATEGORY[product.product.category] || { inputs: [], outputs: [] };
    const hasDbConnections = (product.product.input_connections?.length > 0) || 
                              (product.product.output_connections?.length > 0);
    const conns = hasDbConnections ? {
      inputs: product.product.input_connections || [],
      outputs: product.product.output_connections || []
    } : defaultConnections;

    const types = isOutput ? conns.outputs : conns.inputs;
    const portIndex = types.findIndex(t => t.type === connectionType);
    
    if (portIndex === -1) return null;

    const totalPorts = Math.min(types.length, 6);
    const totalHeight = (totalPorts - 1) * (PORT_DOT_SIZE + PORT_GAP);
    const startY = product.position.y + CARD_HEIGHT / 2 - totalHeight / 2;
    const portY = startY + portIndex * (PORT_DOT_SIZE + PORT_GAP);

    const portX = isOutput 
      ? product.position.x + CARD_WIDTH + PORT_DOT_SIZE / 2
      : product.position.x - PORT_DOT_SIZE / 2;

    return { x: portX, y: portY };
  }, [canvasProducts]);

  const getConnectionPointPosition = useCallback((instanceId, connectionType, portName, isOutput) => {
    return getPortWorldPosition(instanceId, connectionType, isOutput);
  }, [getPortWorldPosition]);

  // Generate orthogonal path for connection routing
  const generateOrthogonalPath = useCallback((fromPos, toPos, fromIsInput, toIsInput) => {
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
  }, []);

  const pointsToPathData = useCallback((points) => {
    if (points.length < 2) return '';
    let path = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      path += ` L ${points[i].x} ${points[i].y}`;
    }
    return path;
  }, []);

  // Global mouse listeners
  useEffect(() => {
    window.addEventListener('mousemove', handleGlobalMouseMove);
    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleGlobalMouseMove);
      window.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [handleGlobalMouseMove, handleGlobalMouseUp]);

  return {
    connectingFrom,
    setConnectingFrom,
    connectingTo,
    setConnectingTo,
    pendingConnection,
    setPendingConnection,
    selectedConnection,
    setSelectedConnection,
    highlightedConnections,
    setHighlightedConnections,
    hoveredConnectionIndex,
    connectingState,
    hoveredPortId,
    portRefs,
    getPortId,
    registerPort,
    handleConnect,
    handleConnectionTypeSelect,
    handleConnectionClick,
    handleConnectionHover,
    handleConnectionLeave,
    handleDeleteConnection,
    handlePortMouseDown,
    handlePortClick,
    getPortWorldPosition,
    getConnectionPointPosition,
    generateOrthogonalPath,
    pointsToPathData,
    ensureNetworkInfo
  };
}