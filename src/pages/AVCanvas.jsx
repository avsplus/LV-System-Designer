import React, { useState, useRef, useEffect } from 'react';
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { DragDropContext, Droppable } from '@hello-pangea/dnd';
import { Button } from "@/components/ui/button";
import { Trash2, Download, Plus, ZoomIn, ZoomOut, Maximize2 } from "lucide-react";
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
  const canvasRef = useRef(null);

  const { data: products = [], isLoading } = useQuery({
    queryKey: ['avProducts'],
    queryFn: () => base44.entities.AVProduct.list(),
  });

  const onDragEnd = (result) => {
    const { source, destination, draggableId } = result;

    if (!destination) return;

    // Dragging from sidebar to canvas
    if (source.droppableId === 'sidebar' && destination.droppableId === 'canvas') {
      const product = products.find(p => p.id === draggableId);
      if (product) {
        const canvasRect = canvasRef.current.getBoundingClientRect();
        const instanceId = `${product.id}_${Date.now()}_${Math.random()}`;
        setCanvasProducts([...canvasProducts, {
          instanceId,
          product,
          position: { 
            x: Math.random() * (canvasRect.width - 300) + 50, 
            y: Math.random() * (canvasRect.height - 200) + 50 
          }
        }]);
      }
    }
  };

  const handlePositionChange = (instanceId, newPosition) => {
    setCanvasProducts(canvasProducts.map(cp => 
      cp.instanceId === instanceId 
        ? { ...cp, position: newPosition }
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
      const existingConnection = connections.find(
        c => (c.from === connectingFrom && c.to === instanceId) ||
             (c.from === instanceId && c.to === connectingFrom)
      );
      
      if (!existingConnection) {
        setConnectingTo(instanceId);
      } else {
        setConnectingFrom(null);
      }
    } else {
      setConnectingFrom(null);
    }
  };

  const handleConnectionTypeSelect = (type) => {
    setConnections([...connections, { 
      from: connectingFrom, 
      to: connectingTo,
      type: type
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

  const getProductCenter = (instanceId) => {
    const canvasProduct = canvasProducts.find(cp => cp.instanceId === instanceId);
    if (!canvasProduct) return { x: 0, y: 0 };
    return {
      x: canvasProduct.position.x + 128, // half of width (256px / 2)
      y: canvasProduct.position.y + 80   // approximate center height
    };
  };

  const getProductEdgePoint = (fromId, toId) => {
    const fromProduct = canvasProducts.find(cp => cp.instanceId === fromId);
    const toProduct = canvasProducts.find(cp => cp.instanceId === toId);
    
    if (!fromProduct || !toProduct) return { from: { x: 0, y: 0 }, to: { x: 0, y: 0 } };
    
    const cardWidth = 256;
    const cardHeight = 160;
    
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
    
    // Determine which edge to use based on direction (perpendicular connections)
    let fromEdge, toEdge;
    
    if (Math.abs(dx) > Math.abs(dy)) {
      // Horizontal connection
      if (dx > 0) {
        // Connect from right edge of fromProduct
        fromEdge = {
          x: fromProduct.position.x + cardWidth,
          y: fromCenter.y
        };
        // Connect to left edge of toProduct
        toEdge = {
          x: toProduct.position.x,
          y: toCenter.y
        };
      } else {
        // Connect from left edge of fromProduct
        fromEdge = {
          x: fromProduct.position.x,
          y: fromCenter.y
        };
        // Connect to right edge of toProduct
        toEdge = {
          x: toProduct.position.x + cardWidth,
          y: toCenter.y
        };
      }
    } else {
      // Vertical connection
      if (dy > 0) {
        // Connect from bottom edge of fromProduct
        fromEdge = {
          x: fromCenter.x,
          y: fromProduct.position.y + cardHeight
        };
        // Connect to top edge of toProduct
        toEdge = {
          x: toCenter.x,
          y: toProduct.position.y
        };
      } else {
        // Connect from top edge of fromProduct
        fromEdge = {
          x: fromCenter.x,
          y: fromProduct.position.y
        };
        // Connect to bottom edge of toProduct
        toEdge = {
          x: toCenter.x,
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
                      const { from, to } = getProductEdgePoint(connection.from, connection.to);
                      const isHighlighted = highlightedConnections.includes(index);

                      // Calculate offset for parallel connections
                      let offset = 0;
                      const parallelConnections = connections.filter((conn, idx) => {
                        if (idx >= index) return false;
                        const isSameDirection = 
                          (conn.from === connection.from && conn.to === connection.to) ||
                          (conn.from === connection.to && conn.to === connection.from);
                        return isSameDirection;
                      });
                      offset = parallelConnections.length * 25;

                      return (
                        <ConnectionLine
                          key={index}
                          from={from}
                          to={to}
                          connectionType={connection.type}
                          waypoints={connection.waypoints}
                          isHighlighted={isHighlighted}
                          offset={offset}
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
                        onClick={() => {
                          setSelectedCanvasProduct({ ...cp.product, instanceId: cp.instanceId });
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
            activeConnections={connections}
            allProducts={canvasProducts}
            onClose={() => setSelectedCanvasProduct(null)}
            onHighlightConnections={setHighlightedConnections}
          />
        )}

        {selectedConnection && (
          <ConnectionDetailsPanel
            connection={selectedConnection}
            fromProduct={canvasProducts.find(cp => cp.instanceId === selectedConnection.from)?.product}
            toProduct={canvasProducts.find(cp => cp.instanceId === selectedConnection.to)?.product}
            onClose={() => setSelectedConnection(null)}
            onDelete={handleDeleteConnection}
          />
        )}

        {connectingFrom !== null && connectingTo !== null && (
          <ConnectionTypeDialog
            fromProduct={canvasProducts.find(cp => cp.instanceId === connectingFrom)?.product}
            toProduct={canvasProducts.find(cp => cp.instanceId === connectingTo)?.product}
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