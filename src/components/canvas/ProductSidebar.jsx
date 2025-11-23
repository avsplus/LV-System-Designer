import React, { useState } from 'react';
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Grip, ChevronDown, ChevronRight } from "lucide-react";
import { Draggable, Droppable } from '@hello-pangea/dnd';

const categorySolidColors = {
  televisions: "bg-blue-500",
  projectors: "bg-purple-500",
  projector_screens: "bg-indigo-500",
  video_distribution: "bg-cyan-500",
  matrix_switchers: "bg-teal-500",
  audio_streamers: "bg-pink-500",
  media_streamers: "bg-rose-500",
  speakers: "bg-green-500",
  soundbars: "bg-lime-500",
  subwoofers: "bg-red-500",
  stereo_amps: "bg-orange-500",
  multizone_amps: "bg-amber-500",
  surround_processors: "bg-yellow-500",
  av_receivers: "bg-emerald-500"
};

export default function ProductSidebar({ products, onProductSelect }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedCategories, setExpandedCategories] = useState({});

  const filteredProducts = products.filter(product => 
    product.brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Group products by category
  const productsByCategory = filteredProducts.reduce((acc, product) => {
    if (!acc[product.category]) {
      acc[product.category] = [];
    }
    acc[product.category].push(product);
    return acc;
  }, {});

  const toggleCategory = (category) => {
    setExpandedCategories(prev => ({
      [category]: !prev[category]
    }));
  };

  return (
    <div className="w-80 bg-gray-900 border-r border-gray-800 flex flex-col h-full">
      <div className="p-4 border-b border-gray-800">
        <h2 className="text-lg font-semibold text-white mb-3">AV Products</h2>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <Input
            placeholder="Search products..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-gray-800 border-gray-700 text-white placeholder:text-gray-500 focus:border-blue-500"
          />
        </div>
      </div>

      <Droppable droppableId="sidebar" isDropDisabled={true}>
        {(provided) => (
          <div 
            ref={provided.innerRef}
            {...provided.droppableProps}
            className="flex-1 overflow-y-auto p-3 space-y-3"
          >
            {Object.entries(productsByCategory).map(([category, categoryProducts], catIndex) => {
              const isExpanded = expandedCategories[category] === true;
              
              return (
                <div key={category} className="space-y-2">
                  <button
                    onClick={() => toggleCategory(category)}
                    className="w-full flex items-center justify-between px-3 py-2 bg-gray-800/50 hover:bg-gray-800 rounded-lg transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      {isExpanded ? (
                        <ChevronDown className="w-4 h-4 text-gray-400" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-gray-400" />
                      )}
                      <div className={`w-5 h-5 rounded ${categorySolidColors[category]}`}></div>
                      <span className="text-xs text-gray-300 capitalize">{category.replace(/_/g, ' ')}</span>
                      <span className="text-xs text-gray-500">({categoryProducts.length})</span>
                    </div>
                  </button>
                  
                  {isExpanded && (
                    <div className="space-y-2 pl-2">
                      {categoryProducts.map((product, prodIndex) => (
                        <Draggable 
                          key={product.id} 
                          draggableId={product.id} 
                          index={filteredProducts.findIndex(p => p.id === product.id)}
                        >
                          {(provided, snapshot) => (
                            <>
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                onClick={() => onProductSelect(product)}
                                className={`group bg-gray-800 hover:bg-gray-750 border border-gray-700 rounded-lg p-3 cursor-pointer transition-all ${
                                  snapshot.isDragging ? 'shadow-xl shadow-blue-500/20 border-blue-500' : ''
                                }`}
                              >
                                <div className="flex items-start gap-3">
                                  <div className="mt-1">
                                    <Grip className="w-4 h-4 text-gray-600 group-hover:text-gray-400" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <h3 className="font-medium text-white text-sm truncate mb-1">
                                      {product.brand}
                                    </h3>
                                    <p className="text-xs text-gray-400 truncate">{product.model}</p>
                                    {product.price && (
                                      <p className="text-xs text-blue-400 mt-1">${product.price.toLocaleString()}</p>
                                    )}
                                  </div>
                                </div>
                              </div>
                              {snapshot.isDragging && (
                                <div className="bg-gray-800 border border-gray-700 rounded-lg p-3 opacity-50">
                                  <div className="flex items-start gap-3">
                                    <Grip className="w-4 h-4 text-gray-600 mt-1" />
                                    <div className="flex-1">
                                      <h3 className="font-medium text-white text-sm">{product.brand}</h3>
                                      <p className="text-xs text-gray-400">{product.model}</p>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </>
                          )}
                        </Draggable>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </div>
  );
}