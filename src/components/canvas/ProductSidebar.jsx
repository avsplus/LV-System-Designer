import React, { useState } from 'react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, ChevronDown, ChevronRight, Filter, Grip } from "lucide-react";
import { Draggable, Droppable } from '@hello-pangea/dnd';

const CATEGORY_COLORS = {
  av_receivers: "bg-emerald-500",
  projectors: "bg-purple-500",
  hdmi_extenders: "bg-indigo-600",
  matrix_switchers: "bg-indigo-500",
  media_streamers: "bg-pink-500",
  video_distribution: "bg-cyan-500",
  audio_streamers: "bg-sky-500",
  speakers: "bg-green-500",
  soundbars: "bg-lime-500",
  subwoofers: "bg-red-500",
  stereo_amps: "bg-orange-500",
  multizone_amps: "bg-amber-500",
  surround_processors: "bg-yellow-500",
  televisions: "bg-blue-500",
  projector_screens: "bg-fuchsia-500",
  network_switches: "bg-slate-500",
  routers: "bg-slate-500",
  access_points: "bg-sky-500",
  patch_panels: "bg-slate-600",
  data_jacks: "bg-blue-600",
  control_processors: "bg-violet-500",
  touch_panels: "bg-indigo-500",
  telephones: "bg-cyan-600",
  phone_jacks: "bg-cyan-500",
  intercoms: "bg-teal-500",
  nvrs: "bg-gray-600",
  ip_cameras: "bg-gray-500"
};

const MASTER_CATEGORIES = {
  'AV': ['av_receivers', 'projectors', 'hdmi_extenders', 'matrix_switchers', 'media_streamers', 'video_distribution'],
  'Audio': ['audio_streamers', 'speakers', 'soundbars', 'subwoofers', 'stereo_amps', 'multizone_amps', 'surround_processors'],
  'Displays': ['televisions', 'projector_screens'],
  'Communication': ['telephones', 'phone_jacks', 'intercoms'],
  'Control': ['control_processors', 'touch_panels'],
  'Network': ['network_switches', 'routers', 'access_points', 'patch_panels', 'data_jacks'],
  'Surveillance': ['nvrs', 'ip_cameras']
};

export default function ProductSidebar({ products, onProductSelect }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMasterCategory, setSelectedMasterCategory] = useState('AV');
  const [expandedCategories, setExpandedCategories] = useState({});

  const filteredProducts = products.filter(p =>
    p.brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.model.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const categoriesInMaster = MASTER_CATEGORIES[selectedMasterCategory] || [];
  const categoryProducts = {};
  
  categoriesInMaster.forEach(cat => {
    categoryProducts[cat] = filteredProducts.filter(p => p.category === cat);
  });

  const toggleCategory = (category) => {
    setExpandedCategories(prev => ({
      ...prev,
      [category]: !prev[category]
    }));
  };

  return (
    <div className="w-56 bg-gray-900 border-r border-gray-800 flex flex-col h-full">
      {/* Logo Section */}
      <div className="p-4 border-b border-gray-800">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded bg-blue-600 flex items-center justify-center text-white text-xs font-bold">AV</div>
          <div className="flex-1">
            <div className="text-xs font-semibold text-gray-400">Powered by</div>
            <div className="text-xs text-blue-400">DesionOfficial</div>
          </div>
        </div>
      </div>

      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-800">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-white">Product Library</h2>
          <Filter className="w-4 h-4 text-gray-500" />
        </div>

        {/* Search */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <Input
            placeholder="Search products..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-gray-800 border-gray-700 text-white text-sm placeholder:text-gray-500 focus:border-blue-500"
          />
        </div>

        {/* Category Filter */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">Category</span>
          <select
            value={selectedMasterCategory}
            onChange={(e) => {
              setSelectedMasterCategory(e.target.value);
              setExpandedCategories({});
            }}
            className="bg-gray-800 border border-gray-700 rounded text-white text-sm px-2 py-1 flex-1"
          >
            {Object.keys(MASTER_CATEGORIES).map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Category List */}
      <Droppable droppableId="sidebar" isDropDisabled={true}>
        {(provided) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className="flex-1 overflow-y-auto p-3 space-y-2"
          >
            {categoriesInMaster.map((category) => {
              const isExpanded = expandedCategories[category];
              const categoryCount = categoryProducts[category]?.length || 0;
              const colorClass = CATEGORY_COLORS[category] || 'bg-gray-500';

              return (
                <div key={category}>
                  <button
                    onClick={() => toggleCategory(category)}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded hover:bg-gray-800 transition-colors"
                  >
                    {isExpanded ? (
                      <ChevronDown className="w-4 h-4 text-gray-500 flex-shrink-0" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-gray-500 flex-shrink-0" />
                    )}
                    <div className={`${colorClass} rounded px-2 py-0.5 text-xs font-medium text-white flex-1`}>
                      {category.replace(/_/g, ' ')}
                    </div>
                    <span className="text-xs text-gray-500">{categoryCount}</span>
                  </button>

                  {isExpanded && (
                    <div className="pl-6 space-y-1">
                      {categoryProducts[category]?.map((product, idx) => (
                        <Draggable
                          key={product.id}
                          draggableId={product.id}
                          index={filteredProducts.findIndex(p => p.id === product.id)}
                        >
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              onClick={() => onProductSelect(product)}
                              className={`p-2 rounded cursor-move border transition-all ${
                                snapshot.isDragging
                                  ? 'bg-blue-500/20 border-blue-500/40'
                                  : 'bg-gray-800 border-gray-700 hover:bg-gray-750'
                              }`}
                            >
                              <div className="flex items-start gap-2">
                                <Grip className="w-3 h-3 text-gray-600 mt-0.5 flex-shrink-0" />
                                <div className="min-w-0 flex-1">
                                  <p className="text-xs font-medium text-white truncate">{product.brand}</p>
                                  <p className="text-xs text-gray-400 truncate">{product.model}</p>
                                </div>
                              </div>
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {categoryCount === 0 && (
                        <p className="text-xs text-gray-500 px-2 py-1">No products</p>
                      )}
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