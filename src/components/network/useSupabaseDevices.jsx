import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { base44 } from "@/api/base44Client";

export function useSupabaseDevices(organizationId, agentId, supabaseClient) {
  const [devices, setDevices] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!supabaseClient || !organizationId || !agentId) {
      setIsLoading(false);
      return;
    }

    let mounted = true;
    let channel = null;

    // 1. Initial fetch
    async function loadInitial() {
      try {
        const { data, error: fetchError } = await supabaseClient
          .from('devices')
          .select('*')
          .eq('organization_id', organizationId)
          .eq('agent_id', agentId)
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

    // 2. Subscribe to realtime changes - always filter by agent_id
    channel = supabaseClient
      .channel(`devices-changes-${agentId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'devices',
          filter: `agent_id=eq.${agentId}`,
        },
        (payload) => {
          if (!mounted) return;

          console.log('🔔 Device Realtime event:', payload.eventType, payload.new || payload.old);

          setDevices((prev) => {
            if (payload.eventType === 'INSERT') {
              console.log('➕ Adding device:', payload.new.name);
              return [...prev, payload.new];
            }
            if (payload.eventType === 'UPDATE') {
              console.log('🔄 Updating device:', payload.new.name, 'Status:', payload.new.status);
              return prev.map(d =>
                d.id === payload.new.id ? payload.new : d
              );
            }
            if (payload.eventType === 'DELETE') {
              console.log('➖ Deleting device:', payload.old.id);
              return prev.filter(d => d.id !== payload.old.id);
            }
            return prev;
          });
        }
      )
      .subscribe((status, err) => {
        console.log('🔔 Devices Realtime subscription status:', status);
        if (err) {
          console.error('❌ Devices subscription error:', err);
        }
        if (status === 'SUBSCRIBED') {
          console.log('✅ Successfully subscribed to devices changes');
        }
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
    if (!supabaseClient || !organizationId || !agentId) return;
    
    try {
      const { data, error: fetchError } = await supabaseClient
        .from('devices')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('agent_id', agentId)
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