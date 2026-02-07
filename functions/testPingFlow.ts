import { createClient } from 'npm:@supabase/supabase-js@2.39.0';
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_KEY');
    
    if (!supabaseUrl || !supabaseServiceKey) {
      return Response.json({ error: 'Missing Supabase credentials' }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check recent ping results
    const { data: recentPings, error: pingsError } = await supabase
      .from('agent_ping_results')
      .select('*')
      .limit(5);

    if (pingsError) {
      return Response.json({
        error: 'Could not fetch ping results',
        details: pingsError.message
      }, { status: 500 });
    }

    const analysis = recentPings?.map(ping => {
      let result = ping.result;
      if (typeof result === 'string') {
        try {
          result = JSON.parse(result);
        } catch (e) {
          return { ...ping, parseError: e.message };
        }
      }
      return {
        command_id: ping.command_id,
        created_date: ping.created_date,
        result_type: typeof result,
        targets_count: result?.targets?.length || 0,
        sample_target: result?.targets?.[0]
      };
    });

    return Response.json({
      recentPings: analysis,
      hasData: recentPings && recentPings.length > 0,
      message: recentPings && recentPings.length > 0 ? 
        'Ping results are being stored. Check if Realtime subscription is working in frontend.' :
        'No ping results found yet. Try running a ping test.'
    });
  } catch (error) {
    return Response.json({ 
      error: error.message
    }, { status: 500 });
  }
});