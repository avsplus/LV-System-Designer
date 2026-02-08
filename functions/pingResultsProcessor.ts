import { createClient } from 'npm:@supabase/supabase-js@2.39.0';

Deno.serve(async (req) => {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_KEY');
    
    if (!supabaseUrl || !supabaseKey) {
      return Response.json({ error: 'Supabase not configured' }, { status: 500 });
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    console.log('⏰ Starting automated ping results processing...');
    
    // Atomically claim unprocessed ping results by marking them as processing
    // This prevents race conditions when multiple automation instances run simultaneously
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const processingId = crypto.randomUUID();
    
    // Atomically update unprocessed results to claim them for this instance
    const { data: pingResults, error: fetchError } = await supabase
      .from('agent_ping_results')
      .update({ processed: true, processing_id: processingId })
      .gte('created_at', tenMinutesAgo)
      .or('processed.is.null,processed.eq.false')
      .select();
    
    if (fetchError) {
      console.error('Failed to fetch ping results:', fetchError);
      return Response.json({ error: 'Failed to fetch ping results' }, { status: 500 });
    }
    
    if (!pingResults || pingResults.length === 0) {
      console.log('No unprocessed ping results found');
      return Response.json({ message: 'No unprocessed ping results' });
    }
    
    console.log(`Found ${pingResults.length} unprocessed ping results`);
    
    const results = [];
    
    for (const pingResult of pingResults) {
      try {
        console.log('📦 Processing ping result for command:', pingResult.command_id);
        
        // Parse result
        let resultData = pingResult.result;
        if (typeof resultData === 'string') {
          try {
            resultData = JSON.parse(resultData);
          } catch (e) {
            console.error('Failed to parse result:', e);
            continue;
          }
        }
        
        // Handle different result formats
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
          continue;
        }
        
        console.log(`✅ Processing ${pingTargets.length} ping targets`);
        
        // Fetch all devices for this organization and agent
        const { data: devices, error: devicesError } = await supabase
          .from('devices')
          .select('*')
          .eq('organization_id', pingResult.organization_id)
          .eq('agent_id', pingResult.agent_id);
        
        if (devicesError) {
          console.error('Failed to fetch devices:', devicesError);
          continue;
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
        
        results.push({
          command_id: pingResult.command_id,
          devices_checked: pingTargets.length,
          devices_updated: updated,
          success: true
        });
        
      } catch (error) {
        console.error(`Failed to process ping result ${pingResult.command_id}:`, error);
        results.push({
          command_id: pingResult.command_id,
          success: false,
          error: error.message
        });
      }
    }
    
    return Response.json({
      message: `Processed ${pingResults.length} ping results`,
      results
    });
    
  } catch (error) {
    console.error('Ping results processor error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});