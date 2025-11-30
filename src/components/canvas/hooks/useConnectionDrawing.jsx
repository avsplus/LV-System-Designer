import { useState, useRef, useCallback, useEffect } from 'react';

const PORT_HIT_RADIUS = 50;
const PORT_OFFSET = 20;

export default function useConnectionDrawing(zoom, pan, canvasRef) {
  const [connectingState, setConnectingState] = useState(null);
  const [hoveredPortId, setHoveredPortId] = useState(null);
  const [connectingFrom, setConnectingFrom] = useState(null);
  const [connectingTo, setConnectingTo] = useState(null);
  const [pendingConnection, setPendingConnection] = useState(null);
  
  const portRefs = useRef(new Map());
  const connectingStateRef = useRef(null);

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

  const getPortId = useCallback((instanceId, connectionType, portName, isInput) => {
    return `${instanceId}:${isInput ? 'in' : 'out'}:${connectionType}:${portName}`;
  }, []);

  const registerPort = useCallback((portId, element, instanceId, connectionType, portName, isInput) => {
    if (element) {
      portRefs.current.set(portId, { element, instanceId, connectionType, portName, isInput });
    } else {
      portRefs.current.delete(portId);
    }
  }, []);

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
  }, [zoom, pan, canvasRef]);

  const getPortPosition = useCallback((portElement) => {
    const canvasRect = canvasRef.current?.getBoundingClientRect();
    if (!canvasRect || !portElement) return null;

    const portRect = portElement.getBoundingClientRect();
    return {
      x: (portRect.left + portRect.width / 2 - canvasRect.left - pan.x) / zoom,
      y: (portRect.top + portRect.height / 2 - canvasRect.top - pan.y) / zoom
    };
  }, [zoom, pan, canvasRef]);

  const handlePortMouseDown = useCallback((instanceId, connectionType, portName, isInput, portElement) => {
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
  }, [getPortPosition]);

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
  }, [zoom, pan, canvasRef, hitTestPort]);

  const handleGlobalMouseUp = useCallback((e, canvasProducts, connections) => {
    const currentState = connectingStateRef.current;
    if (!currentState) return null;

    const timeDiff = Date.now() - (currentState.startTime || 0);
    const mouseMoveDist = Math.sqrt(
      Math.pow(e.clientX - (currentState.clickX || e.clientX), 2) +
      Math.pow(e.clientY - (currentState.clickY || e.clientY), 2)
    );

    // Quick click - not a drag
    if (timeDiff < 200 && mouseMoveDist < 10) {
      setConnectingState(null);
      connectingStateRef.current = null;
      setHoveredPortId(null);
      return null;
    }

    let result = null;
    if (currentState.hoveredPort) {
      const toPort = currentState.hoveredPort;
      const { fromPort } = currentState;
      
      const validDirection = fromPort.isInput !== toPort.isInput;
      const sameType = fromPort.connectionType === toPort.connectionType;
      const differentDevice = fromPort.instanceId !== toPort.instanceId;
      
      if (validDirection && sameType && differentDevice) {
        const fromId = fromPort.isInput ? toPort.instanceId : fromPort.instanceId;
        const toId = fromPort.isInput ? fromPort.instanceId : toPort.instanceId;

        const targetDevice = canvasProducts.find(cp => cp.instanceId === toId);
        const isEndpointDevice = targetDevice && ['speakers', 'subwoofers'].includes(targetDevice.product.category);

        if (!isEndpointDevice || !connections.find(c => c.to === toId)) {
          result = { fromId, toId, connectionType: fromPort.connectionType };
          setConnectingFrom(fromId);
          setConnectingTo(toId);
          setPendingConnection(result);
        }
      }
    }

    setConnectingState(null);
    connectingStateRef.current = null;
    setHoveredPortId(null);
    return result;
  }, []);

  const resetConnectionState = useCallback(() => {
    setConnectingFrom(null);
    setConnectingTo(null);
    setPendingConnection(null);
  }, []);

  // Sync connectingState to ref
  useEffect(() => {
    connectingStateRef.current = connectingState;
  }, [connectingState]);

  return {
    connectingState,
    hoveredPortId,
    connectingFrom,
    connectingTo,
    pendingConnection,
    setConnectingFrom,
    setConnectingTo,
    setPendingConnection,
    getPortId,
    registerPort,
    handlePortMouseDown,
    handleGlobalMouseMove,
    handleGlobalMouseUp,
    resetConnectionState,
    generateOrthogonalPath,
    pointsToPathData
  };
}