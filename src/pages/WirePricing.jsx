import React, { useState } from 'react';
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Plus, Trash2, Save, Loader2, Cable } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "../utils";
import { usePermissions } from "../components/auth/usePermissions";
import { ROLES } from "../components/auth/permissions";

const connectionTypes = [
  "HDMI", "HDBaseT", "Ethernet", "Optical", "RCA", "XLR", 
  "Speaker Wire", "Coaxial", "USB", "RS232", "Control", 
  "Component", "Composite", "VGA", "3.5mm Jack", "Subwoofer"
];

const defaultWireSpecs = {
  "HDMI": ["Standard", "Premium High Speed", "Ultra High Speed"],
  "HDBaseT": ["Cat5e", "Cat6", "Cat6A"],
  "Ethernet": ["Cat5e", "Cat6 UTP", "Cat6 STP", "Cat6A UTP", "Cat6A STP"],
  "Optical": ["Standard", "Premium"],
  "Speaker Wire": ["14/2", "14/4", "16/2", "16/4", "12/2", "12/4"],
  "XLR": ["Standard", "Premium"],
  "RCA": ["Standard", "Premium"],
  "Coaxial": ["RG6", "RG59"],
  "USB": ["USB 2.0", "USB 3.0"],
  "RS232": ["Standard"],
  "Control": ["Standard"],
  "Subwoofer": ["Standard"]
};

export default function WirePricingPage() {
  const { isAtLeast, loading: permLoading } = usePermissions();
  const queryClient = useQueryClient();
  const [newEntry, setNewEntry] = useState({ wire_type: '', wire_spec: '', material_price_per_foot: '', labor_price_per_run: '' });
  const [editingId, setEditingId] = useState(null);
  const [editData, setEditData] = useState({});

  const { data: wirePricing = [], isLoading } = useQuery({
    queryKey: ['wirePricing'],
    queryFn: () => base44.entities.WirePricing.list()
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.WirePricing.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['wirePricing']);
      setNewEntry({ wire_type: '', wire_spec: '', material_price_per_foot: '', labor_price_per_run: '' });
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.WirePricing.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['wirePricing']);
      setEditingId(null);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.WirePricing.delete(id),
    onSuccess: () => queryClient.invalidateQueries(['wirePricing'])
  });

  const canEdit = isAtLeast(ROLES.ADMINISTRATOR);

  const handleCreate = () => {
    if (!newEntry.wire_type) return;
    createMutation.mutate({
      wire_type: newEntry.wire_type,
      wire_spec: newEntry.wire_spec || null,
      material_price_per_foot: parseFloat(newEntry.material_price_per_foot) || 0,
      labor_price_per_run: parseFloat(newEntry.labor_price_per_run) || 0
    });
  };

  const handleEdit = (entry) => {
    setEditingId(entry.id);
    setEditData({
      material_price_per_foot: entry.material_price_per_foot || '',
      labor_price_per_run: entry.labor_price_per_run || ''
    });
  };

  const handleSave = (id) => {
    updateMutation.mutate({
      id,
      data: {
        material_price_per_foot: parseFloat(editData.material_price_per_foot) || 0,
        labor_price_per_run: parseFloat(editData.labor_price_per_run) || 0
      }
    });
  };

  // Group by wire type
  const groupedPricing = wirePricing.reduce((acc, entry) => {
    const type = entry.wire_type;
    if (!acc[type]) acc[type] = [];
    acc[type].push(entry);
    return acc;
  }, {});

  if (permLoading || isLoading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <Link to={createPageUrl("AVCanvas")}>
            <Button variant="ghost" className="text-gray-400 hover:text-white">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Canvas
            </Button>
          </Link>
        </div>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
            <Cable className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Wire Pricing</h1>
            <p className="text-gray-400 text-sm">Manage material and labor costs for wire runs</p>
          </div>
        </div>

        {canEdit && (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 mb-6">
            <h3 className="text-white font-medium mb-3">Add New Wire Pricing</h3>
            <div className="grid grid-cols-4 gap-3">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Wire Type</label>
                <select
                  value={newEntry.wire_type}
                  onChange={(e) => setNewEntry({ ...newEntry, wire_type: e.target.value, wire_spec: '' })}
                  className="w-full bg-gray-800 border border-gray-700 text-white rounded-md px-3 py-2 text-sm"
                >
                  <option value="">Select type...</option>
                  {connectionTypes.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Wire Spec</label>
                <select
                  value={newEntry.wire_spec}
                  onChange={(e) => setNewEntry({ ...newEntry, wire_spec: e.target.value })}
                  className="w-full bg-gray-800 border border-gray-700 text-white rounded-md px-3 py-2 text-sm"
                  disabled={!newEntry.wire_type}
                >
                  <option value="">Any spec</option>
                  {(defaultWireSpecs[newEntry.wire_type] || []).map(spec => (
                    <option key={spec} value={spec}>{spec}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Material $/ft</label>
                <Input
                  type="number"
                  value={newEntry.material_price_per_foot}
                  onChange={(e) => setNewEntry({ ...newEntry, material_price_per_foot: e.target.value })}
                  className="bg-gray-800 border-gray-700 text-white"
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Labor $/run</label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    value={newEntry.labor_price_per_run}
                    onChange={(e) => setNewEntry({ ...newEntry, labor_price_per_run: e.target.value })}
                    className="bg-gray-800 border-gray-700 text-white"
                    placeholder="0.00"
                  />
                  <Button
                    onClick={handleCreate}
                    disabled={!newEntry.wire_type || createMutation.isPending}
                    className="bg-purple-600 hover:bg-purple-700"
                  >
                    {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-4">
          {Object.entries(groupedPricing).map(([type, entries]) => (
            <div key={type} className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
              <div className="px-4 py-3 bg-gray-800/50 border-b border-gray-800">
                <h3 className="text-white font-medium">{type}</h3>
              </div>
              <div className="divide-y divide-gray-800">
                {entries.map(entry => (
                  <div key={entry.id} className="px-4 py-3 flex items-center gap-4">
                    <div className="flex-1">
                      <span className="text-gray-300">{entry.wire_spec || 'All specs'}</span>
                    </div>
                    {editingId === entry.id ? (
                      <>
                        <div className="w-28">
                          <Input
                            type="number"
                            value={editData.material_price_per_foot}
                            onChange={(e) => setEditData({ ...editData, material_price_per_foot: e.target.value })}
                            className="bg-gray-800 border-gray-700 text-white text-sm"
                            placeholder="$/ft"
                          />
                        </div>
                        <div className="w-28">
                          <Input
                            type="number"
                            value={editData.labor_price_per_run}
                            onChange={(e) => setEditData({ ...editData, labor_price_per_run: e.target.value })}
                            className="bg-gray-800 border-gray-700 text-white text-sm"
                            placeholder="$/run"
                          />
                        </div>
                        <Button
                          size="sm"
                          onClick={() => handleSave(entry.id)}
                          disabled={updateMutation.isPending}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          <Save className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setEditingId(null)}
                          className="text-gray-400"
                        >
                          Cancel
                        </Button>
                      </>
                    ) : (
                      <>
                        <div className="text-gray-400 text-sm w-28">
                          ${entry.material_price_per_foot?.toFixed(2) || '0.00'}/ft
                        </div>
                        <div className="text-gray-400 text-sm w-28">
                          ${entry.labor_price_per_run?.toFixed(2) || '0.00'}/run
                        </div>
                        {canEdit && (
                          <>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleEdit(entry)}
                              className="text-gray-400 hover:text-white"
                            >
                              Edit
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => deleteMutation.mutate(entry.id)}
                              className="text-gray-400 hover:text-red-400"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </>
                        )}
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}

          {Object.keys(groupedPricing).length === 0 && (
            <div className="text-center py-12 text-gray-500">
              <Cable className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No wire pricing configured yet</p>
              {canEdit && <p className="text-sm mt-1">Add pricing above to get started</p>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}