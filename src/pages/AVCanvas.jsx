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

export default function AVCanvas() {
  const [canvasProducts, setCanvasProducts] = useState([]);
  const [connections, setConnections] = useState([]);
  const [connectingFrom, setConnectingFrom] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [zoom, setZoom] = useState(1);
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
      if (product && !canvasProducts.find(cp => cp.product.id === product.id)) {
        const canvasRect = canvasRef.current.getBoundingClientRect();
        setCanvasProducts([...canvasProducts, {
          product,
          position: { 
            x: Math.random() * (canvasRect.width - 300) + 50, 
            y: Math.random() * (canvasRect.height - 200) + 50 
          }
        }]);
      }
    }
  };

  const handlePositionChange = (productId, newPosition) => {
    setCanvasProducts(canvasProducts.map(cp => 
      cp.product.id === productId 
        ? { ...cp, position: newPosition }
        : cp
    ));
  };

  const handleRemoveProduct = (productId) => {
    setCanvasProducts(canvasProducts.filter(cp => cp.product.id !== productId));
    setConnections(connections.filter(c => c.from !== productId && c.to !== productId));
    if (selectedProduct?.id === productId) {
      setSelectedProduct(null);
    }
  };

  const handleConnect = (productId) => {
    if (connectingFrom === null) {
      setConnectingFrom(productId);
    } else if (connectingFrom !== productId) {
      const existingConnection = connections.find(
        c => (c.from === connectingFrom && c.to === productId) ||
             (c.from === productId && c.to === connectingFrom)
      );
      
      if (!existingConnection) {
        setConnections([...connections, { from: connectingFrom, to: productId }]);
      }
      setConnectingFrom(null);
    } else {
      setConnectingFrom(null);
    }
  };

  const handleRemoveConnection = (index) => {
    setConnections(connections.filter((_, i) => i !== index));
  };

  const clearCanvas = () => {
    setCanvasProducts([]);
    setConnections([]);
    setSelectedProduct(null);
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

  const getProductCenter = (productId) => {
    const canvasProduct = canvasProducts.find(cp => cp.product.id === productId);
    if (!canvasProduct) return { x: 0, y: 0 };
    return {
      x: canvasProduct.position.x + 128, // half of width (256px / 2)
      y: canvasProduct.position.y + 80   // approximate center height
    };
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
                className={`flex-1 relative overflow-auto bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 transition-colors ${
                  snapshot.isDraggingOver ? 'bg-blue-950/20' : ''
                }`}
                style={{
                  backgroundImage: 'radial-gradient(circle, rgba(59, 130, 246, 0.05) 1px, transparent 1px)',
                  backgroundSize: `${30 * zoom}px ${30 * zoom}px`
                }}
              >
                <svg
                  className="absolute inset-0 w-full h-full pointer-events-none"
                  style={{ zIndex: 10 }}
                >
                  <g style={{ pointerEvents: 'auto' }} transform={`scale(${zoom})`}>
                    {connections.map((connection, index) => {
                      const from = getProductCenter(connection.from);
                      const to = getProductCenter(connection.to);
                      return (
                        <ConnectionLine
                          key={index}
                          from={from}
                          to={to}
                          onRemove={() => handleRemoveConnection(index)}
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
                  transform: `scale(${zoom})`,
                  transformOrigin: 'top left',
                  transition: 'transform 0.1s ease-out'
                }}>
                  {canvasProducts.map((cp) => (
                    <CanvasProduct
                      key={cp.product.id}
                      product={cp.product}
                      position={cp.position}
                      onRemove={handleRemoveProduct}
                      onConnect={handleConnect}
                      onPositionChange={handlePositionChange}
                      isConnecting={connectingFrom === cp.product.id}
                    />
                  ))}
                </div>
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </div>

        {selectedProduct && (
          <ProductDetailsPanel
            product={selectedProduct}
            onClose={() => setSelectedProduct(null)}
          />
        )}
      </div>
    </DragDropContext>
  );
}