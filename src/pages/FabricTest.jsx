import React, { useState } from 'react';
import FabricFloorplanCanvas from '../components/canvas/FabricFloorplanCanvas';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { base44 } from "@/api/base44Client";
import { Upload } from "lucide-react";
import * as pdfjsLib from 'pdfjs-dist';

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

export default function FabricTest() {
  const [floorplanUrl, setFloorplanUrl] = useState('');
  const [annotations, setAnnotations] = useState([]);
  const [uploading, setUploading] = useState(false);

  console.log('Current floorplan URL:', floorplanUrl);

  const convertPdfToImage = async (file) => {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const page = await pdf.getPage(1);
    
    const viewport = page.getViewport({ scale: 2.0 });
    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    
    await page.render({
      canvasContext: canvas.getContext('2d'),
      viewport: viewport
    }).promise;
    
    return new Promise((resolve) => {
      canvas.toBlob((blob) => {
        resolve(new File([blob], file.name.replace('.pdf', '.png'), { type: 'image/png' }));
      }, 'image/png');
    });
  };

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
                  accept="image/*,application/pdf"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    
                    setUploading(true);
                    try {
                      let fileToUpload = file;
                      
                      // Convert PDF to image first
                      if (file.type === 'application/pdf') {
                        fileToUpload = await convertPdfToImage(file);
                      }
                      
                      const response = await base44.integrations.Core.UploadFile({ file: fileToUpload });
                      console.log('Upload response:', response);
                      setFloorplanUrl(response.file_url);
                    } catch (error) {
                      console.error('Upload failed:', error);
                      alert('Failed to upload file: ' + error.message);
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
                <li>Upload an image or PDF floorplan (PDFs auto-convert to images)</li>
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