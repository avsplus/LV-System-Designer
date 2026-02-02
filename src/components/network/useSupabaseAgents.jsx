import React, { useState, useEffect, useMemo } from 'react';
import { createClient } from '@supabase/supabase-js';
import { base44 } from '@/api/base44Client';

export function useSupabaseAgents(organizationId) {
  const [supabaseClient, setSupabaseClient] = useState(null);
  const [configLoading, setConfigLoading] = useState(true);
  
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Track agent status and when it changed to prevent timer resets
  const getStatusCache = () => {
    try {
      const cache = localStorage.getItem(`agent-status-cache-${organizationId}`);
      return cache ? JSON.parse(cache) : {};
    } catch {
      return {};
    }
  };
  
  const saveStatusCache = (cache) => {
    try {
      localStorage.setItem(`agent-status-cache-${organizationId}`, JSON.stringify(cache));
    } catch (e) {
      console.warn('Failed to save status cache:', e);
    }
  };

  // Fetch Supabase config from backend and initialize client
  useEffect(() => {
    const initSupabase = async () => {
      try {
        const { data } = await base44.functions.invoke('getSupabaseConfig', {});
        if (data?.url && data?.anonKey) {
          const client = createClient(data.url, data.anonKey);
          setSupabaseClient(client);
        }
      } catch (err) {
        console.error('Failed to initialize Supabase:', err);
      } finally {
        setConfigLoading(false);
      }
    };
    initSupabase();
  }, []);

  const fetchAgents = async () => {
    if (!supabaseClient || !organizationId) {
      return;
    }
    try {
      setLoading(true);
      
      // Fetch agents
      const { data: agentsData, error: agentsError } = await supabaseClient
        .from('agents')
        .select('*')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false });

      if (agentsError) throw agentsError;
      
      // Fetch heartbeats
      const { data: heartbeats, error: heartbeatsError } = await supabaseClient
        .from('agent_heartbeats')
        .select('*')
        .eq('org_id', organizationId);
      
      if (heartbeatsError) throw heartbeatsError;
      
      // Merge agents with heartbeat data and calculate status
      const now = Date.now();
      const mergedAgents = (agentsData || []).map(agent => {
        const heartbeat = heartbeats?.find(h => h.agent_id === agent.agent_id);

        if (!heartbeat) {
          return { ...agent, status: 'offline', last_seen: agent.last_seen };
        }

        const lastSeenTime = new Date(heartbeat.last_seen).getTime();
        const secondsSinceHeartbeat = (now - lastSeenTime) / 1000;

        // Consider online if heartbeat within last 90 seconds
        const isOnline = secondsSinceHeartbeat < 90;
        const newStatus = isOnline ? (heartbeat.status || 'online') : 'offline';
        const previousStatus = previousStatusRef.current[agent.agent_id];

        // Only update last_seen if status changed AND new status has been stable for 90+ seconds
        let lastSeen = agent.last_seen;
        if (previousStatus && previousStatus.status === newStatus && previousStatus.changedAt) {
          // Status is stable, keep using the previous last_seen time
          lastSeen = previousStatus.lastSeen;
        } else if (!previousStatus || previousStatus.status !== newStatus) {
          // Status just changed, record the change time
          previousStatusRef.current[agent.agent_id] = {
            status: newStatus,
            changedAt: now,
            lastSeen: heartbeat.last_seen
          };
          lastSeen = heartbeat.last_seen;
        }

        return {
          ...agent,
          status: newStatus,
          last_seen: lastSeen,
          version: heartbeat.agent_version || agent.version,
          health: agent.health
        };
      });

      setAgents(mergedAgents);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!supabaseClient || !organizationId) return;

    fetchAgents();

    // Listen for custom event to refresh
    const handleRefresh = () => fetchAgents();
    window.addEventListener('agent-registered', handleRefresh);

    // Refresh every minute for status updates
    const refreshInterval = setInterval(() => {
      fetchAgents();
    }, 60000); // 60 seconds

    // Subscribe to realtime updates on both tables
    const channel = supabaseClient
      .channel('agents-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'agents',
          filter: `organization_id=eq.${organizationId}`
        },
        () => {
          fetchAgents();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'agent_heartbeats',
          filter: `org_id=eq.${organizationId}`
        },
        () => {
          fetchAgents();
        }
      )
      .subscribe();

    return () => {
      window.removeEventListener('agent-registered', handleRefresh);
      clearInterval(refreshInterval);
      if (channel) supabaseClient.removeChannel(channel);
    };
  }, [organizationId, supabaseClient]);

  return { 
    agents, 
    loading: loading || configLoading, 
    error, 
    supabase: supabaseClient, 
    refresh: fetchAgents 
  };
}