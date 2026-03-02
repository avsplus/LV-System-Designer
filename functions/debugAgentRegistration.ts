import { createClient } from 'npm:@supabase/supabase-js@2.39.0';

Deno.serve(async (req) => {
  try {
    const { agent_id } = await req.json();
    
    if (!agent_id) {
      return Response.json({ error: 'agent_id required' }, { status: 400 });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_KEY');
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check if agent exists
    const { data: agents, error } = await supabase
      .from('agents')
      .select('*')
      .eq('agent_id', agent_id);

    if (error) {
      return Response.json({ error: error.message }, { status: 500 });
    }

    return Response.json({
      agent_id,
      found: agents && agents.length > 0,
      agent_data: agents && agents.length > 0 ? agents[0] : null,
      message: agents && agents.length > 0 ? 'Agent found in database' : 'Agent NOT found in database'
    });
  } catch (error) {
    console.error('Debug error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});