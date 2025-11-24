import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { X, Plus, Trash2 } from "lucide-react";

const categories = [
  "televisions",
  "projectors",
  "projector_screens",
  "video_distribution",
  "matrix_switchers",
  "audio_streamers",
  "media_streamers",
  "speakers",
  "soundbars",
  "subwoofers",
  "stereo_amps",
  "multizone_amps",
  "surround_processors",
  "av_receivers"
];

const commonConnectionTypes = [
  "HDMI", "Optical", "RCA", "XLR", "Speaker Wire", "Ethernet", 
  "USB", "Coaxial", "3.5mm Jack", "Component", "Composite", 
  "VGA", "RS232", "HDBaseT", "Control", "Subwoofer", "IR", "Power"
];

export default function DeviceForm({ device, onSubmit, onCancel, isLoading }) {
  const [formData, setFormData] = useState(() => {
    const defaults = {
      brand: '',
      model: '',
      category: 'televisions',
      description: '',
      price: '',
      image_url: '',
      input_connections: [],
      output_connections: [],
      control: {
        ip: false,
        rs232: false,
        ir: false,
        trigger: false,
        protocols: []
      },
      specs: {}
    };
    
    if (!device) return defaults;
    
    return {
      ...defaults,
      ...device,
      control: {
        ...defaults.control,
        ...(device.control || {})
      },
      input_connections: device.input_connections || [],
      output_connections: device.output_connections || [],
      specs: device.specs || {}
    };
  });

  const [newInputType, setNewInputType] = useState('');
  const [newInputPorts, setNewInputPorts] = useState('');
  const [newOutputType, setNewOutputType] = useState('');
  const [newOutputPorts, setNewOutputPorts] = useState('');
  const [newProtocol, setNewProtocol] = useState('');
  const [newSpecKey, setNewSpecKey] = useState('');
  const [newSpecValue, setNewSpecValue] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Clean up data
    const submitData = {
      ...formData,
      price: formData.price ? parseFloat(formData.price) : null,
      specs: Object.keys(formData.specs).length > 0 ? formData.specs : null
    };
    
    onSubmit(submitData);
  };

  const addConnection = (type) => {
    const connectionType = type === 'input' ? newInputType : newOutputType;
    const portsString = type === 'input' ? newInputPorts : newOutputPorts;
    
    if (!connectionType || !portsString) return;
    
    const ports = portsString.split(',').map(p => p.trim()).filter(p => p);
    
    const newConnection = {
      type: connectionType,
      ports: ports
    };
    
    setFormData(prev => ({
      ...prev,
      [type === 'input' ? 'input_connections' : 'output_connections']: [
        ...(prev[type === 'input' ? 'input_connections' : 'output_connections'] || []),
        newConnection
      ]
    }));
    
    if (type === 'input') {
      setNewInputType('');
      setNewInputPorts('');
    } else {
      setNewOutputType('');
      setNewOutputPorts('');
    }
  };

  const removeConnection = (type, index) => {
    setFormData(prev => ({
      ...prev,
      [type]: prev[type].filter((_, i) => i !== index)
    }));
  };

  const addProtocol = () => {
    if (!newProtocol) return;
    
    setFormData(prev => ({
      ...prev,
      control: {
        ...prev.control,
        protocols: [...(prev.control.protocols || []), newProtocol]
      }
    }));
    
    setNewProtocol('');
  };

  const removeProtocol = (index) => {
    setFormData(prev => ({
      ...prev,
      control: {
        ...prev.control,
        protocols: prev.control.protocols.filter((_, i) => i !== index)
      }
    }));
  };

  const addSpec = () => {
    if (!newSpecKey || !newSpecValue) return;
    
    setFormData(prev => ({
      ...prev,
      specs: {
        ...prev.specs,
        [newSpecKey]: newSpecValue
      }
    }));
    
    setNewSpecKey('');
    setNewSpecValue('');
  };

  const removeSpec = (key) => {
    setFormData(prev => {
      const newSpecs = { ...prev.specs };
      delete newSpecs[key];
      return {
        ...prev,
        specs: newSpecs
      };
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-gray-900 border border-gray-800 rounded-xl w-full max-w-4xl my-8">
        <div className="p-6 border-b border-gray-800 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-white">
            {device ? 'Edit Device' : 'Add New Device'}
          </h2>
          <Button
            size="icon"
            variant="ghost"
            onClick={onCancel}
            className="text-gray-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[calc(100vh-200px)] overflow-y-auto">
          {/* Basic Information */}
          <div>
            <h3 className="text-lg font-medium text-white mb-4">Basic Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-gray-400 mb-2 block">Brand *</label>
                <Input
                  required
                  value={formData.brand}
                  onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                  className="bg-gray-800 border-gray-700 text-white"
                  placeholder="e.g., Samsung"
                />
              </div>
              <div>
                <label className="text-sm text-gray-400 mb-2 block">Model *</label>
                <Input
                  required
                  value={formData.model}
                  onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                  className="bg-gray-800 border-gray-700 text-white"
                  placeholder="e.g., QN85Q80CAFXZA"
                />
              </div>
              <div>
                <label className="text-sm text-gray-400 mb-2 block">Category *</label>
                <select
                  required
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
                >
                  {categories.map(cat => (
                    <option key={cat} value={cat}>{cat.replace(/_/g, ' ')}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm text-gray-400 mb-2 block">Price ($)</label>
                <Input
                  type="number"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  className="bg-gray-800 border-gray-700 text-white"
                  placeholder="0.00"
                />
              </div>
            </div>
            <div className="mt-4">
              <label className="text-sm text-gray-400 mb-2 block">Description</label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="bg-gray-800 border-gray-700 text-white"
                rows={3}
                placeholder="Product description..."
              />
            </div>
            <div className="mt-4">
              <label className="text-sm text-gray-400 mb-2 block">Image URL</label>
              <Input
                value={formData.image_url}
                onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                className="bg-gray-800 border-gray-700 text-white"
                placeholder="https://..."
              />
            </div>
          </div>

          {/* Input Connections */}
          <div>
            <h3 className="text-lg font-medium text-white mb-4">Input Connections</h3>
            <div className="space-y-2 mb-3">
              {(formData.input_connections || []).map((input, idx) => (
                <div key={idx} className="bg-gray-800 p-3 rounded-lg flex items-center justify-between">
                  <div>
                    <Badge className="mb-1">{input.type}</Badge>
                    <p className="text-xs text-gray-400">Ports: {input.ports.join(', ')}</p>
                  </div>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    onClick={() => removeConnection('input_connections', idx)}
                    className="text-red-400 hover:text-red-300"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <select
                value={newInputType}
                onChange={(e) => setNewInputType(e.target.value)}
                className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm"
              >
                <option value="">Select Type</option>
                {commonConnectionTypes.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
              <Input
                value={newInputPorts}
                onChange={(e) => setNewInputPorts(e.target.value)}
                placeholder="Port names (comma-separated)"
                className="bg-gray-800 border-gray-700 text-white text-sm"
              />
              <Button
                type="button"
                onClick={() => addConnection('input')}
                variant="outline"
                className="border-gray-700"
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Output Connections */}
          <div>
            <h3 className="text-lg font-medium text-white mb-4">Output Connections</h3>
            <div className="space-y-2 mb-3">
              {(formData.connections.outputs || []).map((output, idx) => (
                <div key={idx} className="bg-gray-800 p-3 rounded-lg flex items-center justify-between">
                  <div>
                    <Badge className="mb-1">{output.type}</Badge>
                    <p className="text-xs text-gray-400">Ports: {output.ports.join(', ')}</p>
                  </div>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    onClick={() => removeConnection('outputs', idx)}
                    className="text-red-400 hover:text-red-300"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <select
                value={newOutputType}
                onChange={(e) => setNewOutputType(e.target.value)}
                className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm"
              >
                <option value="">Select Type</option>
                {commonConnectionTypes.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
              <Input
                value={newOutputPorts}
                onChange={(e) => setNewOutputPorts(e.target.value)}
                placeholder="Port names (comma-separated)"
                className="bg-gray-800 border-gray-700 text-white text-sm"
              />
              <Button
                type="button"
                onClick={() => addConnection('output')}
                variant="outline"
                className="border-gray-700"
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Control Capabilities */}
          <div>
            <h3 className="text-lg font-medium text-white mb-4">Control Capabilities</h3>
            <div className="grid grid-cols-2 gap-4 mb-3">
              <label className="flex items-center gap-2 text-sm text-gray-300">
                <input
                  type="checkbox"
                  checked={formData.control?.ip || false}
                  onChange={(e) => setFormData({
                    ...formData,
                    control: { ...(formData.control || {}), ip: e.target.checked }
                  })}
                  className="rounded"
                />
                IP Control
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-300">
                <input
                  type="checkbox"
                  checked={formData.control?.rs232 || false}
                  onChange={(e) => setFormData({
                    ...formData,
                    control: { ...(formData.control || {}), rs232: e.target.checked }
                  })}
                  className="rounded"
                />
                RS232
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-300">
                <input
                  type="checkbox"
                  checked={formData.control?.ir || false}
                  onChange={(e) => setFormData({
                    ...formData,
                    control: { ...(formData.control || {}), ir: e.target.checked }
                  })}
                  className="rounded"
                />
                IR Control
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-300">
                <input
                  type="checkbox"
                  checked={formData.control?.trigger || false}
                  onChange={(e) => setFormData({
                    ...formData,
                    control: { ...(formData.control || {}), trigger: e.target.checked }
                  })}
                  className="rounded"
                />
                12V Trigger
              </label>
            </div>
            <div>
              <label className="text-sm text-gray-400 mb-2 block">Control Protocols</label>
              <div className="flex flex-wrap gap-2 mb-2">
                {(formData.control.protocols || []).map((protocol, idx) => (
                  <Badge key={idx} className="bg-gray-700">
                    {protocol}
                    <button
                      type="button"
                      onClick={() => removeProtocol(idx)}
                      className="ml-2 text-red-400"
                    >
                      ×
                    </button>
                  </Badge>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  value={newProtocol}
                  onChange={(e) => setNewProtocol(e.target.value)}
                  placeholder="Protocol name"
                  className="bg-gray-800 border-gray-700 text-white text-sm"
                />
                <Button
                  type="button"
                  onClick={addProtocol}
                  variant="outline"
                  className="border-gray-700"
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Technical Specifications */}
          <div>
            <h3 className="text-lg font-medium text-white mb-4">Technical Specifications</h3>
            <div className="space-y-2 mb-3">
              {Object.entries(formData.specs || {}).map(([key, value]) => (
                <div key={key} className="bg-gray-800 p-3 rounded-lg flex items-center justify-between">
                  <div>
                    <p className="text-sm text-white font-medium">{key}</p>
                    <p className="text-xs text-gray-400">{value}</p>
                  </div>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    onClick={() => removeSpec(key)}
                    className="text-red-400 hover:text-red-300"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                value={newSpecKey}
                onChange={(e) => setNewSpecKey(e.target.value)}
                placeholder="Spec name"
                className="bg-gray-800 border-gray-700 text-white text-sm"
              />
              <Input
                value={newSpecValue}
                onChange={(e) => setNewSpecValue(e.target.value)}
                placeholder="Spec value"
                className="bg-gray-800 border-gray-700 text-white text-sm"
              />
              <Button
                type="button"
                onClick={addSpec}
                variant="outline"
                className="border-gray-700"
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </form>

        <div className="p-6 border-t border-gray-800 flex justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            className="border-gray-700 text-gray-300"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isLoading}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isLoading ? 'Saving...' : device ? 'Update Device' : 'Create Device'}
          </Button>
        </div>
      </div>
    </div>
  );
}