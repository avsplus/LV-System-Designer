import { createClient } from 'npm:@supabase/supabase-js@2.39.0';

Deno.serve(async (req) => {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_KEY');
    
    if (!supabaseUrl || !supabaseKey) {
      return Response.json({ error: 'Supabase not configured' }, { status: 500 });
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Get the ping result from the request body (triggered by webhook or manual call)
    const { command_id } = await req.json();
    
    if (!command_id) {
      return Response.json({ error: 'command_id required' }, { status: 400 });
    }
    
    // Fetch the ping result
    const { data: pingResult, error: fetchError } = await supabase
      .from('agent_ping_results')
      .select('*')
      .eq('command_id', command_id)
      .single();
    
    if (fetchError || !pingResult) {
      return Response.json({ error: 'Ping result not found' }, { status: 404 });
    }
    
    console.log('📦 Processing ping result for command:', command_id);
    
    // Parse result
    let resultData = pingResult.result;
    if (typeof resultData === 'string') {
      try {
        resultData = JSON.parse(resultData);
      } catch (e) {
        console.error('Failed to parse result:', e);
        return Response.json({ error: 'Invalid result format' }, { status: 400 });
      }
    }
    
    const pingTargets = resultData?.targets || resultData;
    
    if (!pingTargets || !Array.isArray(pingTargets)) {
      return Response.json({ error: 'No valid targets in result' }, { status: 400 });
    }
    
    console.log(`✅ Processing ${pingTargets.length} ping results`);
    
    // Fetch all devices for this organization and agent
    const { data: devices, error: devicesError } = await supabase
      .from('devices')
      .select('*')
      .eq('organization_id', pingResult.organization_id)
      .eq('agent_id', pingResult.agent_id);
    
    if (devicesError) {
      console.error('Failed to fetch devices:', devicesError);
      return Response.json({ error: 'Failed to fetch devices' }, { status: 500 });
    }
    
    console.log(`📊 Found ${devices?.length || 0} devices for agent ${pingResult.agent_id}`);
    
    // Update device statuses
    let updated = 0;
    const updatePromises = pingTargets.map(async (target) => {
      const device = devices?.find(d => d.ip_address === target.ip);
      if (device) {
        const newStatus = target.reachable ? 'online' : 'offline';
        
        if (device.status !== newStatus) {
          const { error: updateError } = await supabase
            .from('devices')
            .update({ 
              status: newStatus,
              updated_date: new Date().toISOString()
            })
            .eq('id', device.id)
            .select();
          
          if (!updateError) {
            updated++;
            console.log(`🔄 Updated ${device.name} (${target.ip}): ${device.status} -> ${newStatus}`);
          } else {
            console.error(`❌ Failed to update ${device.name}:`, updateError);
          }
        }
      }
    });
    
    await Promise.all(updatePromises);
    
    console.log(`✅ Updated ${updated}/${pingTargets.length} device statuses`);
    
    return Response.json({
      success: true,
      command_id,
      devices_checked: pingTargets.length,
      devices_updated: updated
    });
    
  } catch (error) {
    console.error('Process ping results error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});