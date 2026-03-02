import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { createClient } from 'npm:@supabase/supabase-js@2.39.0';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Initialize Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_KEY');
    
    if (!supabaseUrl || !supabaseKey) {
      return Response.json({ error: 'Supabase not configured' }, { status: 500 });
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Get all organizations (service role call)
    const { data: agents, error: agentsError } = await supabase
      .from('agents')
      .select('*')
      .eq('monitoring_enabled', true);
    
    if (agentsError) {
      console.error('Error fetching agents:', agentsError);
      return Response.json({ error: 'Failed to fetch agents' }, { status: 500 });
    }
    
    if (!agents || agents.length === 0) {
      return Response.json({ success: true, agents_pinged: 0 });
    }
    
    console.log(`Starting monitoring ping schedule for ${agents.length} agents`);
    let totalDevicesPinged = 0;
    
    // Process each agent in parallel
    const pingPromises = agents.map(async (agent) => {
      try {
        // Get devices for this agent's organization
        const allDevices = await base44.asServiceRole.entities.Device.filter({
          organization_id: agent.organization_id
        });
        
        const devices = allDevices.filter(d => d.ip_address && ['online', 'offline', 'warning', 'maintenance'].includes(d.status));
        
        if (devices.length === 0) {
          return { agent_id: agent.agent_id, devices_pinged: 0 };
        }
        
        const targets = devices.map(d => d.ip_address);
        
        // Send ping command
        const { data: commandResult } = await base44.asServiceRole.functions.invoke('sendAgentCommand', {
          organization_id: agent.organization_id,
          agent_id: agent.agent_id,
          command_type: 'ping_devices',
          parameters: {
            targets,
            timeoutMs: 1000,
            count: 3,
            maxConcurrency: 16
          }
        });
        
        if (!commandResult?.command_id) {
          console.warn(`No command ID for agent ${agent.agent_id}`);
          return { agent_id: agent.agent_id, devices_pinged: 0 };
        }
        
        // Poll for results (timeout after 30 seconds)
        let pollAttempts = 0;
        const maxPollAttempts = 30;
        let resultsFound = false;
        
        while (pollAttempts < maxPollAttempts && !resultsFound) {
          await new Promise(resolve => setTimeout(resolve, 1000));
          pollAttempts++;
          
          try {
            const { data: pingResult } = await base44.asServiceRole.functions.invoke('getPingResults', {
              command_id: commandResult.command_id
            });
            
            if (!pingResult?.result) {
              continue;
            }
            
            resultsFound = true;
            let resultData = pingResult.result;
            
            if (typeof resultData === 'string') {
              try {
                resultData = JSON.parse(resultData);
              } catch (e) {
                console.error('Failed to parse result:', e);
                return { agent_id: agent.agent_id, devices_pinged: 0 };
              }
            }
            
            const pingTargets = resultData?.targets || resultData;
            
            if (!Array.isArray(pingTargets)) {
              console.warn(`Invalid ping targets format for agent ${agent.agent_id}`);
              return { agent_id: agent.agent_id, devices_pinged: 0 };
            }
            
            // Update device statuses
            for (const target of pingTargets) {
              const device = devices.find(d => d.ip_address === target.ip);
              if (device) {
                const newStatus = target.reachable ? 'online' : 'offline';
                await base44.asServiceRole.entities.Device.update(device.id, { 
                  status: newStatus 
                });
              }
            }
            
            return { agent_id: agent.agent_id, devices_pinged: devices.length };
          } catch (pollError) {
            console.error(`Poll error for agent ${agent.agent_id}:`, pollError);
          }
        }
        
        if (!resultsFound) {
          console.warn(`No ping results for agent ${agent.agent_id} after ${pollAttempts} attempts`);
        }
        
        return { agent_id: agent.agent_id, devices_pinged: resultsFound ? devices.length : 0 };
      } catch (agentError) {
        console.error(`Error processing agent ${agent.agent_id}:`, agentError);
        return { agent_id: agent.agent_id, devices_pinged: 0, error: agentError.message };
      }
    });
    
    const results = await Promise.all(pingPromises);
    totalDevicesPinged = results.reduce((sum, r) => sum + r.devices_pinged, 0);
    
    console.log(`Monitoring ping schedule completed. Total devices pinged: ${totalDevicesPinged}`);
    
    return Response.json({ 
      success: true, 
      agents_pinged: agents.length,
      total_devices_pinged: totalDevicesPinged,
      results 
    });
    
  } catch (error) {
    console.error('Monitoring ping schedule error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});