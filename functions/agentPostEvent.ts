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
    
    // Update command status and result when agent reports completion/failure
    if (command_id && (event_type === 'command_completed' || event_type === 'command_failed')) {
      const updateData = {
        status: event_type === 'command_completed' ? 'completed' : 'failed',
        result: data || {}
      };
      
      console.log(`Updating command ${command_id} with status=${updateData.status}`);
      
      const { error: updateError } = await supabase
        .from('agent_commands')
        .update(updateData)
        .eq('id', command_id);
      
      if (updateError) {
        console.error('Failed to update command:', updateError);
      }
      
      // Get command type to determine if this is a ping result
      const { data: command } = await supabase
        .from('agent_commands')
        .select('command_type')
        .eq('id', command_id)
        .single();
      
      // If this is a ping result, store it (entity automation will trigger processing)
      if (command?.command_type === 'ping_devices' && event_type === 'command_completed') {
        console.log('📡 Storing ping result for command:', command_id);
        
        // Store in agent_ping_results table - entity automation handles the rest
        await supabase
          .from('agent_ping_results')
          .insert({
            command_id,
            agent_id,
            organization_id,
            result: data
          });
      }
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