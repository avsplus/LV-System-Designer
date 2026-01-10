import React, { useEffect, useRef, useCallback } from 'react';
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

export default function useProjectSync({
  currentProject,
  currentUserEmail,
  onProjectUpdated
}) {
  const lastKnownUpdate = useRef(null);
  const localChangeTimestamp = useRef(0);
  const isSaving = useRef(false);

  // Mark that we're about to make a local change - extends the block window
  const markLocalChange = useCallback(() => {
    localChangeTimestamp.current = Date.now();
    isSaving.current = true;
    console.log('Local change marked - sync paused for 5 seconds');
    // Clear saving flag after save should be complete
    setTimeout(() => {
      isSaving.current = false;
    }, 2000);
  }, []);



  useEffect(() => {
    if (!currentProject?.id || !currentUserEmail) return;

    // Update last known timestamp when project changes
    lastKnownUpdate.current = currentProject.updated_date;

    const checkForUpdates = async () => {
      // Skip sync if we're saving or within local change window
      if (isSaving.current || (Date.now() - localChangeTimestamp.current < 5000)) {
        return;
      }

      try {
        const projects = await base44.entities.AVProject.filter({
          id: currentProject.id
        });

        if (projects.length === 0) return;

        const latestProject = projects[0];

        // Double-check we're still not in local change window after fetch
        if (Date.now() - localChangeTimestamp.current < 5000) {
          return;
        }

        // Check if project was updated by someone else
        if (latestProject.updated_date !== lastKnownUpdate.current) {
          lastKnownUpdate.current = latestProject.updated_date;
          
          toast.info('Project updated by collaborator', {
            description: 'Canvas has been synced with latest changes'
          });
          onProjectUpdated(latestProject);
        }
      } catch (error) {
        console.error('Sync check error:', error);
      }
    };

    // Check every 5 seconds instead of 3 to reduce conflicts
    const interval = setInterval(checkForUpdates, 5000);

    return () => clearInterval(interval);
  }, [currentProject?.id, currentUserEmail, onProjectUpdated]);

  return { markLocalChange };
}