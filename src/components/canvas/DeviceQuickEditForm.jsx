import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { X, Save, Loader2, Plus, Trash2 } from "lucide-react";
import { base44 } from "@/api/base44Client";

const commonConnectionTypes = [
  "HDMI", "Optical", "RCA", "XLR", "Speaker Wire", "Ethernet", 
  "USB", "Coaxial", "3.5mm Jack", "Component", "Composite", 
  "VGA", "RS232", "HDBaseT", "Control", "Subwoofer", "IR", "Power"
];

export default function DeviceQuickEditForm({ product, onSave, onClose }) {
  const [formData, setFormData] = useState({
    brand: product.brand || '',
    model: product.model || '',
    description: product.description || '',
    price: product.price || '',
    input_connections: product.input_connections || [],
    output_connections: product.output_connections || []
  });
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('basic');

  const handleAddConnection = (direction) => {
    const key = direction === 'input' ? 'input_connections' : 'output_connections';
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

  const handlePortsChange = (direction, index, portsString) => {
    const key = direction === 'input' ? 'input_connections' : 'output_connections';
    const updated = [...formData[key]];
    updated[index] = { ...updated[index], ports: portsString.split(',').map(p => p.trim()).filter(p => p) };
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
            <div className="flex items-center justify-between mb-2">
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
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Ports (comma-separated)</label>
              <Input
                value={conn.ports?.join(', ') || ''}
                onChange={(e) => handlePortsChange(direction, idx, e.target.value)}
                placeholder="Port-1, Port-2"
                className="bg-gray-900 border-gray-700 text-white text-sm"
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
          {['basic', 'inputs', 'outputs'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === tab 
                  ? 'text-blue-400 border-b-2 border-blue-400' 
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              {tab === 'basic' ? 'Basic Info' : tab === 'inputs' ? 'Inputs' : 'Outputs'}
            </button>
          ))}
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
              <div>
                <label className="text-sm text-gray-400 mb-1 block">Price</label>
                <Input
                  type="number"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  className="bg-gray-800 border-gray-700 text-white"
                  placeholder="0.00"
                />
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