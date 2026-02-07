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

    // Check column type
    const { data: columnInfo, error: columnError } = await supabase
      .rpc('exec', {
        sql: `
          SELECT column_name, data_type, udt_name
          FROM information_schema.columns
          WHERE table_name = 'devices' 
          AND column_name = 'open_ports';
        `
      });

    if (columnError) {
      return Response.json({ 
        error: 'Could not check column',
        details: columnError.message
      }, { status: 500 });
    }

    // Sample a device to see what the data looks like
    const { data: sampleDevice, error: sampleError } = await supabase
      .from('devices')
      .select('id, open_ports')
      .limit(1)
      .single();

    return Response.json({ 
      columnInfo,
      sampleDevice,
      sampleType: typeof sampleDevice?.open_ports,
      isArray: Array.isArray(sampleDevice?.open_ports),
      sampleValue: sampleDevice?.open_ports
    });
  } catch (error) {
    return Response.json({ 
      error: error.message
    }, { status: 500 });
  }
});