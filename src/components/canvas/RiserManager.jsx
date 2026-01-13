import React, { useState } from 'react';
import { X, Plus } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function RiserManager({ 
  risers, 
  floorplans, 
  onAdd, 
  onRemove,
  onClose,
  selectedFloorplanId 
}) {
  const [newRiserLabel, setNewRiserLabel] = useState('');

  const handleAddRiser = () => {
    if (!newRiserLabel.trim()) return;
    if (!selectedFloorplanId && floorplans.length === 0) return;
    
    const targetFloorplanId = selectedFloorplanId || floorplans[0]?.id;
    const targetFloorplan = floorplans.find(f => f.id === targetFloorplanId);
    
    // Place riser near the floorplan's position
    const floorplanX = targetFloorplan?.position?.x || 0;
    const floorplanY = targetFloorplan?.position?.y || 0;
    
    const newRiser = {
      id: `riser-${Date.now()}`,
      label: newRiserLabel.toUpperCase(),
      floorplanId: targetFloorplanId,
      position: { x: floorplanX + 100, y: floorplanY + 100 }
    };
    
    onAdd(newRiser);
    setNewRiserLabel('');
  };

  const risersByFloorplan = risers.reduce((acc, riser) => {
    const floorplanId = riser.floorplanId || 'unassigned';
    if (!acc[floorplanId]) acc[floorplanId] = [];
    acc[floorplanId].push(riser);
    return acc;
  }, {});

  return (
    <div className="fixed right-0 top-0 h-full w-96 bg-gray-900 border-l border-gray-700 shadow-xl z-50 flex flex-col">
      <div className="p-4 border-b border-gray-700 flex items-center justify-between">
        <h2 className="text-xl font-bold text-white">Manage Risers</h2>
        <Button size="icon" variant="ghost" onClick={onClose} className="text-gray-400 hover:text-white">
          <X className="w-5 h-5" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Add Riser Form */}
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <h3 className="text-sm font-semibold text-white mb-3">Add New Riser</h3>
          <div className="space-y-3">
            <div>
              <Label className="text-gray-300">Riser Label</Label>
              <Input
                placeholder="R1, R2, etc."
                value={newRiserLabel}
                onChange={(e) => setNewRiserLabel(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAddRiser()}
                className="bg-gray-700 border-gray-600 text-white"
              />
            </div>
            <Button 
              onClick={handleAddRiser} 
              className="w-full bg-purple-600 hover:bg-purple-700"
              disabled={!newRiserLabel.trim()}
            >
              <Plus className="w-4 h-4 mr-2" />
              Add to {selectedFloorplanId ? floorplans.find(f => f.id === selectedFloorplanId)?.name : 'Canvas'}
            </Button>
          </div>
        </div>

        {/* Existing Risers by Floorplan */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-white">Existing Risers</h3>
          {floorplans.map(floorplan => {
            const floorplanRisers = risersByFloorplan[floorplan.id] || [];
            return (
              <div key={floorplan.id} className="bg-gray-800 rounded-lg p-3 border border-gray-700">
                <div className="text-sm font-medium text-gray-300 mb-2">{floorplan.name}</div>
                {floorplanRisers.length === 0 ? (
                  <div className="text-xs text-gray-500">No risers on this floor</div>
                ) : (
                  <div className="space-y-2">
                    {floorplanRisers.map(riser => (
                      <div key={riser.id} className="flex items-center justify-between bg-gray-700 px-3 py-2 rounded">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-purple-500 flex items-center justify-center">
                            <span className="text-white font-bold text-xs">{riser.label}</span>
                          </div>
                          <span className="text-white text-sm">{riser.label}</span>
                        </div>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => onRemove(riser.id)}
                          className="h-7 w-7 text-gray-400 hover:text-red-400"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Info Box */}
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
          <div className="text-xs text-blue-300">
            <strong>Tip:</strong> Risers with the same label (e.g., "R1") on different floors represent the same vertical pathway. Connect devices to risers to route wires between floors.
          </div>
        </div>
      </div>
    </div>
  );
}