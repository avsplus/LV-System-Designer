import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { X, Save, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";

export default function DeviceQuickEditForm({ product, onSave, onClose }) {
  const [formData, setFormData] = useState({
    brand: product.brand || '',
    model: product.model || '',
    description: product.description || '',
    price: product.price || ''
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const updateData = {
        brand: formData.brand,
        model: formData.model,
        description: formData.description,
        price: formData.price ? parseFloat(formData.price) : null
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

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div 
        className="bg-gray-900 border border-gray-800 rounded-xl w-full max-w-md p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
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

        <div className="flex gap-2 mt-6">
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