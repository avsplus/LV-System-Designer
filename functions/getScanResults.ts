import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { createClient } from 'npm:@supabase/supabase-js@2.39.0';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { command_id } = await req.json();
    
    if (!command_id) {
      return Response.json({ error: 'command_id required' }, { status: 400 });
    }
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL'),
      Deno.env.get('SUPABASE_SERVICE_KEY')
    );
    
    // Fetch scan results from agent_scan_results table
    const { data: results, error } = await supabase
      .from('agent_scan_results')
      .select('*')
      .eq('command_id', command_id)
      .eq('organization_id', user.organization_id)
      .single();
    
    if (error) {
      console.error('Supabase scan results error:', error);
      return Response.json({ error: error.message }, { status: 500 });
    }
    
    if (!results) {
      return Response.json({ error: 'Scan results not found' }, { status: 404 });
    }
    
    return Response.json(results);
  } catch (error) {
    console.error('Get scan results error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});