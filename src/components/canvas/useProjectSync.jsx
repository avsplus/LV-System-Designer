import { useEffect, useRef, useCallback } from 'react';
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

export default function useProjectSync({
  currentProject,
  currentUserEmail,
  onProjectUpdated
}) {
  const lastKnownUpdate = useRef(null);
  const isLocalChange = useRef(false);

  // Mark that we're about to make a local change
  const markLocalChange = useCallback(() => {
    isLocalChange.current = true;
    setTimeout(() => {
      isLocalChange.current = false;
    }, 3000); // Longer window to prevent sync overwriting local changes
  }, []);

  useEffect(() => {
    if (!currentProject?.id || !currentUserEmail) return;

    lastKnownUpdate.current = currentProject.updated_date;

    const checkForUpdates = async () => {
      if (isLocalChange.current) return;

      try {
        const projects = await base44.entities.AVProject.filter({
          id: currentProject.id
        });

        if (projects.length === 0) return;

        const latestProject = projects[0];

        // Check if project was updated by someone else
        if (latestProject.updated_date !== lastKnownUpdate.current) {
          lastKnownUpdate.current = latestProject.updated_date;
          
          // Only sync if we didn't make the change
          if (!isLocalChange.current) {
            toast.info('Project updated by collaborator', {
              description: 'Canvas has been synced with latest changes'
            });
            onProjectUpdated(latestProject);
          }
        }
      } catch (error) {
        console.error('Sync check error:', error);
      }
    };

    const interval = setInterval(checkForUpdates, 3000); // Check every 3 seconds for real-time collaboration

    return () => clearInterval(interval);
  }, [currentProject?.id, currentUserEmail, onProjectUpdated]);

  return { markLocalChange };
}