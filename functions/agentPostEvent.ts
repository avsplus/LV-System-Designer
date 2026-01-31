import { createClient } from 'npm:@supabase/supabase-js@2.39.0';

Deno.serve(async (req) => {
  try {
    const { agent_id, organization_id, command_id, event_type, data } = await req.json();
    
    if (!agent_id || !organization_id || !event_type) {
      return Response.json({ 
        error: 'Missing required fields: agent_id, organization_id, event_type' 
      }, { status: 400 });
    }
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_KEY');
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Update agent status if it's a heartbeat or status change
    if (event_type === 'heartbeat' || event_type === 'status_change') {
      const status = data?.status || 'online';
      await supabase
        .from('agents')
        .update({ 
          status,
          last_seen: new Date().toISOString()
        })
        .eq('agent_id', agent_id);
    }
    
    // Clean up old events for this agent - keep only the most recent one
    const { data: oldEvents } = await supabase
      .from('agent_events')
      .select('id')
      .eq('agent_id', agent_id)
      .order('created_date', { ascending: false })
      .range(1, 1000);
    
    if (oldEvents && oldEvents.length > 0) {
      const idsToDelete = oldEvents.map(e => e.id);
      await supabase
        .from('agent_events')
        .delete()
        .in('id', idsToDelete);
    }
    
    // Store event
    const { error: insertError } = await supabase
      .from('agent_events')
      .insert({
        organization_id,
        agent_id,
        command_id,
        event_type,
        data
      });
    
    if (insertError) {
      console.error('Insert event error:', insertError);
      return Response.json({ error: 'Failed to store event' }, { status: 500 });
    }
    
    return Response.json({ success: true });
  } catch (error) {
    console.error('Agent post event error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});