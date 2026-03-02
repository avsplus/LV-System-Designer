import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import { createClient } from 'npm:@supabase/supabase-js@2.39.0';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { agent_id, command_id, limit = 50 } = await req.json();
    
    if (!agent_id) {
      return Response.json({ error: 'agent_id required' }, { status: 400 });
    }
    
    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL'),
      Deno.env.get('SUPABASE_SERVICE_KEY')
    );
    
    // Verify agent belongs to user's org
    const { data: agents } = await supabase
      .from('agents')
      .select('*')
      .eq('agent_id', agent_id)
      .eq('organization_id', user.organization_id);
    
    if (!agents || agents.length === 0) {
      return Response.json({ error: 'Agent not found' }, { status: 404 });
    }
    
    // Fetch events from Supabase
    let query = supabase
      .from('agent_events')
      .select('*')
      .eq('organization_id', user.organization_id)
      .eq('agent_id', agent_id)
      .order('created_at', { ascending: false })
      .limit(limit);
    
    if (command_id) {
      query = query.eq('command_id', command_id);
    }
    
    const { data: events, error: eventsError } = await query;
    
    if (eventsError) {
      console.error('Supabase events error:', eventsError);
      return Response.json({ error: eventsError.message }, { status: 500 });
    }
    
    return Response.json(events || []);
  } catch (error) {
    console.error('Get events error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});