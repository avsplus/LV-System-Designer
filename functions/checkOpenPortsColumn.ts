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

    // Get sample devices with open_ports
    const { data: devices, error: devicesError } = await supabase
      .from('devices')
      .select('id, name, open_ports')
      .not('open_ports', 'is', null)
      .limit(5);

    if (devicesError) {
      return Response.json({ 
        error: 'Could not fetch devices',
        details: devicesError.message
      }, { status: 500 });
    }

    const analysis = devices?.map(d => ({
      id: d.id,
      name: d.name,
      open_ports_raw: d.open_ports,
      type: typeof d.open_ports,
      isArray: Array.isArray(d.open_ports),
      length: d.open_ports?.length
    }));

    return Response.json({ 
      devices: analysis,
      instructions: devices?.length === 0 ? 
        'No devices with open_ports found. Column exists but no data.' :
        'Check the type and format of open_ports data'
    });
  } catch (error) {
    return Response.json({ 
      error: error.message
    }, { status: 500 });
  }
});