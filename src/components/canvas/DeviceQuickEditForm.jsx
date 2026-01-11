import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { X, Save, Loader2, Plus, Trash2, Upload, Image, ChevronUp, ChevronDown } from "lucide-react";
import { base44 } from "@/api/base44Client";

const commonConnectionTypes = [
  "HDMI", "Optical", "Fiber", "RCA", "XLR", "Speaker Wire", "Ethernet", "SFP",
  "USB", "Coaxial", "3.5mm Jack", "Component", "Composite", 
  "VGA", "RS232", "HDBaseT", "Control", "Subwoofer", "IR", "Power"
];

export default function DeviceQuickEditForm({ product, onSave, onClose }) {
  const [formData, setFormData] = useState({
    brand: product.brand || '',
    model: product.model || '',
    description: product.description || '',
    price: product.price || '',
    installation_labor: product.installation_labor || '',
    configuration_labor: product.configuration_labor || '',
    image_url: product.image_url || '',
    input_connections: product.input_connections || [],
    output_connections: product.output_connections || []
  });
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('basic');
  const [uploadingImage, setUploadingImage] = useState(false);

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setUploadingImage(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setFormData({ ...formData, image_url: file_url });
    } catch (error) {
      console.error('Failed to upload image:', error);
      alert('Failed to upload image');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleAddConnection = (direction) => {
    const key = direction === 'input' ? 'input_connections' : 'output_connections';
    const newIndex = formData[key].length;
    setPortInputValues(prev => ({ ...prev, [`${direction}_${newIndex}`]: 'Port-1' }));
    setFormData({
      ...formData,
      [key]: [...formData[key], { type: 'HDMI', ports: ['Port-1'] }]
    });
  };

  const handleRemoveConnection = (direction, index) => {
    const key = direction === 'input' ? 'input_connections' : 'output_connections';
    setFormData({
      ...formData,
      [key]: formData[key].filter((_, i) => i !== index)
    });
  };

  const handleConnectionTypeChange = (direction, index, type) => {
    const key = direction === 'input' ? 'input_connections' : 'output_connections';
    const updated = [...formData[key]];
    updated[index] = { ...updated[index], type };
    setFormData({ ...formData, [key]: updated });
  };

  const [portInputValues, setPortInputValues] = useState(() => {
    const initial = {};
    (product.input_connections || []).forEach((conn, idx) => {
      const portLabels = (conn.ports || []).map(p => typeof p === 'string' ? p : p.label).join(', ');
      initial[`input_${idx}`] = portLabels || '';
    });
    (product.output_connections || []).forEach((conn, idx) => {
      const portLabels = (conn.ports || []).map(p => typeof p === 'string' ? p : p.label).join(', ');
      initial[`output_${idx}`] = portLabels || '';
    });
    return initial;
  });

  const [portQuantities, setPortQuantities] = useState({});

  const handleGeneratePorts = (direction, index, quantity) => {
    const ports = [];
    for (let i = 1; i <= quantity; i++) {
      ports.push(`Port-${String(i).padStart(2, '0')}`);
    }
    handlePortsChange(direction, index, ports.join(', '));
    setPortQuantities(prev => ({ ...prev, [`${direction}_${index}`]: quantity }));
  };

  const handlePortsChange = (direction, index, portsString) => {
    const inputKey = `${direction}_${index}`;
    setPortInputValues(prev => ({ ...prev, [inputKey]: portsString }));
    
    const key = direction === 'input' ? 'input_connections' : 'output_connections';
    const updated = [...formData[key]];
    const portLabels = portsString.split(',').map(p => p.trim()).filter(p => p);
    
    // Convert port labels to objects with IDs
    const ports = portLabels.map((label, i) => ({
      id: `${updated[index].type.toLowerCase().replace(/\s+/g, '-')}-${i + 1}`,
      label,
      type: updated[index].type,
      auto_generated: false
    }));
    
    updated[index] = { ...updated[index], ports: ports.length > 0 ? ports : [] };
    setFormData({ ...formData, [key]: updated });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const updateData = {
        brand: formData.brand,
        model: formData.model,
        description: formData.description,
        price: formData.price ? parseFloat(formData.price) : null,
        installation_labor: formData.installation_labor ? parseFloat(formData.installation_labor) : null,
        configuration_labor: formData.configuration_labor ? parseFloat(formData.configuration_labor) : null,
        image_url: formData.image_url || null,
        input_connections: formData.input_connections,
        output_connections: formData.output_connections
      };
      
      await base44.entities.AVProduct.update(product.id, updateData);
      onSave({ ...product, ...updateData });
    } catch (error) {
      console.error('Failed to update device:', error);
      alert('Failed to update device');
    } finally {
      setSaving(false);
    }
  };

  const renderConnectionEditor = (direction) => {
    const key = direction === 'input' ? 'input_connections' : 'output_connections';
    const connections = formData[key];

    return (
      <div className="space-y-3">
        {connections.map((conn, idx) => (
          <div key={idx} className="bg-gray-800 rounded-lg p-3 border border-gray-700">
            <div className="flex items-center justify-between mb-3">
              <select
                value={conn.type}
                onChange={(e) => handleConnectionTypeChange(direction, idx, e.target.value)}
                className="bg-gray-900 border border-gray-700 text-white text-sm rounded px-2 py-1"
              >
                {commonConnectionTypes.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => handleRemoveConnection(direction, idx)}
                className="h-6 w-6 text-gray-500 hover:text-red-400"
              >
                <Trash2 className="w-3 h-3" />
              </Button>
            </div>

            <div className="space-y-2 mb-2">
              <label className="text-xs text-gray-500">Quick Add</label>
              <div className="flex gap-2">
                <div className="flex items-center border border-gray-700 rounded bg-gray-900">
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => {
                      const qty = (portQuantities[`${direction}_${idx}`] || 1) - 1;
                      if (qty > 0) setPortQuantities(prev => ({ ...prev, [`${direction}_${idx}`]: qty }));
                    }}
                    className="h-8 w-8 text-gray-400 hover:text-white"
                  >
                    <ChevronDown className="w-3 h-3" />
                  </Button>
                  <input
                    type="number"
                    min="1"
                    value={portQuantities[`${direction}_${idx}`] || 1}
                    onChange={(e) => setPortQuantities(prev => ({ ...prev, [`${direction}_${idx}`]: Math.max(1, parseInt(e.target.value) || 1) }))}
                    onKeyDown={(e) => e.stopPropagation()}
                    className="w-12 bg-gray-900 text-white text-center text-sm border-0 focus:outline-none"
                  />
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => {
                      const qty = (portQuantities[`${direction}_${idx}`] || 1) + 1;
                      setPortQuantities(prev => ({ ...prev, [`${direction}_${idx}`]: qty }));
                    }}
                    className="h-8 w-8 text-gray-400 hover:text-white"
                  >
                    <ChevronUp className="w-3 h-3" />
                  </Button>
                </div>
                <Button
                  size="sm"
                  onClick={() => handleGeneratePorts(direction, idx, portQuantities[`${direction}_${idx}`] || 1)}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-xs"
                >
                  Generate
                </Button>
              </div>
            </div>

            <div>
              <label className="text-xs text-gray-500 mb-1 block">Ports (comma-separated)</label>
              <input
                type="text"
                value={portInputValues[`${direction}_${idx}`] ?? conn.ports?.join(', ') ?? ''}
                onChange={(e) => handlePortsChange(direction, idx, e.target.value)}
                onKeyDown={(e) => e.stopPropagation()}
                placeholder="Port-1, Port-2"
                className="w-full bg-gray-900 border border-gray-700 text-white text-sm rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        ))}
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleAddConnection(direction)}
          className="w-full border-gray-700 text-gray-400 hover:text-white"
        >
          <Plus className="w-3 h-3 mr-1" />
          Add {direction === 'input' ? 'Input' : 'Output'}
        </Button>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div 
        className="bg-gray-900 border border-gray-800 rounded-xl w-full max-w-lg max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-gray-800">
          <h3 className="text-lg font-semibold text-white">Quick Edit Device</h3>
          <Button
            size="icon"
            variant="ghost"
            onClick={onClose}
            className="text-gray-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        <div className="flex border-b border-gray-800">
          <button
            onClick={() => setActiveTab('basic')}
            className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === 'basic' 
                ? 'text-blue-400 border-b-2 border-blue-400' 
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Basic Info
          </button>
          <button
            onClick={() => setActiveTab('inputs')}
            className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === 'inputs' 
                ? 'text-blue-400 border-b-2 border-blue-400' 
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Inputs
          </button>
          <button
            onClick={() => setActiveTab('outputs')}
            className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === 'outputs' 
                ? 'text-blue-400 border-b-2 border-blue-400' 
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Outputs
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {activeTab === 'basic' && (
            <div className="space-y-4">
              <div>
                <label className="text-sm text-gray-400 mb-1 block">Brand</label>
                <Input
                  value={formData.brand}
                  onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                  className="bg-gray-800 border-gray-700 text-white"
                />
              </div>
              <div>
                <label className="text-sm text-gray-400 mb-1 block">Model</label>
                <Input
                  value={formData.model}
                  onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                  className="bg-gray-800 border-gray-700 text-white"
                />
              </div>
              <div>
                <label className="text-sm text-gray-400 mb-1 block">Description</label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="bg-gray-800 border-gray-700 text-white"
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-sm text-gray-400 mb-1 block">Equipment Price</label>
                  <Input
                    type="number"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    className="bg-gray-800 border-gray-700 text-white"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-400 mb-1 block">Install Labor</label>
                  <Input
                    type="number"
                    value={formData.installation_labor}
                    onChange={(e) => setFormData({ ...formData, installation_labor: e.target.value })}
                    className="bg-gray-800 border-gray-700 text-white"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-400 mb-1 block">Config Labor</label>
                  <Input
                    type="number"
                    value={formData.configuration_labor}
                    onChange={(e) => setFormData({ ...formData, configuration_labor: e.target.value })}
                    className="bg-gray-800 border-gray-700 text-white"
                    placeholder="0.00"
                  />
                </div>
              </div>
              <div>
                <label className="text-sm text-gray-400 mb-1 block">Product Image</label>
                <div className="space-y-2">
                  {formData.image_url && (
                    <div className="relative w-full h-32 bg-gray-800 rounded-lg overflow-hidden">
                      <img 
                        src={formData.image_url} 
                        alt="Product" 
                        className="w-full h-full object-contain"
                      />
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => setFormData({ ...formData, image_url: '' })}
                        className="absolute top-1 right-1 h-6 w-6 bg-gray-900/80 hover:bg-red-500/80 text-white"
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  )}
                  <div className="flex gap-2">
                    <Input
                      value={formData.image_url}
                      onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                      onKeyDown={(e) => e.stopPropagation()}
                      className="bg-gray-800 border-gray-700 text-white flex-1"
                      placeholder="Image URL or upload..."
                    />
                    <label className="cursor-pointer">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="hidden"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        disabled={uploadingImage}
                        className="border-gray-700 text-gray-400 hover:text-white"
                        asChild
                      >
                        <span>
                          {uploadingImage ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Upload className="w-4 h-4" />
                          )}
                        </span>
                      </Button>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'inputs' && (
            <div>
              <p className="text-xs text-gray-500 mb-3">Define input connection types and their ports</p>
              {renderConnectionEditor('input')}
            </div>
          )}

          {activeTab === 'outputs' && (
            <div>
              <p className="text-xs text-gray-500 mb-3">Define output connection types and their ports</p>
              {renderConnectionEditor('output')}
            </div>
          )}
        </div>

        <div className="flex gap-2 p-4 border-t border-gray-800">
          <Button
            variant="outline"
            onClick={onClose}
            className="flex-1 border-gray-700 text-gray-300"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 bg-blue-600 hover:bg-blue-700"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}