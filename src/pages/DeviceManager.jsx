import React, { useState } from 'react';
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Plus, Edit, Trash2, Save, X, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "../utils";
import DeviceForm from "../components/devicemanager/DeviceForm";

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

export default function DeviceManager() {
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingDevice, setEditingDevice] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('all');
  
  const queryClient = useQueryClient();

  const { data: products = [], isLoading } = useQuery({
    queryKey: ['avProducts'],
    queryFn: () => base44.entities.AVProduct.list(),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.AVProduct.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['avProducts'] });
    },
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.AVProduct.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['avProducts'] });
      setShowForm(false);
      setEditingDevice(null);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.AVProduct.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['avProducts'] });
      setShowForm(false);
      setEditingDevice(null);
    },
  });

  const handleDelete = (id, brand, model) => {
    if (confirm(`Are you sure you want to delete ${brand} ${model}?`)) {
      deleteMutation.mutate(id);
    }
  };

  const handleEdit = (device) => {
    setEditingDevice(device);
    setShowForm(true);
  };

  const handleSubmit = (data) => {
    if (editingDevice) {
      updateMutation.mutate({ id: editingDevice.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const categories = [...new Set(products.map(p => p.category))].sort();

  const filteredProducts = products.filter(product => {
    const matchesSearch = !searchTerm || 
      product.brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.model.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = selectedCategory === 'all' || product.category === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950">
      <div className="max-w-7xl mx-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <Link to={createPageUrl("AVCanvas")}>
              <Button
                variant="ghost"
                className="text-gray-400 hover:text-white mb-3 -ml-2"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Canvas
              </Button>
            </Link>
            <h1 className="text-3xl font-bold text-white mb-2">Device Manager</h1>
            <p className="text-sm text-gray-400">Manage your AV product library</p>
          </div>
          <Button
            onClick={() => {
              setEditingDevice(null);
              setShowForm(true);
            }}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add New Device
          </Button>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-6">
          <div className="flex gap-4 items-center">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <Input
                placeholder="Search by brand or model..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-gray-800 border-gray-700 text-white placeholder:text-gray-500"
              />
            </div>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm"
            >
              <option value="all">All Categories</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat.replace(/_/g, ' ')}</option>
              ))}
            </select>
          </div>
          <div className="mt-3 text-xs text-gray-400">
            Showing {filteredProducts.length} of {products.length} devices
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-12 text-gray-400">Loading devices...</div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-12 bg-gray-900 border border-gray-800 rounded-xl">
            <p className="text-gray-400 mb-4">No devices found</p>
            <Button onClick={() => setShowForm(true)} variant="outline" className="border-gray-700">
              <Plus className="w-4 h-4 mr-2" />
              Add Your First Device
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredProducts.map((product) => (
              <div
                key={product.id}
                className="bg-gray-900 border border-gray-800 rounded-xl p-4 hover:border-gray-700 transition-all"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className={`w-8 h-8 rounded-lg ${categorySolidColors[product.category]} flex items-center justify-center`}>
                      <span className="text-white text-xs font-bold">
                        {product.category.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <Badge className="capitalize text-xs">
                      {product.category.replace(/_/g, ' ')}
                    </Badge>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleEdit(product)}
                      className="h-7 w-7 text-gray-400 hover:text-blue-400"
                    >
                      <Edit className="w-3 h-3" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleDelete(product.id, product.brand, product.model)}
                      className="h-7 w-7 text-gray-400 hover:text-red-400"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>

                <h3 className="font-semibold text-white text-lg mb-1">{product.brand}</h3>
                <p className="text-sm text-gray-400 mb-3">{product.model}</p>

                {product.price && (
                  <p className="text-sm font-medium text-blue-400 mb-3">
                    ${product.price.toLocaleString()}
                  </p>
                )}

                {product.description && (
                  <p className="text-xs text-gray-500 line-clamp-2 mb-3">
                    {product.description}
                  </p>
                )}

                <div className="border-t border-gray-800 pt-3 space-y-2">
                  {(product.input_connections || product.output_connections) && (
                    <>
                      {product.input_connections && product.input_connections.length > 0 && (
                        <div>
                          <p className="text-xs text-gray-500 mb-1">Inputs:</p>
                          <div className="flex flex-wrap gap-1">
                            {product.input_connections.map((input, idx) => (
                              <Badge key={idx} variant="outline" className="text-xs border-gray-700">
                                {input.type} ({input.ports.length})
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                      {product.output_connections && product.output_connections.length > 0 && (
                        <div>
                          <p className="text-xs text-gray-500 mb-1">Outputs:</p>
                          <div className="flex flex-wrap gap-1">
                            {product.output_connections.map((output, idx) => (
                              <Badge key={idx} variant="outline" className="text-xs border-gray-700">
                                {output.type} ({output.ports.length})
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showForm && (
        <DeviceForm
          device={editingDevice}
          onSubmit={handleSubmit}
          onCancel={() => {
            setShowForm(false);
            setEditingDevice(null);
          }}
          isLoading={createMutation.isPending || updateMutation.isPending}
        />
      )}
    </div>
  );
}