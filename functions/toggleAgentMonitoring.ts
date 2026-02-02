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
    
    // If enabling monitoring, immediately ping devices
    let devicesUpdated = 0;
    if (enabled) {
      try {
        // Get devices for this agent's organization
        const devices = await base44.asServiceRole.entities.Device.filter({
          organization_id: user.organization_id,
          status: { $in: ['online', 'offline', 'warning'] }
        });
        
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
              console.log('📡 Sent ping command, ID:', commandResult.command_id);
              console.log('📡 Pinging', targets.length, 'devices:', targets);
              
              // Wait for command to complete using interval (exact same as manual ping)
              let pollAttempts = 0;
              const maxPollAttempts = 60; // 60 seconds
              
              const pollForResults = async () => {
                while (pollAttempts < maxPollAttempts) {
                  await new Promise(resolve => setTimeout(resolve, 1000));
                  pollAttempts++;
                  
                  try {
                    const { data: command } = await base44.asServiceRole.functions.invoke('getAgentCommand', {
                      command_id: commandResult.command_id
                    });
                    
                    console.log(`📊 Poll #${pollAttempts} - Command status:`, command?.status);
                    
                    if (command && (command.status === 'completed' || command.status === 'failed')) {
                      console.log('✅ Command terminal state:', command.status);
                      
                      if (command.status === 'failed') {
                        console.error('❌ Ping command failed');
                        return;
                      }
                      
                      // Read results from agent_ping_results (source of truth)
                      const { data: pingResult } = await base44.asServiceRole.functions.invoke('getPingResults', {
                        command_id: commandResult.command_id
                      });
                      
                      console.log('📦 Raw ping result:', pingResult);
                      console.log('📦 Result field:', pingResult?.result);
                      console.log('📦 Result type:', typeof pingResult?.result);
                      
                      if (!pingResult?.result) {
                        console.error('❌ No result field in ping result');
                        return;
                      }
                      
                      // Parse result if it's a string
                      let resultData = pingResult.result;
                      if (typeof resultData === 'string') {
                        try {
                          resultData = JSON.parse(resultData);
                          console.log('📦 Parsed result data:', resultData);
                        } catch (e) {
                          console.error('❌ Failed to parse result:', e);
                          return;
                        }
                      }
                      
                      const pingTargets = resultData?.targets || resultData;
                      console.log('📦 Final targets array:', pingTargets);
                      console.log('📦 Is array?', Array.isArray(pingTargets));
                      
                      if (!Array.isArray(pingTargets)) {
                        console.error('❌ Targets is not an array');
                        return;
                      }
                      
                      console.log('🔄 Processing', pingTargets.length, 'ping results');
                      
                      // Update device statuses
                      for (const target of pingTargets) {
                        console.log('🔍 Looking for device with IP:', target.ip);
                        const device = devices.find(d => d.ip_address === target.ip);
                        
                        if (device) {
                          const newStatus = target.reachable ? 'online' : 'offline';
                          console.log(`✏️ Updating device ${device.name} (${device.ip_address}) to ${newStatus}`);
                          
                          await base44.asServiceRole.entities.Device.update(device.id, { 
                            status: newStatus 
                          });
                          
                          devicesUpdated++;
                          console.log('✅ Updated! Total devices updated:', devicesUpdated);
                        } else {
                          console.log('⚠️ No device found with IP:', target.ip);
                        }
                      }
                      
                      console.log('🎉 Finished updating devices. Total updated:', devicesUpdated);
                      return;
                    }
                  } catch (pollError) {
                    console.error('❌ Poll error:', pollError);
                  }
                }
                
                console.error('⏱️ Ping timeout - no response after', pollAttempts, 'attempts');
              };
              
              await pollForResults();
            } else {
              console.error('❌ No command_id returned from sendAgentCommand');
            }
          }
        }
      } catch (pingError) {
        console.error('Initial ping failed:', pingError);
        // Don't fail the toggle operation if ping fails
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