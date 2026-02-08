import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { base44 } from "@/api/base44Client";

export function useSupabaseDevices(organizationId, agentId, supabaseClient) {
  const [devices, setDevices] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!supabaseClient || !organizationId) {
      setIsLoading(false);
      return;
    }

    let mounted = true;
    let channel = null;

    // 1. Initial fetch
    async function loadInitial() {
      try {
        let query = supabaseClient
          .from('devices')
          .select('*')
          .eq('organization_id', organizationId);
        
        if (agentId) {
          query = query.eq('agent_id', agentId);
        }
        
        const { data, error: fetchError } = await query
          .order('created_at', { ascending: false });

        if (fetchError) throw fetchError;

        if (mounted) {
          setDevices(data ?? []);
          setIsLoading(false);
        }
      } catch (err) {
        console.error('Failed to load devices:', err);
        if (mounted) {
          setError(err);
          setIsLoading(false);
        }
      }
    }

    loadInitial();

    // 2. Subscribe to realtime changes
    const filterString = agentId 
      ? `organization_id=eq.${organizationId},agent_id=eq.${agentId}`
      : `organization_id=eq.${organizationId}`;
    
    channel = supabaseClient
      .channel('devices-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'devices',
          filter: filterString,
        },
        (payload) => {
          if (!mounted) return;

          console.log('Device change received:', payload.eventType, payload);

          setDevices((prev) => {
            if (payload.eventType === 'INSERT') {
              return [...prev, payload.new];
            }
            if (payload.eventType === 'UPDATE') {
              return prev.map(d =>
                d.id === payload.new.id ? payload.new : d
              );
            }
            if (payload.eventType === 'DELETE') {
              return prev.filter(d => d.id !== payload.old.id);
            }
            return prev;
          });
        }
      )
      .subscribe((status) => {
        console.log('Devices subscription status:', status);
      });

    // 3. Cleanup
    return () => {
      mounted = false;
      if (channel) {
        supabaseClient.removeChannel(channel);
        }
        };
        }, [organizationId, agentId, supabaseClient]);

  const refresh = async () => {
    if (!supabaseClient || !organizationId) return;
    
    try {
      let query = supabaseClient
        .from('devices')
        .select('*')
        .eq('organization_id', organizationId);
      
      if (agentId) {
        query = query.eq('agent_id', agentId);
      }
      
      const { data, error: fetchError } = await query
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;
      setDevices(data ?? []);
    } catch (err) {
      console.error('Failed to refresh devices:', err);
      setError(err);
    }
  };

  return { devices, isLoading, error, refresh };
}