import React, { useState } from 'react';
import { Input } from "@/components/ui/input";
import { Search, ChevronRight, Filter } from "lucide-react";
import { Draggable, Droppable } from '@hello-pangea/dnd';

const CATEGORY_COLORS = {
  av_receivers: "bg-emerald-500",
  projectors: "bg-purple-500",
  hdmi_extenders: "bg-blue-600",
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

const CATEGORY_LABELS = {
  av_receivers: "AV Receivers",
  projectors: "Projectors",
  hdmi_extenders: "HDMI Extenders",
  matrix_switchers: "Matrix Switchers",
  media_streamers: "Media Streamers",
  video_distribution: "Video Distribution",
  audio_streamers: "Audio Streamers",
  speakers: "Speakers",
  soundbars: "Soundbars",
  subwoofers: "Subwoofers",
  stereo_amps: "Stereo Amps",
  multizone_amps: "Multizone Amps",
  surround_processors: "Surround Processors",
  televisions: "Televisions",
  projector_screens: "Projector Screens",
  network_switches: "Network Switches",
  routers: "Routers",
  access_points: "Access Points",
  patch_panels: "Patch Panels",
  data_jacks: "Data Jacks",
  control_processors: "Control Processors",
  touch_panels: "Touch Panels",
  telephones: "Telephones",
  phone_jacks: "Phone Jacks",
  intercoms: "Intercoms",
  nvrs: "NVRs",
  ip_cameras: "IP Cameras"
};

const GROUPED_CATEGORIES = {
  'AV': ['av_receivers', 'projectors', 'hdmi_extenders', 'matrix_switchers', 'media_streamers', 'video_distribution'],
  'Audio': ['audio_streamers', 'speakers', 'soundbars', 'subwoofers', 'stereo_amps', 'multizone_amps', 'surround_processors'],
  'Communication': ['telephones', 'phone_jacks', 'intercoms'],
  'Control': ['control_processors', 'touch_panels'],
  'Displays': ['televisions', 'projector_screens'],
  'Network': ['network_switches', 'routers', 'access_points', 'patch_panels', 'data_jacks'],
  'Surveillance': ['nvrs', 'ip_cameras']
};

export default function ProductSidebar({ products, onProductSelect }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedCategories, setExpandedCategories] = useState({});

  const filteredProducts = products.filter(p =>
    p.brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.model.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const toggleCategory = (category) => {
    setExpandedCategories(prev => ({
      ...prev,
      [category]: !prev[category]
    }));
  };

  const getAllCategories = () => {
    const allCats = [];
    Object.values(GROUPED_CATEGORIES).forEach(cats => {
      allCats.push(...cats);
    });
    return allCats;
  };

  return (
    <div className="w-40 bg-gray-950 border-r border-gray-800 flex flex-col h-full">
      {/* Header */}
      <div className="px-3 pt-3 pb-2 border-b border-gray-800">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-semibold text-white">Product Library</h2>
          <Filter className="w-3 h-3 text-gray-500" />
        </div>

        {/* Search */}
        <div className="relative mb-2">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-500" />
          <Input
            placeholder="Search..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-7 bg-gray-900 border-gray-700 text-white text-xs placeholder:text-gray-600 h-7 focus:border-blue-500"
          />
        </div>

        {/* Category Dropdown */}
        <div className="flex items-center gap-1">
          <span className="text-xs text-gray-500">AV</span>
          <ChevronRight className="w-3 h-3 text-gray-600" />
        </div>
      </div>

      {/* Category List */}
      <Droppable droppableId="sidebar" isDropDisabled={true}>
        {(provided) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className="flex-1 overflow-y-auto p-2 space-y-0.5"
          >
            {Object.entries(GROUPED_CATEGORIES).map(([groupName, categoryList]) => (
              <div key={groupName}>
                {categoryList.map((category) => {
                  const isExpanded = expandedCategories[category];
                  const categoryCount = filteredProducts.filter(p => p.category === category).length;
                  const colorClass = CATEGORY_COLORS[category] || 'bg-gray-500';
                  const categoryLabel = CATEGORY_LABELS[category] || category;

                  return (
                    <div key={category}>
                      {/* Category Button */}
                      <button
                        onClick={() => toggleCategory(category)}
                        className="w-full flex items-center gap-1.5 px-2 py-1 rounded transition-all hover:bg-gray-800/50"
                      >
                        <div className={`${colorClass} rounded px-2 py-0.5 text-xs font-semibold text-white flex-1 text-left truncate`}>
                          {categoryLabel}
                        </div>
                        <ChevronRight className="w-3 h-3 text-gray-600 flex-shrink-0" />
                      </button>

                      {/* Product List */}
                      {isExpanded && (
                        <div className="pl-3 space-y-0.5 mt-0.5 mb-1">
                          {filteredProducts.filter(p => p.category === category).map((product) => (
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
                                  className={`px-2 py-1 rounded text-xs cursor-move transition-all border ${
                                    snapshot.isDragging
                                      ? 'bg-blue-500/20 border-blue-500/50'
                                      : 'bg-gray-800/40 border-gray-700/40 hover:bg-gray-800'
                                  }`}
                                >
                                  <p className="font-medium text-white truncate text-[10px]">{product.brand}</p>
                                  <p className="text-gray-500 truncate text-[10px]">{product.model}</p>
                                </div>
                              )}
                            </Draggable>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </div>
  );
}