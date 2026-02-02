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
    
    // Delete events older than 1 hour for this agent
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    await supabase
      .from('agent_events')
      .delete()
      .eq('agent_id', agent_id)
      .lt('created_date', oneHourAgo);
    
    // Check if this exact event already exists (deduplication)
    if (command_id) {
      const { data: existingEvent } = await supabase
        .from('agent_events')
        .select('id')
        .eq('agent_id', agent_id)
        .eq('command_id', command_id)
        .eq('event_type', event_type)
        .limit(1)
        .single();
      
      if (existingEvent) {
        console.log(`Duplicate event ignored: ${event_type} for command ${command_id}`);
        return Response.json({ success: true, deduplicated: true });
      }
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