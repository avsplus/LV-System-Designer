import React, { useState } from 'react';
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Search, Grip, ChevronDown, ChevronRight, X, Filter } from "lucide-react";
import { Draggable, Droppable } from '@hello-pangea/dnd';

const categorySolidColors = {
  televisions: "bg-blue-600",
  projectors: "bg-purple-600",
  projector_screens: "bg-fuchsia-600",
  video_distribution: "bg-cyan-500",
  matrix_switchers: "bg-teal-600",
  audio_streamers: "bg-pink-500",
  media_streamers: "bg-rose-600",
  speakers: "bg-green-600",
  soundbars: "bg-lime-500",
  subwoofers: "bg-red-600",
  stereo_amps: "bg-orange-600",
  multizone_amps: "bg-amber-600",
  surround_processors: "bg-yellow-400",
  av_receivers: "bg-emerald-600"
};

export default function ProductSidebar({ products, onProductSelect }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedCategories, setExpandedCategories] = useState({});
  const [showFilters, setShowFilters] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [selectedBrands, setSelectedBrands] = useState([]);
  const [selectedConnectionTypes, setSelectedConnectionTypes] = useState([]);

  // Extract unique values for filters
  const allCategories = [...new Set(products.map(p => p.category))].sort();
  const allBrands = [...new Set(products.map(p => p.brand))].sort();
  const allConnectionTypes = [...new Set(
    products.flatMap(p => [
      ...(p.connections?.inputs?.map(i => i.type) || []),
      ...(p.connections?.outputs?.map(o => o.type) || [])
    ])
  )].sort();

  const filteredProducts = products.filter(product => {
    // Text search
    const matchesSearch = !searchTerm || 
      product.brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.category.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Category filter
    const matchesCategory = selectedCategories.length === 0 || 
      selectedCategories.includes(product.category);
    
    // Brand filter
    const matchesBrand = selectedBrands.length === 0 || 
      selectedBrands.includes(product.brand);
    
    // Connection type filter
    const productConnectionTypes = [
      ...(product.connections?.inputs?.map(i => i.type) || []),
      ...(product.connections?.outputs?.map(o => o.type) || [])
    ];
    const matchesConnectionType = selectedConnectionTypes.length === 0 || 
      selectedConnectionTypes.some(type => productConnectionTypes.includes(type));
    
    return matchesSearch && matchesCategory && matchesBrand && matchesConnectionType;
  });

  const toggleFilter = (filterType, value) => {
    const setters = {
      category: setSelectedCategories,
      brand: setSelectedBrands,
      connectionType: setSelectedConnectionTypes
    };
    const getters = {
      category: selectedCategories,
      brand: selectedBrands,
      connectionType: selectedConnectionTypes
    };
    
    const currentValues = getters[filterType];
    const setter = setters[filterType];
    
    if (currentValues.includes(value)) {
      setter(currentValues.filter(v => v !== value));
    } else {
      setter([...currentValues, value]);
    }
  };

  const clearAllFilters = () => {
    setSelectedCategories([]);
    setSelectedBrands([]);
    setSelectedConnectionTypes([]);
    setSearchTerm('');
  };

  const activeFiltersCount = selectedCategories.length + selectedBrands.length + selectedConnectionTypes.length;

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
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-white">AV Products</h2>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setShowFilters(!showFilters)}
            className={`text-gray-400 hover:text-white relative ${activeFiltersCount > 0 ? 'text-blue-400' : ''}`}
          >
            <Filter className="w-4 h-4" />
            {activeFiltersCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-blue-500 rounded-full text-[10px] text-white flex items-center justify-center">
                {activeFiltersCount}
              </span>
            )}
          </Button>
        </div>
        
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <Input
            placeholder="Search products..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-gray-800 border-gray-700 text-white placeholder:text-gray-500 focus:border-blue-500"
          />
        </div>

        {showFilters && (
          <div className="mt-3 p-3 bg-gray-800 rounded-lg space-y-3 max-h-64 overflow-y-auto">
            {/* Category Filter */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-medium text-gray-400">Categories</label>
                {selectedCategories.length > 0 && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setSelectedCategories([])}
                    className="h-5 px-2 text-xs text-gray-500 hover:text-white"
                  >
                    Clear
                  </Button>
                )}
              </div>
              <div className="flex flex-wrap gap-1">
                {allCategories.map(category => (
                  <Badge
                    key={category}
                    onClick={() => toggleFilter('category', category)}
                    className={`cursor-pointer text-xs capitalize ${
                      selectedCategories.includes(category)
                        ? 'bg-blue-600 text-white border-blue-500'
                        : 'bg-gray-700 text-gray-300 border-gray-600 hover:bg-gray-600'
                    }`}
                  >
                    {category.replace(/_/g, ' ')}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Brand Filter */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-medium text-gray-400">Brands</label>
                {selectedBrands.length > 0 && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setSelectedBrands([])}
                    className="h-5 px-2 text-xs text-gray-500 hover:text-white"
                  >
                    Clear
                  </Button>
                )}
              </div>
              <div className="flex flex-wrap gap-1">
                {allBrands.slice(0, 12).map(brand => (
                  <Badge
                    key={brand}
                    onClick={() => toggleFilter('brand', brand)}
                    className={`cursor-pointer text-xs ${
                      selectedBrands.includes(brand)
                        ? 'bg-blue-600 text-white border-blue-500'
                        : 'bg-gray-700 text-gray-300 border-gray-600 hover:bg-gray-600'
                    }`}
                  >
                    {brand}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Connection Type Filter */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-medium text-gray-400">Connection Types</label>
                {selectedConnectionTypes.length > 0 && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setSelectedConnectionTypes([])}
                    className="h-5 px-2 text-xs text-gray-500 hover:text-white"
                  >
                    Clear
                  </Button>
                )}
              </div>
              <div className="flex flex-wrap gap-1">
                {allConnectionTypes.slice(0, 10).map(type => (
                  <Badge
                    key={type}
                    onClick={() => toggleFilter('connectionType', type)}
                    className={`cursor-pointer text-xs ${
                      selectedConnectionTypes.includes(type)
                        ? 'bg-blue-600 text-white border-blue-500'
                        : 'bg-gray-700 text-gray-300 border-gray-600 hover:bg-gray-600'
                    }`}
                  >
                    {type}
                  </Badge>
                ))}
              </div>
            </div>

            {activeFiltersCount > 0 && (
              <Button
                size="sm"
                variant="outline"
                onClick={clearAllFilters}
                className="w-full text-xs border-gray-700 text-gray-300 hover:bg-gray-700"
              >
                <X className="w-3 h-3 mr-1" />
                Clear All Filters
              </Button>
            )}
          </div>
        )}
        
        {activeFiltersCount > 0 && (
          <div className="mt-2 text-xs text-gray-400">
            Showing {filteredProducts.length} of {products.length} products
          </div>
        )}
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
                      <div className={`${categorySolidColors[category]} px-2 py-1 rounded text-white text-xs font-medium capitalize`}>
                        {category.replace(/_/g, ' ')}
                      </div>
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