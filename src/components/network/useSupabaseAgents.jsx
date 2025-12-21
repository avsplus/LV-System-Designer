import React, { useState, useEffect, useMemo } from 'react';
import { createClient } from '@supabase/supabase-js';

export function useSupabaseAgents(organizationId) {
  console.log('🔧 useSupabaseAgents hook called with org:', organizationId);
  
  // Create Supabase client inside the hook
  const supabaseClient = useMemo(() => {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
    
    console.log('🔑 URL:', supabaseUrl);
    console.log('🔑 KEY:', supabaseAnonKey ? supabaseAnonKey.substring(0, 20) + '...' : 'MISSING');
    
    if (supabaseUrl && supabaseAnonKey) {
      console.log('✅ Creating Supabase client...');
      const client = createClient(supabaseUrl, supabaseAnonKey);
      console.log('📦 Client created:', client);
      console.log('📦 Client type:', typeof client);
      return client;
    }
    
    console.error('❌ Cannot create Supabase client - missing credentials');
    return null;
  }, []);
  
  console.log('🔧 Supabase client:', supabaseClient);
  console.log('🔧 Supabase client exists:', !!supabaseClient);
  
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchAgents = async () => {
    if (!supabaseClient || !organizationId) {
      console.log('useSupabaseAgents: Missing supabase client or org ID', { supabaseClient: !!supabaseClient, organizationId });
      return;
    }
    try {
      setLoading(true);
      console.log('Fetching agents for organization:', organizationId);
      const { data, error } = await supabaseClient
        .from('agents')
        .select('*')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Supabase query error:', error);
        throw error;
      }
      console.log('Fetched agents:', data);
      setAgents(data || []);
    } catch (err) {
      console.error('Fetch agents error:', err);
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

  return { agents, loading, error, supabase: supabaseClient, refresh: fetchAgents };
}