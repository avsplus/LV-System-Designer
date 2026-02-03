import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { createClient } from 'npm:@supabase/supabase-js@2.39.0';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { agent_id, enabled } = await req.json();
    
    if (!agent_id || typeof enabled !== 'boolean') {
      return Response.json({ error: 'agent_id and enabled are required' }, { status: 400 });
    }
    
    // Initialize Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_KEY');
    
    if (!supabaseUrl || !supabaseKey) {
      return Response.json({ error: 'Supabase not configured' }, { status: 500 });
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Verify agent belongs to user's organization
    const { data: agent, error: fetchError } = await supabase
      .from('agents')
      .select('*')
      .eq('agent_id', agent_id)
      .eq('organization_id', user.organization_id)
      .single();
    
    if (fetchError || !agent) {
      return Response.json({ error: 'Agent not found or access denied' }, { status: 404 });
    }
    
    // Update monitoring status
    const { error: updateError } = await supabase
      .from('agents')
      .update({ monitoring_enabled: enabled })
      .eq('agent_id', agent_id);
    
    if (updateError) {
      console.error('Update error:', updateError);
      return Response.json({ error: 'Failed to update monitoring status' }, { status: 500 });
    }
    
    // If enabling monitoring, trigger initial ping and wait for results via realtime subscription
    let devicesUpdated = 0;
    if (enabled) {
      try {
        const allDevices = await base44.asServiceRole.entities.Device.filter({
          organization_id: user.organization_id
        });
        
        const devices = allDevices.filter(d => ['online', 'offline', 'warning', 'maintenance'].includes(d.status));
        
        if (devices && devices.length > 0) {
          const targets = devices
            .filter(d => d.ip_address)
            .map(d => d.ip_address);
          
          if (targets.length > 0) {
            // Send ping command
            const { data: commandResult } = await base44.asServiceRole.functions.invoke('sendAgentCommand', {
              organization_id: user.organization_id,
              agent_id: agent_id,
              command_type: 'ping_devices',
              parameters: {
                targets,
                timeoutMs: 1000,
                count: 3,
                maxConcurrency: 16
              }
            });
            
            if (commandResult?.command_id) {
              console.log('📡 Sent ping command, waiting for results via subscription...');
              
              // Set up realtime subscription for ping results
              const channel = supabase
                .channel(`ping-results-${commandResult.command_id}`)
                .on(
                  'postgres_changes',
                  {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'agent_ping_results',
                    filter: `command_id=eq.${commandResult.command_id}`
                  },
                  async (payload) => {
                    console.log('✅ Ping results received via subscription!');
                    
                    let resultData = payload.new.result;
                    if (typeof resultData === 'string') {
                      try {
                        resultData = JSON.parse(resultData);
                      } catch (e) {
                        console.error('❌ Failed to parse result:', e);
                        return;
                      }
                    }
                    
                    const pingTargets = resultData?.targets || resultData;
                    if (!Array.isArray(pingTargets)) {
                      console.error('❌ Targets is not an array');
                      return;
                    }
                    
                    console.log('🔄 Processing', pingTargets.length, 'ping results');
                    
                    // Update device statuses
                    for (const target of pingTargets) {
                      const device = devices.find(d => d.ip_address === target.ip);
                      if (device) {
                        const newStatus = target.reachable ? 'online' : 'offline';
                        await base44.asServiceRole.entities.Device.update(device.id, { 
                          status: newStatus 
                        });
                        devicesUpdated++;
                      }
                    }
                    
                    console.log('🎉 Updated', devicesUpdated, 'devices');
                    await supabase.removeChannel(channel);
                  }
                )
                .subscribe();
              
              // Wait up to 30 seconds for results, then unsubscribe
              await new Promise(resolve => setTimeout(resolve, 30000));
              await supabase.removeChannel(channel);
            }
          }
        }
      } catch (error) {
        console.error('Error during ping:', error);
      }
    }
    
    return Response.json({ 
      success: true, 
      monitoring_enabled: enabled,
      devices_updated: devicesUpdated
    });
    
  } catch (error) {
    console.error('Toggle monitoring error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});