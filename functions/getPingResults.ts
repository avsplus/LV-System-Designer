import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { createClient } from 'npm:@supabase/supabase-js@2.39.0';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Allow service role calls (for scheduled automation)
    const user = await base44.auth.me().catch(() => null);
    
    const { command_id } = await req.json();
    
    if (!command_id) {
      return Response.json({ error: 'command_id required' }, { status: 400 });
    }
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL'),
      Deno.env.get('SUPABASE_SERVICE_KEY')
    );
    
    // Fetch ping results from agent_ping_results table
    let query = supabase
      .from('agent_ping_results')
      .select('*')
      .eq('command_id', command_id);
    
    // Only filter by org if user context exists
    if (user?.organization_id) {
      query = query.eq('organization_id', user.organization_id);
    }
    
    const { data: results, error } = await query.maybeSingle();
    
    // Handle "not found" gracefully (common during polling)
    if (error) {
      console.error('Supabase ping results error:', error);
      return Response.json({ error: error.message }, { status: 500 });
    }
    
    if (!results) {
      return Response.json({ error: 'Ping results not found yet' }, { status: 404 });
    }
    
    return Response.json(results);
  } catch (error) {
    console.error('Get ping results error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});