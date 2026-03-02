import React, { useEffect, useRef, useCallback } from 'react';
import { appClient } from "@/api/appClient";
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

  // Update known timestamp directly (used after save to prevent race condition)
  const updateKnownTimestamp = useCallback((timestamp) => {
    if (!timestamp) return;

    // Database precision handling - timestamps can have varying precision
    // Remove timezone and normalize to just date+time for comparison
    const normalizeTimestamp = (ts) => {
      if (!ts) return null;
      // Remove timezone info and microseconds, keep only up to milliseconds
      const dateTimePart = ts.split('+')[0].split('Z')[0].split('.')[0];
      const millisPart = ts.split('.')[1]?.substring(0, 3) || '000';
      return `${dateTimePart}.${millisPart}`;
    };

    const normalized = normalizeTimestamp(timestamp);
    lastKnownUpdate.current = normalized;
    console.log('Updated known timestamp to:', normalized);
  }, []);

  useEffect(() => {
    if (!currentProject?.id || !currentUserEmail) return;

    // Normalize timestamp function
    const normalizeTimestamp = (ts) => {
      if (!ts) return null;
      const dateTimePart = ts.split('+')[0].split('Z')[0].split('.')[0];
      const millisPart = ts.split('.')[1]?.substring(0, 3) || '000';
      return `${dateTimePart}.${millisPart}`;
    };

    // Update last known timestamp when project changes (initial load or project switch)
    const normalized = normalizeTimestamp(currentProject.updated_date);
    lastKnownUpdate.current = normalized;
    console.log('Sync initialized for project, timestamp:', normalized);

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
        const latestProject = await appClient.getProject(currentProject.id);
        if (!latestProject) return;

        // Double-check we're still not in local change window after fetch
        if (Date.now() - localChangeTimestamp.current < 8000) {
          console.log('Sync blocked after fetch - ignoring server update');
          return;
        }

        // Normalize both timestamps for comparison
        const normalizedLatest = normalizeTimestamp(latestProject.updated_date);
        const normalizedKnown = lastKnownUpdate.current;

        const updatedBy = latestProject.updated_by || latestProject.owner_email || null;
        const wasUpdatedByCollaborator = Boolean(
          updatedBy && currentUserEmail && updatedBy !== currentUserEmail
        );

        if (normalizedLatest !== normalizedKnown) {
          console.log('Update detected:', {
            known: normalizedKnown,
            latest: normalizedLatest,
            updated_by: updatedBy,
            current_user: currentUserEmail,
            is_collaborator: wasUpdatedByCollaborator
          });
          lastKnownUpdate.current = normalizedLatest;

          if (wasUpdatedByCollaborator) {
            toast.info('Project updated by collaborator', {
              description: 'Canvas has been synced with latest changes'
            });
            onProjectUpdated(latestProject);
          } else {
            console.log('Update was by current user - skipping sync apply');
          }
        }
      } catch (error) {
        console.error('Sync check error:', error);
      }
    };

    // Check every 5 seconds
    const interval = setInterval(checkForUpdates, 5000);

    return () => clearInterval(interval);
  }, [currentProject?.id, currentProject?.updated_date, currentUserEmail, onProjectUpdated]);

  return { markLocalChange, updateKnownTimestamp };
}
