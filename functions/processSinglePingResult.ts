import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { createClient } from 'npm:@supabase/supabase-js@2.39.0';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { event, data } = await req.json();
    
    // This is triggered by entity automation when a new AgentPingResult is created or updated
    if (!event || (event.type !== 'create' && event.type !== 'update') || !data) {
      return Response.json({ error: 'Invalid event' }, { status: 400 });
    }
    
    console.log('🔔 Processing ping result for command:', data.command_id);
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_KEY');
    
    if (!supabaseUrl || !supabaseKey) {
      return Response.json({ error: 'Supabase not configured' }, { status: 500 });
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Parse result
    let resultData = data.result;
    if (typeof resultData === 'string') {
      try {
        resultData = JSON.parse(resultData);
      } catch (e) {
        console.error('Failed to parse result:', e);
        return Response.json({ error: 'Invalid result format' }, { status: 400 });
      }
    }
    
    // Handle different result formats (same as manual ping)
    let pingTargets = [];
    if (Array.isArray(resultData)) {
      if (resultData.length === 1 && resultData[0]?.targets) {
        pingTargets = resultData[0].targets;
      } else {
        pingTargets = resultData;
      }
    } else if (resultData?.targets) {
      pingTargets = resultData.targets;
    }
    
    if (!pingTargets || !Array.isArray(pingTargets) || pingTargets.length === 0) {
      console.error('No valid targets in result');
      return Response.json({ error: 'No targets found' }, { status: 400 });
    }
    
    console.log(`✅ Processing ${pingTargets.length} ping targets`);
    
    // Fetch devices from Supabase
    const { data: devices, error: devicesError } = await supabase
      .from('devices')
      .select('*')
      .eq('organization_id', data.organization_id)
      .eq('agent_id', data.agent_id);
    
    if (devicesError) {
      console.error('Failed to fetch devices:', devicesError);
      return Response.json({ error: 'Failed to fetch devices' }, { status: 500 });
    }
    
    console.log(`📊 Found ${devices?.length || 0} devices for agent ${data.agent_id}`);
    
    // Update device statuses (exactly like manual ping does)
    let updated = 0;
    const updatePromises = pingTargets.map(async (target) => {
      const device = devices?.find(d => d.ip_address === target.ip);
      if (device) {
        const newStatus = target.reachable ? 'online' : 'offline';
        console.log(`🔍 Device ${device.name} (${target.ip}): ${device.status} -> ${newStatus}, Reachable: ${target.reachable}`);
        
        const { error: updateError } = await supabase
          .from('devices')
          .update({ 
            status: newStatus,
            updated_date: new Date().toISOString()
          })
          .eq('id', device.id);
        
        if (!updateError) {
          updated++;
          console.log(`✅ Updated ${device.name} to ${newStatus}`);
        } else {
          console.error(`❌ Failed to update ${device.name}:`, updateError);
        }
      } else {
        console.log(`❌ No device found for IP: ${target.ip}`);
      }
    });
    
    await Promise.all(updatePromises);
    
    console.log(`✅ Updated ${updated}/${pingTargets.length} device statuses`);
    
    return Response.json({
      success: true,
      devices_checked: pingTargets.length,
      devices_updated: updated
    });
    
  } catch (error) {
    console.error('Process ping result error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});