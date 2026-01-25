import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import { createClient } from 'npm:@supabase/supabase-js@2.39.0';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Authenticate user
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { agent_id, command_type, parameters, timeout_seconds } = await req.json();
    
    if (!agent_id || !command_type) {
      return Response.json({ error: 'agent_id and command_type required' }, { status: 400 });
    }
    
    // Verify agent belongs to user's organization via Supabase
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL'),
      Deno.env.get('SUPABASE_SERVICE_KEY')
    );
    
    const { data: agents, error: agentError } = await supabase
      .from('agents')
      .select('*')
      .eq('agent_id', agent_id)
      .eq('organization_id', user.organization_id);
    
    if (agentError || !agents || agents.length === 0) {
      return Response.json({ error: 'Agent not found or access denied' }, { status: 404 });
    }
    
    const agent = agents[0];
    
    // Get organization for signing
    const orgs = await base44.entities.Organization.filter({ id: user.organization_id });
    const org = orgs[0];
    
    // Build command message
    const commandId = crypto.randomUUID();
    const timestamp = new Date().toISOString();
    const nonce = crypto.randomUUID();
    
    const commandMessage = {
      type: 'command',
      command_id: commandId,
      command_type,
      parameters: parameters || {},
      org_id: user.organization_id,
      timestamp,
      nonce,
      timeout_seconds: timeout_seconds || 60
    };
    
    // Sign command if org has private key
    if (org?.org_signing_private_key) {
      try {
        const sigInputJson = JSON.stringify({
          type: commandMessage.type,
          command_id: commandMessage.command_id,
          command_type: commandMessage.command_type,
          org_id: commandMessage.org_id,
          timestamp: commandMessage.timestamp,
          nonce: commandMessage.nonce
        });
        
        const messageBytes = new TextEncoder().encode(sigInputJson);
        const sigInputB64 = btoa(String.fromCharCode(...messageBytes));
        
        const privateKeyBytes = Uint8Array.from(atob(org.org_signing_private_key), c => c.charCodeAt(0));
        const cryptoKey = await crypto.subtle.importKey(
          "pkcs8",
          privateKeyBytes,
          { name: "Ed25519" },
          false,
          ["sign"]
        );
        
        const signatureBytes = await crypto.subtle.sign(
          "Ed25519",
          cryptoKey,
          messageBytes
        );
        
        commandMessage.sig_alg = 'ed25519';
        commandMessage.sig_input_b64 = sigInputB64;
        commandMessage.signature = btoa(String.fromCharCode(...new Uint8Array(signatureBytes)));
      } catch (error) {
        console.error('Failed to sign command:', error);
      }
    }
    
    // Publish to Supabase Realtime channel
    const channel = supabase.channel(`agent:${agent_id}`);
    
    await channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await channel.send({
          type: 'broadcast',
          event: 'command',
          payload: commandMessage
        });
      }
    });
    
    // Wait a bit for message to be sent
    await new Promise(resolve => setTimeout(resolve, 500));
    await channel.unsubscribe();
    
    console.log(`Command sent to agent ${agent_id} via Supabase Realtime`);
    
    return Response.json({ 
      success: true,
      command_id: commandId,
      agent_id,
      delivery: 'realtime'
    });
    
  } catch (error) {
    console.error('Send agent command error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});