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
  const [draggingConnection, setDraggingConnection] = useState(null);
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
      'Control': 'C'
    };
    
    const prefix = connectionCategories[connectionData.type] || 'W';
    
    // Count existing connections of this category
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
      wireId: wireId
    }]);
    setConnectingFrom(null);
    setConnectingTo(null);
  };

  const handleConnectionClick = (connection, index) => {
    setSelectedConnection({ ...connection, index });
    setSelectedProduct(null);
    setSelectedCanvasProduct(null);
  };

  const handlePortClick = (instanceId, connectionType, portName, isInput, wasDragging) => {
    // Don't handle click if this was a drag operation
    if (wasDragging) return;
    
    // Find the connection that uses this port
    const connectionIndex = connections.findIndex(conn => {
      if (isInput) {
        return conn.to === instanceId && conn.type === connectionType && conn.toPort === portName;
      } else {
        return conn.from === instanceId && conn.type === connectionType && conn.fromPort === portName;
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
        [isInput ? 'toPort' : 'fromPort']: portName,
        isEmpty: true
      };
      setSelectedConnection({ ...emptyConnection, index: -1 });
      setSelectedProduct(null);
      setSelectedCanvasProduct(null);
    }
  };

  const handlePortDragStart = (instanceId, connectionType, portName, isInput, portElement) => {
    const canvasRect = canvasRef.current?.getBoundingClientRect();
    if (!canvasRect) return;

    const portRect = portElement.getBoundingClientRect();
    const startPos = {
      x: (portRect.left + portRect.width / 2 - canvasRect.left - pan.x) / zoom,
      y: (portRect.top + portRect.height / 2 - canvasRect.top - pan.y) / zoom
    };

    setDraggingConnection({
      fromInstanceId: instanceId,
      fromType: connectionType,
      fromPort: portName,
      isFromInput: isInput,
      startPos,
      startTime: Date.now()
    });
  };

  const handleGlobalMouseUp = React.useCallback((e) => {
    if (!draggingConnection) return;

    // Check if this was a quick click (not a drag)
    const timeDiff = Date.now() - (draggingConnection.startTime || 0);
    if (timeDiff < 150) {
      setDraggingConnection(null);
      return;
    }

    // Find which port dot (if any) the mouse is over
    const element = document.elementFromPoint(e.clientX, e.clientY);
    const portDot = element?.closest('[data-port-type]');
    
    if (portDot) {
      const instanceId = portDot.closest('[data-instance-id]')?.getAttribute('data-instance-id');
      const portType = portDot.getAttribute('data-port-type');
      const isInput = portType === 'input';
      
      // Get connection type and port name from the port dot
      // We need to find this from the canvas products
      const canvasProduct = canvasProducts.find(cp => cp.instanceId === instanceId);
      if (canvasProduct) {
        const product = canvasProduct.product;
        const defaultConnections = connectionsByCategory[product.category] || { inputs: [], outputs: [] };
        const hasRealConnections = product.connections && 
          ((product.connections.inputs && product.connections.inputs.length > 0) || 
           (product.connections.outputs && product.connections.outputs.length > 0));
        
        let productConnections = hasRealConnections ? product.connections : defaultConnections;
        const finalConnections = ['speakers', 'subwoofers', 'projector_screens'].includes(product.category)
          ? { ...productConnections, outputs: [] }
          : productConnections;

        const direction = isInput ? 'inputs' : 'outputs';
        const allPoints = [];
        (finalConnections[direction] || []).forEach(conn => {
          (conn.ports || []).forEach(port => {
            allPoints.push({ type: conn.type, port });
          });
        });

        const portIndex = parseInt(portDot.getAttribute('data-port-index'));
        const point = allPoints[portIndex];

        if (point) {
          // Check if valid connection
          const validDirection = draggingConnection.isFromInput !== isInput;
          const sameType = draggingConnection.fromType === point.type;

          if (validDirection && sameType && draggingConnection.fromInstanceId !== instanceId) {
            // Create connection
            const fromId = draggingConnection.isFromInput ? instanceId : draggingConnection.fromInstanceId;
            const toId = draggingConnection.isFromInput ? draggingConnection.fromInstanceId : instanceId;
            const fromPort = draggingConnection.isFromInput ? point.port : draggingConnection.fromPort;
            const toPort = draggingConnection.isFromInput ? draggingConnection.fromPort : point.port;

            // Categorize connection types
            const connectionCategories = {
              'HDMI': 'V', 'HDBaseT': 'V', 'Component': 'V', 'Composite': 'V', 'VGA': 'V',
              'Optical': 'A', 'Optical/TOSLINK': 'A', 'RCA': 'A', 'XLR': 'A', 'Speaker Wire': 'A',
              'Coaxial': 'A', 'Subwoofer': 'A', '3.5mm Jack': 'A', 'Wireless': 'A',
              'Ethernet': 'N', 'USB': 'N',
              'RS232': 'C', 'Control': 'C'
            };
            
            const prefix = connectionCategories[point.type] || 'W';
            
            setConnections(prevConnections => {
              const existingOfType = prevConnections.filter(c => {
                const cPrefix = connectionCategories[c.type] || 'W';
                return cPrefix === prefix;
              }).length;
              
              const wireId = `${prefix}${String(existingOfType + 1).padStart(3, '0')}`;

              return [...prevConnections, {
                from: fromId,
                to: toId,
                type: point.type,
                fromPort,
                toPort,
                wireId
              }];
            });
          }
        }
      }
    }

    setDraggingConnection(null);
  }, [draggingConnection, canvasProducts]);

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
    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleDragMouseMove);
      window.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [draggingConnection, canvasProducts, connections]);

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
    // Try to find the actual DOM element for the port dot
    const cardElement = document.querySelector(`[data-instance-id="${instanceId}"]`);
    if (!cardElement) return null;

    const canvasProduct = canvasProducts.find(cp => cp.instanceId === instanceId);
    if (!canvasProduct) return null;

    const product = canvasProduct.product;
    const defaultConnections = connectionsByCategory[product.category] || { inputs: [], outputs: [] };
    const hasRealConnections = product.connections && 
      ((product.connections.inputs && product.connections.inputs.length > 0) || 
       (product.connections.outputs && product.connections.outputs.length > 0));
    
    let connections = hasRealConnections ? product.connections : defaultConnections;
    
    const checkDirection = isOutput ? 'outputs' : 'inputs';
    const hasRequestedType = (connections[checkDirection] || []).some(conn => conn.type === connectionType);
    
    if (!hasRequestedType) {
      connections = defaultConnections;
    }

    const finalConnections = ['speakers', 'subwoofers', 'projector_screens'].includes(product.category)
      ? { ...connections, outputs: [] }
      : connections;

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

    // Try to get actual DOM position
    const portType = isOutput ? 'output' : 'input';
    const portElement = cardElement.querySelector(`[data-port-type="${portType}"][data-port-index="${pointIndex < 6 ? pointIndex : pointIndex - 6}"]`);
    
    if (portElement) {
      const portRect = portElement.getBoundingClientRect();
      const canvasRect = canvasRef.current?.getBoundingClientRect();
      
      if (canvasRect) {
        // Get center of the port dot in canvas coordinates, accounting for zoom and pan
        const x = (portRect.left + portRect.width / 2 - canvasRect.left - pan.x) / zoom;
        const y = (portRect.top + portRect.height / 2 - canvasRect.top - pan.y) / zoom;
        return { x, y };
      }
    }

    // Fallback to calculated position if DOM element not found
    const cardWidth = 320;
    const cardHeight = 280;
    const gapSize = 8;
    const circleSize = 16;
    const baseX = canvasProduct.position.x;
    const baseY = canvasProduct.position.y;
    const centerY = baseY + cardHeight / 2;
    const halfCircle = circleSize / 2;

    if (pointIndex < 6) {
      const verticalCount = Math.min(allPoints.length, 6);
      const totalContainerHeight = (verticalCount * circleSize) + ((verticalCount - 1) * gapSize);
      const containerTop = centerY - (totalContainerHeight / 2);
      const y = containerTop + (pointIndex * (circleSize + gapSize)) + halfCircle;

      if (isOutput) {
        const x = baseX + cardWidth + halfCircle;
        return { x, y };
      } else {
        const x = baseX - halfCircle;
        return { x, y };
      }
    } else {
      const overflowIndex = pointIndex - 6;
      const horizontalCount = Math.min(allPoints.length - 6, 8);
      const totalContainerWidth = (horizontalCount * circleSize) + ((horizontalCount - 1) * gapSize);
      const centerX = baseX + cardWidth / 2;
      const containerLeft = centerX - (totalContainerWidth / 2);
      const x = containerLeft + (overflowIndex * (circleSize + gapSize)) + halfCircle;
      const y = baseY - halfCircle;
      return { x, y };
    }
  };

  // Calculate connection positions and edges on every render
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
                  onMouseMove={(e) => {
                    if (draggingConnection) {
                      const canvasRect = canvasRef.current?.getBoundingClientRect();
                      if (canvasRect) {
                        const currentPos = {
                          x: (e.clientX - canvasRect.left - pan.x) / zoom,
                          y: (e.clientY - canvasRect.top - pan.y) / zoom
                        };
                        setDraggingConnection({ ...draggingConnection, currentPos });
                      }
                    }
                  }}
                >
                  <g style={{ pointerEvents: 'auto' }} transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
                    {connections.map((connection, index) => {
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
                          onWaypointsChange={(newWaypoints) => {
                            const newConnections = [...connections];
                            newConnections[index].waypoints = newWaypoints;
                            setConnections(newConnections);
                          }}
                        />
                      );
                    })}

                    {/* Dragging connection line */}
                    {draggingConnection && draggingConnection.currentPos && (
                      <line
                        x1={draggingConnection.startPos.x}
                        y1={draggingConnection.startPos.y}
                        x2={draggingConnection.currentPos.x}
                        y2={draggingConnection.currentPos.y}
                        stroke="#3b82f6"
                        strokeWidth="3"
                        strokeDasharray="5,5"
                        className="pointer-events-none"
                      />
                    )}
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
                        onPortDragStart={handlePortDragStart}
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