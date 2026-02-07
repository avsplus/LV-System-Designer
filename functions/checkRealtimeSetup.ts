import { createClient } from 'npm:@supabase/supabase-js@2.39.0';

Deno.serve(async (req) => {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_KEY');
    
    if (!supabaseUrl || !supabaseServiceKey) {
      return Response.json({ error: 'Missing Supabase credentials' }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check if agent_scan_results is in the publication
    const { data: publications, error: pubError } = await supabase
      .rpc('exec', {
        sql: `
          SELECT schemaname, tablename 
          FROM pg_publication_tables 
          WHERE pubname = 'supabase_realtime'
          AND tablename IN ('agent_scan_results', 'devices');
        `
      });

    if (pubError) {
      // Try alternative query
      const { data: altData, error: altError } = await supabase
        .from('pg_publication_tables')
        .select('*')
        .eq('pubname', 'supabase_realtime');
      
      return Response.json({
        message: 'Could not check publications directly',
        error: pubError.message,
        altError: altError?.message,
        instructions: 'Run this SQL in Supabase SQL Editor:\n\nALTER PUBLICATION supabase_realtime ADD TABLE agent_scan_results;\nALTER PUBLICATION supabase_realtime ADD TABLE devices;'
      });
    }

    return Response.json({
      publications,
      agent_scan_results_published: publications?.some(p => p.tablename === 'agent_scan_results'),
      devices_published: publications?.some(p => p.tablename === 'devices'),
      instructions: publications?.length === 0 ? 
        'Run this SQL in Supabase SQL Editor:\n\nALTER PUBLICATION supabase_realtime ADD TABLE agent_scan_results;\nALTER PUBLICATION supabase_realtime ADD TABLE devices;' :
        'Tables are published for Realtime'
    });
  } catch (error) {
    return Response.json({ 
      error: error.message,
      instructions: 'Run this SQL in Supabase SQL Editor:\n\nALTER PUBLICATION supabase_realtime ADD TABLE agent_scan_results;\nALTER PUBLICATION supabase_realtime ADD TABLE devices;'
    }, { status: 500 });
  }
});