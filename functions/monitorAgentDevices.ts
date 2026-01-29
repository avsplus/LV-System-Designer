import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { createClient } from 'npm:@supabase/supabase-js@2.39.0';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // This is a scheduled automation - we need service role access
    if (!Deno.env.get('BASE44_SERVICE_TOKEN')) {
      console.error('No service token available for scheduled automation');
      return Response.json({ error: 'Service token required' }, { status: 500 });
    }
    
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
        // Get devices for this agent's organization
        const devices = await base44.asServiceRole.entities.Device.filter({
          organization_id: agent.organization_id,
          status: { $in: ['online', 'offline', 'warning'] }
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
          agent_id: agent.agent_id,
          command_type: 'ping_devices',
          parameters: {
            targets,
            timeoutMs: 1000,
            count: 2,
            maxConcurrency: 16
          }
        });
        
        if (!commandResult?.command_id) {
          throw new Error('No command_id returned');
        }
        
        // Wait for ping results and update device statuses
        await new Promise(resolve => setTimeout(resolve, 3000)); // Wait 3 seconds for pings to complete
        
        const { data: events } = await base44.asServiceRole.functions.invoke('getAgentEvents', {
          agent_id: agent.agent_id,
          command_id: commandResult.command_id,
          limit: 50
        });
        
        const completeEvent = events?.find(e => 
          e.event_type === 'command_complete' || 
          e.event_type === 'command_completed' ||
          e.event_type === 'ping_complete'
        );
        
        let updatedDevices = 0;
        if (completeEvent) {
          const eventData = completeEvent.data || {};
          const pingResults = eventData.results || eventData.result?.results || eventData.result || [];
          
          if (Array.isArray(pingResults)) {
            for (const result of pingResults) {
              const device = devices.find(d => d.ip_address === result.ip);
              if (device) {
                const newStatus = result.reachable ? 'online' : 'offline';
                if (device.status !== newStatus) {
                  await base44.asServiceRole.entities.Device.update(device.id, { status: newStatus });
                  updatedDevices++;
                }
              }
            }
          }
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