import React, { useState, useEffect, useMemo } from 'react';
import { createClient } from '@supabase/supabase-js';
import { base44 } from '@/api/base44Client';

export function useSupabaseAgents(organizationId) {
  const [supabaseClient, setSupabaseClient] = useState(null);
  const [configLoading, setConfigLoading] = useState(true);
  
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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
      const { data, error } = await supabaseClient
        .from('agents')
        .select('*')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAgents(data || []);
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

    // Subscribe to realtime updates
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
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setAgents(prev => [payload.new, ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            setAgents(prev => prev.map(agent => 
              agent.id === payload.new.id ? payload.new : agent
            ));
          } else if (payload.eventType === 'DELETE') {
            setAgents(prev => prev.filter(agent => agent.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      window.removeEventListener('agent-registered', handleRefresh);
      if (channel) supabaseClient.removeChannel(channel);
    };
  }, [organizationId]);

  return { 
    agents, 
    loading: loading || configLoading, 
    error, 
    supabase: supabaseClient, 
    refresh: fetchAgents 
  };
}