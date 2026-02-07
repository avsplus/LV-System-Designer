import { createClient } from 'npm:@supabase/supabase-js@2.39.0';
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_KEY');
    
    if (!supabaseUrl || !supabaseServiceKey) {
      return Response.json({ error: 'Missing Supabase credentials' }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check if agent_ping_results table exists and has data
    const { data: pingResults, error: selectError } = await supabase
      .from('agent_ping_results')
      .select('*')
      .limit(1);

    if (selectError) {
      return Response.json({
        error: 'agent_ping_results table not accessible',
        details: selectError.message,
        instructions: 'Table may not exist or needs proper setup'
      }, { status: 500 });
    }

    return Response.json({
      success: true,
      message: 'agent_ping_results table is accessible',
      hasSampleData: pingResults && pingResults.length > 0,
      instructions: 'Run this SQL in Supabase SQL Editor to enable Realtime:\n\nALTER PUBLICATION supabase_realtime ADD TABLE agent_ping_results;'
    });
  } catch (error) {
    return Response.json({ 
      error: error.message,
      instructions: 'Run this SQL in Supabase SQL Editor:\n\nALTER PUBLICATION supabase_realtime ADD TABLE agent_ping_results;'
    }, { status: 500 });
  }
});