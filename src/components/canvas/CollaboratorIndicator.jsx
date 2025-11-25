import React, { useEffect, useState, useRef } from 'react';
import { base44 } from "@/api/base44Client";
import { Badge } from "@/components/ui/badge";
import { Users } from "lucide-react";

export default function CollaboratorIndicator({ projectId, currentUserEmail }) {
  const [collaborators, setCollaborators] = useState([]);
  const presenceIdRef = useRef(null);
  const previousProjectIdRef = useRef(null);

  // Clean up stale presence records (older than 2 minutes) on mount
  useEffect(() => {
    if (!currentUserEmail) return;
    
    const cleanupStalePresence = async () => {
      try {
        const allMyPresence = await base44.entities.ProjectPresence.filter({
          user_email: currentUserEmail
        });
        const twoMinutesAgo = new Date(Date.now() - 120000).toISOString();
        for (const p of allMyPresence) {
          if (p.last_seen < twoMinutesAgo) {
            await base44.entities.ProjectPresence.delete(p.id);
          }
        }
      } catch (e) {}
    };
    
    cleanupStalePresence();
  }, [currentUserEmail]);

  useEffect(() => {
    // Clean up presence from previous project when switching
    const cleanupPreviousPresence = async () => {
      if (presenceIdRef.current) {
        try {
          await base44.entities.ProjectPresence.delete(presenceIdRef.current);
        } catch (e) {}
        presenceIdRef.current = null;
      }
    };
    
    cleanupPreviousPresence();
    previousProjectIdRef.current = projectId;
    
    // If no project selected, clear collaborators and don't track presence
    if (!projectId || !currentUserEmail) {
      setCollaborators([]);
      return;
    }

    let interval;
    let userInfo = null;

    const updatePresence = async () => {
      try {
        // Only fetch user info once
        if (!userInfo) {
          userInfo = await base44.auth.me();
        }
        
        // Update or create presence record
        if (presenceIdRef.current) {
          await base44.entities.ProjectPresence.update(presenceIdRef.current, {
            last_seen: new Date().toISOString()
          });
        } else {
          // Check for existing record first
          const existing = await base44.entities.ProjectPresence.filter({
            project_id: projectId,
            user_email: currentUserEmail
          });

          if (existing.length > 0) {
            presenceIdRef.current = existing[0].id;
            await base44.entities.ProjectPresence.update(existing[0].id, {
              last_seen: new Date().toISOString()
            });
          } else {
            const created = await base44.entities.ProjectPresence.create({
              project_id: projectId,
              user_email: currentUserEmail,
              user_name: userInfo.full_name || userInfo.email,
              last_seen: new Date().toISOString()
            });
            presenceIdRef.current = created.id;
          }
        }

        // Fetch active collaborators (active in last 15 seconds)
        const allPresence = await base44.entities.ProjectPresence.filter({
          project_id: projectId
        });

        const sixtySecondsAgo = new Date(Date.now() - 60000).toISOString();
        const activeCollaborators = allPresence.filter(p => 
          p.user_email !== currentUserEmail && 
          p.last_seen > sixtySecondsAgo
        );

        setCollaborators(activeCollaborators);
      } catch (error) {
        console.error('Presence update error:', error);
      }
    };

    updatePresence();
    interval = setInterval(updatePresence, 30000); // Update every 30 seconds

    return () => {
      clearInterval(interval);
      if (presenceIdRef.current) {
        base44.entities.ProjectPresence.delete(presenceIdRef.current).catch(() => {});
        presenceIdRef.current = null;
      }
    };
  }, [projectId, currentUserEmail]);

  if (!projectId || collaborators.length === 0) return null;

  return (
    <div className="flex items-center gap-2">
      <Badge className="bg-green-500/20 text-green-400 border-green-500/30 flex items-center gap-1.5 px-2 py-1">
        <Users className="w-3 h-3" />
        <span className="text-xs">
          {collaborators.length} collaborator{collaborators.length > 1 ? 's' : ''} online
        </span>
      </Badge>
      <div className="flex -space-x-2">
        {collaborators.slice(0, 3).map((collab, idx) => (
          <div
            key={collab.id}
            className="w-7 h-7 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 border-2 border-gray-900 flex items-center justify-center text-white text-xs font-medium"
            title={collab.user_name || collab.user_email}
          >
            {(collab.user_name || collab.user_email)[0].toUpperCase()}
          </div>
        ))}
        {collaborators.length > 3 && (
          <div className="w-7 h-7 rounded-full bg-gray-700 border-2 border-gray-900 flex items-center justify-center text-white text-xs">
            +{collaborators.length - 3}
          </div>
        )}
      </div>
    </div>
  );
}