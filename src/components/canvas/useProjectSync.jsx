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
    console.log('Local change marked - sync paused for 8 seconds');
    // Clear saving flag after save should be complete (3 seconds to be safe)
    setTimeout(() => {
      isSaving.current = false;
      console.log('Saving flag cleared');
    }, 3000);
  }, []);



  useEffect(() => {
    if (!currentProject?.id || !currentUserEmail) return;

    // Update last known timestamp when project changes (initial load or project switch)
    // This prevents treating the initial load as a "collaborator update"
    lastKnownUpdate.current = currentProject.updated_date;
    console.log('🔄 Sync initialized for project, timestamp:', currentProject.updated_date);

    const checkForUpdates = async () => {
      // Skip sync if we're saving or within local change window (extended to 8 seconds)
      const timeSinceChange = Date.now() - localChangeTimestamp.current;
      if (isSaving.current || timeSinceChange < 8000) {
        if (timeSinceChange < 8000) {
          console.log(`Sync blocked: ${Math.ceil((8000 - timeSinceChange) / 1000)}s remaining`);
        }
        return;
      }

      try {
        const projects = await base44.entities.AVProject.filter({
          id: currentProject.id
        });

        if (projects.length === 0) return;

        const latestProject = projects[0];

        // Double-check we're still not in local change window after fetch
        if (Date.now() - localChangeTimestamp.current < 8000) {
          console.log('Sync blocked after fetch - ignoring server update');
          return;
        }

        // Only sync if timestamp actually changed from what we know
        // This prevents re-syncing the same data after project load
        if (latestProject.updated_date !== lastKnownUpdate.current) {
          console.log('📥 Remote update detected:', {
            known: lastKnownUpdate.current,
            latest: latestProject.updated_date
          });
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

    // Check every 5 seconds
    const interval = setInterval(checkForUpdates, 5000);

    return () => clearInterval(interval);
  }, [currentProject?.id, currentProject?.updated_date, currentUserEmail, onProjectUpdated]);

  return { markLocalChange };
}