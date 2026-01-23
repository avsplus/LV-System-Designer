import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Play } from "lucide-react";

const TUTORIALS = [
  {
    title: "Getting Started",
    description: "Learn the basics of creating your first AV system design",
    videoUrl: "", // User will provide
    duration: "5:30"
  },
  {
    title: "Device Library",
    description: "Browse and add devices from the comprehensive product library",
    videoUrl: "",
    duration: "4:15"
  },
  {
    title: "Making Connections",
    description: "Connect devices and manage wire routing",
    videoUrl: "",
    duration: "6:45"
  },
  {
    title: "Exporting PDFs",
    description: "Generate professional proposals and installer documentation",
    videoUrl: "",
    duration: "3:20"
  }
];

export default function VideoTutorialsDialog({ open, onOpenChange }) {
  const [selectedVideo, setSelectedVideo] = React.useState(null);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto bg-gray-900 border-gray-800">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-white">Video Tutorials</DialogTitle>
        </DialogHeader>
        
        {selectedVideo ? (
          <div className="space-y-4">
            <button 
              onClick={() => setSelectedVideo(null)}
              className="text-sm text-blue-400 hover:text-blue-300"
            >
              ← Back to all tutorials
            </button>
            <div className="aspect-video bg-gray-950 rounded-lg overflow-hidden">
              <video 
                controls 
                className="w-full h-full"
                src={selectedVideo.videoUrl}
                autoPlay
              >
                Your browser does not support the video tag.
              </video>
            </div>
            <div>
              <h3 className="text-xl font-semibold text-white mb-2">{selectedVideo.title}</h3>
              <p className="text-gray-400">{selectedVideo.description}</p>
            </div>
          </div>
        ) : (
          <div className="grid gap-4 mt-4">
            {TUTORIALS.map((tutorial, i) => (
              <button
                key={i}
                onClick={() => setSelectedVideo(tutorial)}
                className="flex items-start gap-4 p-4 bg-gray-800 hover:bg-gray-750 rounded-lg transition-colors text-left border border-gray-700 hover:border-gray-600"
              >
                <div className="w-40 h-24 bg-gray-950 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Play className="w-8 h-8 text-blue-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-semibold text-white mb-1">{tutorial.title}</h3>
                  <p className="text-sm text-gray-400 mb-2">{tutorial.description}</p>
                  <span className="text-xs text-gray-500">{tutorial.duration}</span>
                </div>
              </button>
            ))}
          </div>
        )}
        
        {!selectedVideo && (
          <p className="text-sm text-gray-500 text-center mt-4">
            Click on any tutorial to start watching
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}