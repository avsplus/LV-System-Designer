import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Play } from "lucide-react";

const TUTORIALS = [
  {
    title: "Getting Started",
    description: "Learn the basics of creating your first AV system design",
    youtubeId: "hkoYtxR151M"
  },
  {
    title: "Device Library",
    description: "Browse and add devices from the comprehensive product library",
    youtubeId: "rGNszZU4Iww"
  },
  {
    title: "Making Connections",
    description: "Connect devices and manage wire routing",
    youtubeId: "WBr7rsXEStg"
  },
  {
    title: "Exporting PDFs",
    description: "Generate professional proposals and installer documentation",
    youtubeId: "jxR_MBO6WKI"
  },
  {
    title: "Advanced Features",
    description: "Explore advanced features and tips for power users",
    youtubeId: "_1lc22IbIB8"
  },
  {
    title: "Best Practices",
    description: "Learn best practices for efficient AV system design",
    youtubeId: "CLWK_pDYk9U"
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
              {selectedVideo.youtubeId ? (
                <iframe
                  className="w-full h-full"
                  src={`https://www.youtube.com/embed/${selectedVideo.youtubeId}?autoplay=1`}
                  title={selectedVideo.title}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-500">
                  Video not available
                </div>
              )}
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
                disabled={!tutorial.youtubeId}
                className="flex items-start gap-4 p-4 bg-gray-800 hover:bg-gray-750 rounded-lg transition-colors text-left border border-gray-700 hover:border-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="w-40 h-24 bg-gray-950 rounded-lg flex items-center justify-center flex-shrink-0 relative overflow-hidden">
                  {tutorial.youtubeId ? (
                    <>
                      <img 
                        src={`https://img.youtube.com/vi/${tutorial.youtubeId}/mqdefault.jpg`}
                        alt={tutorial.title}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                        <Play className="w-8 h-8 text-white" />
                      </div>
                    </>
                  ) : (
                    <Play className="w-8 h-8 text-blue-400" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-semibold text-white mb-1">{tutorial.title}</h3>
                  <p className="text-sm text-gray-400">{tutorial.description}</p>
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