// Deploy this to Supabase Edge Functions: supabase functions deploy agent-post-event
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { agent_id, organization_id, event_type, command_id, data } = await req.json();
    
    if (!agent_id || !organization_id || !event_type) {
      return Response.json({ 
        error: 'Missing required fields: agent_id, organization_id, event_type' 
      }, { status: 400, headers: corsHeaders });
    }
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Update agent status for heartbeats
    if (event_type === 'heartbeat' || event_type === 'status_change') {
      const updateData: any = { last_seen: new Date().toISOString() };
      if (data?.status) {
        updateData.status = data.status;
      }
      
      await supabase
        .from('agents')
        .update(updateData)
        .eq('agent_id', agent_id);
    }
    
    // Insert event
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
      return Response.json({ error: 'Failed to insert event' }, { 
        status: 500,
        headers: corsHeaders 
      });
    }
    
    return Response.json({ 
      success: true,
      message: 'Event received' 
    }, {
      headers: corsHeaders
    });
  } catch (error) {
    console.error('Agent post event error:', error);
    return Response.json({ error: error.message }, { 
      status: 500,
      headers: corsHeaders
    });
  }
});