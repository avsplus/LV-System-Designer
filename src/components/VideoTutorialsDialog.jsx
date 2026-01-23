import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Play, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";

export default function VideoTutorialsDialog({ open, onOpenChange }) {
  const [selectedVideo, setSelectedVideo] = React.useState(null);
  const [videos, setVideos] = React.useState([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    if (open) {
      loadVideos();
    }
  }, [open]);

  const loadVideos = async () => {
    try {
      setLoading(true);
      const { data } = await base44.functions.invoke('getYouTubeVideos');
      setVideos(data.videos || []);
    } catch (error) {
      console.error('Failed to load videos:', error);
      setVideos([]);
    } finally {
      setLoading(false);
    }
  };

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
        ) : loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
          </div>
        ) : videos.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            No tutorial videos found
          </div>
        ) : (
          <div className="grid gap-4 mt-4">
            {videos.map((tutorial, i) => (
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
        
        {!selectedVideo && !loading && videos.length > 0 && (
          <p className="text-sm text-gray-500 text-center mt-4">
            Click on any tutorial to start watching
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}