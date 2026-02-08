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
    
    console.log(`⏰ Monitoring ${agents.length} agents`);
    
    const results = [];
    
    // For each monitored agent, get their devices and ping them
    for (const agent of agents) {
      try {
        // Get devices for this agent
        const { data: devices } = await supabase
          .from('devices')
          .select('*')
          .eq('organization_id', agent.organization_id)
          .eq('agent_id', agent.agent_id);
        
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
        
        console.log(`🎯 Pinging ${targets.length} devices for agent ${agent.agent_id}`);
        
        // Use sendAgentCommand (same as manual ping)
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
          throw new Error('Failed to send command');
        }
        
        console.log(`✅ Ping command ${commandResult.command_id} sent for agent ${agent.agent_id}`);
        
        // Wait for and process results (same as manual ping)
        const commandId = commandResult.command_id;
        const timeout = 30000; // 30 seconds
        const startTime = Date.now();
        let processed = false;
        
        while (Date.now() - startTime < timeout) {
          // Check for results
          const { data: pingResults } = await supabase
            .from('agent_ping_results')
            .select('*')
            .eq('command_id', commandId)
            .limit(1);
          
          if (pingResults && pingResults.length > 0) {
            console.log('📥 Ping results received for agent', agent.agent_id);
            
            // Process results immediately
            let result = pingResults[0].result;
            if (typeof result === 'string') {
              result = JSON.parse(result);
            }
            
            // Handle different result formats
            let pingTargets = [];
            if (Array.isArray(result)) {
              if (result.length === 1 && result[0]?.targets) {
                pingTargets = result[0].targets;
              } else {
                pingTargets = result;
              }
            } else if (result?.targets) {
              pingTargets = result.targets;
            }
            
            console.log(`📦 Processing ${pingTargets.length} ping targets for agent ${agent.agent_id}`);
            
            // Update device statuses
            for (const target of pingTargets) {
              const device = devices?.find(d => d.ip_address === target.ip);
              if (device) {
                const newStatus = target.reachable ? 'online' : 'offline';
                await supabase
                  .from('devices')
                  .update({ 
                    status: newStatus,
                    updated_date: new Date().toISOString()
                  })
                  .eq('id', device.id);
                
                console.log(`✅ Updated ${device.name} to ${newStatus}`);
              }
            }
            
            processed = true;
            break;
          }
          
          // Wait a bit before checking again
          await new Promise(resolve => setTimeout(resolve, 500));
        }
        
        results.push({
          agent_id: agent.agent_id,
          agent_name: agent.name,
          devices_targeted: targets.length,
          command_id: commandResult.command_id,
          processed,
          success: true
        });
        
      } catch (error) {
        console.error(`Failed to ping agent ${agent.agent_id}:`, error);
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