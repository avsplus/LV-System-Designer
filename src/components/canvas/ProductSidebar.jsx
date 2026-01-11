import React, { useState } from 'react';
import { Input } from "@/components/ui/input";
import { Search, ChevronDown, ChevronRight, Filter } from "lucide-react";
import { Draggable, Droppable } from '@hello-pangea/dnd';

const CATEGORY_COLORS = {
  av_receivers: "bg-emerald-500",
  projectors: "bg-purple-500",
  hdmi_extenders: "bg-indigo-600",
  matrix_switchers: "bg-blue-600",
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
    <div className="w-56 bg-gray-950 border-r border-gray-800 flex flex-col h-full">
      {/* Logo Section */}
      <div className="px-4 py-4 border-b border-gray-800 bg-gradient-to-b from-gray-900 to-gray-950">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded bg-blue-600 flex items-center justify-center text-white text-xs font-bold">AV</div>
          <div>
            <div className="text-xs text-gray-400">Powered by</div>
            <div className="text-xs font-semibold text-white">DesionOfficial</div>
          </div>
        </div>
      </div>

      {/* Header */}
      <div className="px-4 pt-4 pb-3 border-b border-gray-800">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-white">Product Library</h2>
          <Filter className="w-4 h-4 text-gray-400" />
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <Input
            placeholder="Search products..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-gray-900 border-gray-700 text-white text-sm placeholder:text-gray-600 focus:border-blue-500"
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
            className="bg-gray-800 border border-gray-700 rounded text-white text-sm px-2 py-1 flex-1 cursor-pointer"
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
              const categoryLabel = category.replace(/_/g, ' ');

              return (
                <div key={category}>
                  {/* Category Button */}
                  <button
                    onClick={() => toggleCategory(category)}
                    className="w-full flex items-center gap-2 px-2 py-1.5 rounded transition-all hover:bg-gray-800/50"
                  >
                    {isExpanded ? (
                      <ChevronDown className="w-4 h-4 text-gray-500 flex-shrink-0" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-gray-500 flex-shrink-0" />
                    )}
                    <div className={`${colorClass} rounded px-3 py-1 text-xs font-semibold text-white flex-1 text-left`}>
                      {categoryLabel}
                    </div>
                    <span className="text-xs text-gray-500 font-medium">{categoryCount}</span>
                  </button>

                  {/* Product List */}
                  {isExpanded && (
                    <div className="pl-6 space-y-1 mt-1">
                      {categoryProducts[category]?.length > 0 ? (
                        categoryProducts[category].map((product, idx) => (
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
                                className={`p-2 rounded text-xs cursor-move transition-all border ${
                                  snapshot.isDragging
                                    ? 'bg-blue-500/20 border-blue-500/50 shadow-lg'
                                    : 'bg-gray-800/50 border-gray-700/50 hover:bg-gray-800'
                                }`}
                              >
                                <p className="font-medium text-white truncate">{product.brand}</p>
                                <p className="text-gray-400 truncate">{product.model}</p>
                              </div>
                            )}
                          </Draggable>
                        ))
                      ) : (
                        <p className="text-xs text-gray-600 px-2 py-1">No products found</p>
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