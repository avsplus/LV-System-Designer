import React, { useState } from 'react';
import FabricFloorplanCanvas from '../components/canvas/FabricFloorplanCanvas';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { base44 } from "@/api/base44Client";
import { Upload } from "lucide-react";

export default function FabricTest() {
  const [floorplanUrl, setFloorplanUrl] = useState('');
  const [annotations, setAnnotations] = useState([]);
  const [uploading, setUploading] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h1 className="text-2xl font-bold mb-4">Fabric.js Canvas Test</h1>
          
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Upload Floorplan</label>
              <div className="flex gap-2">
                <Input
                  type="file"
                  accept="image/png,image/jpeg,image/jpg,image/gif,image/webp"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    
                    // Validate file type
                    if (!file.type.startsWith('image/')) {
                      alert('Please upload an image file (PNG, JPEG, GIF, or WebP). PDFs are not supported.');
                      e.target.value = '';
                      return;
                    }
                    
                    setUploading(true);
                    try {
                      const response = await base44.integrations.Core.UploadFile({ file });
                      setFloorplanUrl(response.file_url);
                    } catch (error) {
                      console.error('Upload failed:', error);
                      alert('Failed to upload image');
                    }
                    setUploading(false);
                  }}
                  disabled={uploading}
                  className="flex-1"
                />
                <Button onClick={() => setFloorplanUrl('')} disabled={!floorplanUrl}>
                  Clear
                </Button>
              </div>
              {uploading && <p className="text-sm text-blue-600 mt-1">Uploading...</p>}
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