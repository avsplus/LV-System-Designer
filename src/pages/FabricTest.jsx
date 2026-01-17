import React, { useState } from 'react';
import FabricFloorplanCanvas from '../components/canvas/FabricFloorplanCanvas';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function FabricTest() {
  const [floorplanUrl, setFloorplanUrl] = useState('');
  const [annotations, setAnnotations] = useState([]);

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h1 className="text-2xl font-bold mb-4">Fabric.js Canvas Test</h1>
          
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Floorplan URL</label>
              <div className="flex gap-2">
                <Input
                  placeholder="Paste floorplan image URL"
                  value={floorplanUrl}
                  onChange={(e) => setFloorplanUrl(e.target.value)}
                  className="flex-1"
                />
                <Button onClick={() => setFloorplanUrl('')}>Clear</Button>
              </div>
            </div>

            <div className="text-sm text-gray-600 space-y-1">
              <p><strong>Instructions:</strong></p>
              <ul className="list-disc ml-5">
                <li>Paste a floorplan image URL above</li>
                <li>Click objects to select/move/resize them</li>
                <li>Hold Alt + Drag to pan around</li>
                <li>Use zoom controls in top-right</li>
              </ul>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium">Annotations: {annotations.length}</p>
              <Button 
                onClick={() => console.log('Annotations:', annotations)}
                variant="outline"
                size="sm"
              >
                Log Annotations to Console
              </Button>
            </div>
          </div>
        </div>

        {floorplanUrl && (
          <div className="bg-white rounded-lg shadow p-6">
            <FabricFloorplanCanvas
              floorplanUrl={floorplanUrl}
              annotations={annotations}
              onAnnotationsChange={setAnnotations}
              width={1400}
              height={900}
              readOnly={false}
            />
          </div>
        )}
      </div>
    </div>
  );
}