import React, { useState } from 'react';
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Search, Grip, ChevronDown, ChevronRight, X, Filter, Tv, Video, RectangleHorizontal, Network, LayoutGrid, Music, Play, Speaker, Volume2, AudioLines, Gauge, Layers, Cpu, Radio, Router, Settings2, Cable, Wifi, Phone, HardDrive, Camera, Plug } from "lucide-react";
import { Draggable, Droppable } from '@hello-pangea/dnd';
import { useSettings } from "../settings/SettingsContext";
import { useOrganization } from "../auth/useOrganization";

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
  av_receivers: "bg-emerald-600",
  network_switches: "bg-slate-600",
  control_processors: "bg-violet-600",
  touch_panels: "bg-indigo-600",
  remotes: "bg-purple-600",
  hdmi_extenders: "bg-indigo-600",
  routers: "bg-slate-600",
  access_points: "bg-sky-500",
  patch_panels: "bg-slate-500",
  data_jacks: "bg-blue-500",
  telephones: "bg-cyan-600",
  phone_jacks: "bg-cyan-500",
  intercoms: "bg-teal-500",
  nvrs: "bg-gray-600",
  ip_cameras: "bg-gray-500"
};

const categoryIcons = {
  televisions: Tv,
  projectors: Video,
  projector_screens: RectangleHorizontal,
  video_distribution: Network,
  matrix_switchers: LayoutGrid,
  audio_streamers: Music,
  media_streamers: Play,
  speakers: Speaker,
  soundbars: Volume2,
  subwoofers: AudioLines,
  stereo_amps: Gauge,
  multizone_amps: Layers,
  surround_processors: Cpu,
  av_receivers: Radio,
  network_switches: Router,
  control_processors: Settings2,
  touch_panels: Tv,
  remotes: Radio,
  hdmi_extenders: Cable,
  routers: Router,
  access_points: Wifi,
  patch_panels: LayoutGrid,
  data_jacks: Plug,
  telephones: Phone,
  phone_jacks: Plug,
  intercoms: Speaker,
  nvrs: HardDrive,
  ip_cameras: Camera
};

const masterCategoryMap = {
  av_receivers: 'AV',
  projectors: 'AV',
  hdmi_extenders: 'AV',
  matrix_switchers: 'AV',
  media_streamers: 'AV',
  video_distribution: 'AV',
  network_switches: 'Network',
  routers: 'Network',
  access_points: 'Network',
  patch_panels: 'Network',
  data_jacks: 'Network',
  projector_screens: 'Displays',
  televisions: 'Displays',
  audio_streamers: 'Audio',
  soundbars: 'Audio',
  speakers: 'Audio',
  multizone_amps: 'Audio',
  stereo_amps: 'Audio',
  subwoofers: 'Audio',
  surround_processors: 'Audio',
  control_processors: 'Control',
  touch_panels: 'Control',
  remotes: 'Control',
  telephones: 'Communication',
  phone_jacks: 'Communication',
  intercoms: 'Communication',
  nvrs: 'Surveillance',
  ip_cameras: 'Surveillance'
};

// Define all master categories and their subcategories
const allMasterCategoryMappings = {
  'AV': ['av_receivers', 'projectors', 'hdmi_extenders', 'matrix_switchers', 'media_streamers', 'video_distribution'],
  'Audio': ['audio_streamers', 'soundbars', 'speakers', 'multizone_amps', 'stereo_amps', 'subwoofers', 'surround_processors'],
  'Communication': ['telephones', 'phone_jacks', 'intercoms'],
  'Control': ['control_processors', 'touch_panels', 'remotes'],
  'Displays': ['projector_screens', 'televisions'],
  'Network': ['network_switches', 'routers', 'access_points', 'patch_panels', 'data_jacks'],
  'Surveillance': ['nvrs', 'ip_cameras']
};

export default function ProductSidebar({ products, onProductSelect }) {
  const { settings } = useSettings();
  const { organization } = useOrganization();
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedCategories, setExpandedCategories] = useState({ 'master-AV': true });
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

  // Group products by category and sort alphabetically
  const productsByCategory = filteredProducts.reduce((acc, product) => {
    if (!acc[product.category]) {
      acc[product.category] = [];
    }
    acc[product.category].push(product);
    return acc;
  }, {});

  // Sort categories alphabetically
  const sortedCategories = Object.keys(productsByCategory).sort((a, b) => 
    a.replace(/_/g, ' ').localeCompare(b.replace(/_/g, ' '))
  );

  const toggleCategory = (category) => {
    setExpandedCategories(prev => ({
      ...prev,
      [category]: !prev[category]
    }));
  };

  const toggleMasterCategory = (masterCat) => {
    setExpandedCategories(prev => {
      const key = `master-${masterCat}`;
      const newState = {};
      // Close all other masters
      Object.keys(prev).forEach(k => {
        if (k.startsWith('master-')) {
          newState[k] = false;
        } else {
          newState[k] = prev[k];
        }
      });
      // Toggle the clicked master
      newState[key] = !prev[key];
      return newState;
    });
  };

  // Initialize all master categories with empty objects
  const productsByMasterCategory = {};
  Object.keys(allMasterCategoryMappings).forEach(masterCat => {
    productsByMasterCategory[masterCat] = {};
  });

  // Populate with filtered products
  filteredProducts.forEach(product => {
    const masterCat = masterCategoryMap[product.category] || 'Other';
    if (!productsByMasterCategory[masterCat]) {
      productsByMasterCategory[masterCat] = {};
    }
    if (!productsByMasterCategory[masterCat][product.category]) {
      productsByMasterCategory[masterCat][product.category] = [];
    }
    productsByMasterCategory[masterCat][product.category].push(product);
  });

  // Show all master categories, sorted alphabetically
  const masterCategories = Object.keys(allMasterCategoryMappings).sort();

  return (
    <div className="w-56 sm:w-64 md:w-72 lg:w-80 bg-gray-900 border-r border-gray-800 flex flex-col h-full flex-shrink-0 transition-all duration-200">
      {/* Logo */}
      <div className="p-4 border-b border-gray-800 flex items-center justify-center gap-4">
        {/* Official AV System Design Logo */}
        <div className="flex-shrink-0">
          <img 
            src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69220e1df953a2fd292e8b12/e2917c59e_AVSystemDesignOfficialLogo.png" 
            alt="AV System Design Logo" 
            className="h-14 w-auto object-contain"
          />
        </div>
        
        {/* Organization Logo (if available) */}
        {(settings?.logo_url || organization?.logo_url) && (
          <>
            <div className="h-10 w-px bg-gray-700"></div>
            <div className="flex-shrink-0">
              <img 
                src={settings?.logo_url || organization?.logo_url} 
                alt={settings?.name || organization?.name || 'Organization Logo'} 
                className="h-10 w-auto object-contain"
              />
            </div>
          </>
        )}
      </div>

      <div className="p-4 border-b border-gray-800">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-medium text-gray-400">Product Library</h2>
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
            {masterCategories.map((masterCat, masterIdx) => {
              const categoriesInMaster = allMasterCategoryMappings[masterCat] || [];
              const masterCatExpanded = expandedCategories[`master-${masterCat}`] === true;
              const totalProductsInMaster = categoriesInMaster.reduce((sum, cat) => 
                sum + (productsByMasterCategory[masterCat][cat]?.length || 0), 0
              );

              return (
                <div key={masterCat} className="space-y-2">
                  {/* Master Category Header */}
                  <button
                    onClick={() => toggleMasterCategory(masterCat)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg transition-all border-l-2 ${
                      masterCatExpanded
                        ? 'bg-gray-700 border-l-purple-500'
                        : 'bg-gray-700/50 border-l-transparent hover:bg-gray-700 hover:border-l-gray-500'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div className="px-2 py-1 rounded text-white text-sm font-bold">
                        {masterCat}
                      </div>
                      <span className="text-[10px] text-gray-500">({totalProductsInMaster + categoriesInMaster.length})</span>
                    </div>
                    {masterCatExpanded ? (
                      <ChevronDown className="w-4 h-4 text-gray-400" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-gray-400" />
                    )}
                  </button>

                  {masterCatExpanded && (
                    <div className="space-y-2 pl-2">
                      {categoriesInMaster.map((category) => {
                        const categoryProducts = productsByMasterCategory[masterCat][category] || [];
                        const isExpanded = expandedCategories[category] === true;

                        return (
                          <div key={category} className="space-y-2" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={() => toggleCategory(category)}
                              className={`w-full flex items-center justify-between px-2 py-1.5 rounded transition-all border-l-2 text-xs ${
                                isExpanded
                                  ? 'bg-gray-800 border-l-blue-500'
                                  : 'bg-gray-800/50 border-l-transparent hover:bg-gray-800 hover:border-l-gray-600'
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                {(() => {
                                  const IconComponent = categoryIcons[category];
                                  return IconComponent ? <IconComponent className="w-3 h-3 text-gray-400 stroke-[1.5]" /> : null;
                                })()}
                                <div className={`px-1.5 py-0.5 rounded text-white font-medium capitalize transition-all ${
                                  isExpanded
                                    ? categorySolidColors[category]
                                    : `${categorySolidColors[category]} opacity-60`
                                }`}>
                                  {category.replace(/_/g, ' ')}
                                </div>
                                <span className="text-[9px] text-gray-600">({categoryProducts.length})</span>
                              </div>
                              {isExpanded ? (
                                <ChevronDown className="w-3 h-3 text-gray-400" />
                              ) : (
                                <ChevronRight className="w-3 h-3 text-gray-400" />
                              )}
                            </button>

                            {isExpanded && (
                              <div className="space-y-2 pl-1">
                                {/* Regular Products (includes demo products from database) */}
                                {categoryProducts.map((product, prodIndex) => {
                                  const isDemoProduct = product.id?.startsWith('demo-');
                                  return (
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
                                          className={`group ${
                                            isDemoProduct 
                                              ? 'bg-gradient-to-r from-purple-900/50 to-blue-900/50 hover:from-purple-800/50 hover:to-blue-800/50 border-purple-500/50'
                                              : 'bg-gray-800 hover:bg-gray-750 border-gray-700'
                                          } border rounded-lg p-3 cursor-pointer transition-all ${
                                            snapshot.isDragging ? `shadow-xl ${isDemoProduct ? 'shadow-purple-500/20 border-purple-500' : 'shadow-blue-500/20 border-blue-500'}` : ''
                                          }`}
                                        >
                                          <div className="flex items-start gap-3">
                                            <div className="mt-1">
                                              <Grip className={`w-4 h-4 ${isDemoProduct ? 'text-gray-400 group-hover:text-gray-300' : 'text-gray-600 group-hover:text-gray-400'}`} />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                              <div className="flex items-center gap-2">
                                                <h3 className="font-medium text-white text-sm truncate">
                                                  {product.brand}
                                                </h3>
                                                {isDemoProduct && (
                                                  <span className="text-[9px] px-1.5 py-0.5 bg-purple-500/30 text-purple-300 rounded uppercase font-bold">Demo</span>
                                                )}
                                              </div>
                                              <p className={`text-xs truncate ${isDemoProduct ? 'text-gray-300' : 'text-gray-400'}`}>{product.model}</p>
                                              {product.description && (
                                                <p className="text-xs text-gray-500 truncate mt-1">{product.description}</p>
                                              )}
                                              {product.price > 0 && (
                                                <p className="text-xs text-blue-400 mt-1">${product.price.toLocaleString()}</p>
                                              )}
                                            </div>
                                          </div>
                                        </div>
                                        {snapshot.isDragging && (
                                          <div className={`${
                                            isDemoProduct 
                                              ? 'bg-gradient-to-r from-purple-900/50 to-blue-900/50 border-purple-500/50'
                                              : 'bg-gray-800 border-gray-700'
                                          } border rounded-lg p-3 opacity-50`}>
                                            <div className="flex items-start gap-3">
                                              <Grip className={`w-4 h-4 mt-1 ${isDemoProduct ? 'text-gray-400' : 'text-gray-600'}`} />
                                              <div className="flex-1">
                                                <h3 className="font-medium text-white text-sm truncate">{product.brand}</h3>
                                                <p className={`text-xs truncate ${isDemoProduct ? 'text-gray-300' : 'text-gray-400'}`}>{product.model}</p>
                                              </div>
                                            </div>
                                          </div>
                                        )}
                                      </>
                                    )}
                                  </Draggable>
                                );
                              })}
                              </div>
                            )}
                          </div>
                        );
                      })}
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