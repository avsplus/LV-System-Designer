import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import { createClient } from 'npm:@supabase/supabase-js@2.39.0';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { agent_id } = await req.json();

    if (!agent_id) {
      return Response.json({ error: 'agent_id required' }, { status: 400 });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_KEY');
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Delete agent from Supabase
    const { error } = await supabase
      .from('agents')
      .delete()
      .eq('agent_id', agent_id);

    if (error) {
      console.error('Delete agent error:', error);
      return Response.json({ error: 'Failed to delete agent' }, { status: 500 });
    }

    // Also delete any events for this agent
    await supabase
      .from('agent_events')
      .delete()
      .eq('agent_id', agent_id);

    return Response.json({ success: true, message: 'Agent deleted successfully' });
  } catch (error) {
    console.error('Delete agent error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});