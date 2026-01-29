import React, { useState } from 'react';
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Upload, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

export default function AgentInstallerUpload({ open, onOpenChange }) {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  const handleUpload = async () => {
    if (!file) {
      toast.error('Please select a file');
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      // Use fetch directly for file uploads (FormData not supported by base44.functions.invoke)
      const response = await fetch(`${import.meta.env.VITE_BASE44_API_URL || 'https://api.base44.com'}/v1/apps/${import.meta.env.VITE_BASE44_APP_ID}/functions/uploadAgentInstaller`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('base44_token')}`
        },
        body: formData
      });

      const data = await response.json();
      
      if (data.success) {
        toast.success('Agent installer uploaded successfully');
        onOpenChange(false);
        setFile(null);
        window.location.reload();
      } else {
        toast.error(data.error || 'Upload failed');
      }
    } catch (error) {
      toast.error('Upload failed: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-gray-900 border-gray-800">
        <DialogHeader>
          <DialogTitle className="text-white">Upload Agent Installer</DialogTitle>
          <DialogDescription className="text-gray-400">
            Upload the Windows agent installer (.zip containing MSI and CAB1 files)
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Input
              type="file"
              accept=".zip,.exe,.msi"
              onChange={(e) => setFile(e.target.files[0])}
              className="bg-gray-800 border-gray-700 text-white"
            />
            {file && (
              <p className="text-sm text-gray-400 mt-2">
                Selected: {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
              </p>
            )}
          </div>

          <Button
            onClick={handleUpload}
            disabled={!file || uploading}
            className="w-full bg-cyan-600 hover:bg-cyan-700"
          >
            {uploading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4 mr-2" />
                Upload Installer
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}