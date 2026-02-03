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
    
    // Get all agents with monitoring enabled
    const { data: agents, error: agentsError } = await supabase
      .from('agents')
      .select('*')
      .eq('monitoring_enabled', true);
    
    if (agentsError) {
      console.error('Failed to fetch agents:', agentsError);
      return Response.json({ error: 'Failed to fetch agents' }, { status: 500 });
    }
    
    if (!agents || agents.length === 0) {
      return Response.json({ message: 'No agents with monitoring enabled' });
    }
    
    console.log(`Found ${agents.length} agents with monitoring enabled`);
    
    const results = [];
    
    // For each monitored agent, get their devices and ping them
    for (const agent of agents) {
      try {
        // Get devices for this agent's organization (all devices with IP, regardless of status)
        const devices = await base44.asServiceRole.entities.Device.filter({
          organization_id: agent.organization_id
        });
        
        if (!devices || devices.length === 0) {
          console.log(`No devices found for agent ${agent.agent_id}`);
          continue;
        }
        
        const targets = devices
          .filter(d => d.ip_address)
          .map(d => d.ip_address);
        
        if (targets.length === 0) {
          console.log(`No devices with IP addresses for agent ${agent.agent_id}`);
          continue;
        }
        
        console.log(`Pinging ${targets.length} devices for agent ${agent.agent_id}`);
        
        // Send ping command to agent
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
          throw new Error('No command_id returned');
        }
        
        // Wait for ping results and update device statuses
        await new Promise(resolve => setTimeout(resolve, 3000)); // Wait 3 seconds for pings to complete
        
        // Fetch ping results from agent_ping_results table
        const { data: pingResult } = await base44.asServiceRole.functions.invoke('getPingResults', {
          command_id: commandResult.command_id
        });
        
        let updatedDevices = 0;
        
        // Parse result if it's a string
        let resultData = pingResult?.result;
        if (typeof resultData === 'string') {
          try {
            resultData = JSON.parse(resultData);
          } catch (e) {
            console.error('Failed to parse ping result:', e);
          }
        }
        
        const pingTargets = resultData?.targets || resultData;
        
        if (pingTargets && Array.isArray(pingTargets)) {
          console.log(`Processing ${pingTargets.length} ping results for agent ${agent.agent_id}`);
          
          // Update all device statuses based on ping results
          const updatePromises = pingTargets.map(target => {
            const device = devices.find(d => d.ip_address === target.ip);
            if (device) {
              const newStatus = target.reachable ? 'online' : 'offline';
              const oldStatus = device.status;
              updatedDevices++;
              
              console.log(`Updating device ${device.name} (${target.ip}): ${oldStatus} -> ${newStatus} (reachable: ${target.reachable})`);
              
              return base44.asServiceRole.entities.Device.update(device.id, { status: newStatus });
            } else {
              console.warn(`No device found for IP ${target.ip}`);
            }
            return Promise.resolve();
          });
          
          await Promise.all(updatePromises);
          console.log(`✅ Updated ${updatedDevices} device statuses for agent ${agent.agent_id}`);
        } else {
          console.warn('No valid targets in ping result');
        }
        
        results.push({
          agent_id: agent.agent_id,
          agent_name: agent.name,
          devices_pinged: targets.length,
          devices_updated: updatedDevices,
          command_id: commandResult.command_id,
          success: true
        });
        
      } catch (error) {
        console.error(`Failed to ping devices for agent ${agent.agent_id}:`, error);
        results.push({
          agent_id: agent.agent_id,
          agent_name: agent.name,
          success: false,
          error: error.message
        });
      }
    }
    
    return Response.json({
      message: `Monitoring check completed for ${agents.length} agents`,
      results
    });
    
  } catch (error) {
    console.error('Monitor devices error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});