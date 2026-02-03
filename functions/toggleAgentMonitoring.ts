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
    
    // If enabling monitoring, trigger initial ping (don't wait for results)
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
            // Fire and forget - let the scheduled automation handle updates
            base44.asServiceRole.functions.invoke('sendAgentCommand', {
              organization_id: user.organization_id,
              agent_id: agent_id,
              command_type: 'ping_devices',
              parameters: {
                targets,
                timeoutMs: 1000,
                count: 3,
                maxConcurrency: 16
              }
            }).catch(err => console.error('Ping trigger failed:', err));
            
            console.log('📡 Triggered initial ping for', targets.length, 'devices');
          }
        }
      } catch (error) {
        console.error('Error triggering ping:', error);
      }
    }
    
    return Response.json({ 
      success: true, 
      monitoring_enabled: enabled
    });
    
  } catch (error) {
    console.error('Toggle monitoring error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});