import { createClient } from 'npm:@supabase/supabase-js@2.39.0';

Deno.serve(async (req) => {
  try {
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
        
        // Insert ping command directly into agent_commands table
        const { data: insertedCommand, error: insertError } = await supabase
          .from('agent_commands')
          .insert({
            agent_id: agent.agent_id,
            organization_id: agent.organization_id,
            command_type: 'ping_devices',
            params: {
              targets,
              timeoutMs: 1000,
              count: 3,
              maxConcurrency: 16
            },
            status: 'pending',
            nonce: crypto.randomUUID()
          })
          .select()
          .single();
        
        if (insertError || !insertedCommand) {
          throw new Error('Failed to insert command: ' + insertError?.message);
        }
        
        console.log(`✅ Ping command ${insertedCommand.id} sent for agent ${agent.agent_id}`);
        
        results.push({
          agent_id: agent.agent_id,
          agent_name: agent.name,
          devices_targeted: targets.length,
          command_id: insertedCommand.id,
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