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
    
    // If enabling monitoring, trigger immediate initial ping
    let devicesTargeted = 0;
    if (enabled) {
      try {
        // Get devices for this agent from Supabase
        const { data: agentDevices } = await supabase
          .from('devices')
          .select('*')
          .eq('organization_id', user.organization_id)
          .eq('agent_id', agent_id);
        
        console.log('📊 Total devices found for agent:', agentDevices?.length || 0);
        console.log('📊 Agent ID:', agent_id);
        
        // Get devices with IP addresses
        const targets = agentDevices
          ?.filter(d => d.ip_address)
          .map(d => d.ip_address) || [];
        
        devicesTargeted = targets.length;
        
        console.log('🎯 Devices with IP addresses:', devicesTargeted);
        console.log('🎯 Target IPs:', targets);
        
        if (targets.length > 0) {
          // Trigger immediate ping
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
          
          console.log('📡 Immediate ping triggered:', commandResult?.command_id);
        } else {
          console.log('⚠️ No devices with IP addresses found to ping');
        }
      } catch (error) {
        console.error('Error triggering ping:', error);
      }
    }
    
    return Response.json({ 
      success: true, 
      monitoring_enabled: enabled,
      devices_pinged: devicesTargeted,
      message: enabled ? `Monitoring enabled - ${devicesTargeted} devices will be pinged` : 'Monitoring disabled'
    });
    
  } catch (error) {
    console.error('Toggle monitoring error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});