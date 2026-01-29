import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import { createClient } from 'npm:@supabase/supabase-js@2.39.0';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Get organization ID from request body or authenticated user
    let organizationId;
    const body = await req.json();
    const { agent_id, command_type, parameters, timeout_seconds, organization_id } = body;
    
    if (organization_id) {
      // Called from scheduled automation with organization_id
      organizationId = organization_id;
    } else {
      // Called from UI - require authenticated user
      const user = await base44.auth.me();
      if (!user) {
        return Response.json({ error: 'Unauthorized' }, { status: 401 });
      }
      
      const userOrgs = await base44.entities.Organization.filter({ 
        id: user.organization_id 
      });
      
      if (!userOrgs || userOrgs.length === 0) {
        return Response.json({ error: 'No organization found' }, { status: 403 });
      }
      
      organizationId = userOrgs[0].id;
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
      .eq('organization_id', organizationId);
    
    if (agentError || !agents || agents.length === 0) {
      return Response.json({ error: 'Agent not found or access denied' }, { status: 404 });
    }
    
    const agent = agents[0];
    
    const org = userOrgs[0];
    
    // Build command message
    const commandId = crypto.randomUUID();
    const timestamp = new Date().toISOString();
    const nonce = crypto.randomUUID();
    
    const commandMessage = {
      type: 'command',
      command_id: commandId,
      command_type,
      parameters: parameters || {},
      org_id: organizationId,
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
    
    // Insert command into agent_commands table - exact SQL match
    const { data: insertedCommand, error: insertError } = await supabase
      .from('agent_commands')
      .insert({
        agent_id,
        organization_id: organizationId,
        command_type,
        params: parameters || {},
        status: 'pending',
        nonce: crypto.randomUUID()
      })
      .select()
      .single();
    
    if (insertError) {
      console.error('Failed to insert command:', insertError);
      return Response.json({ error: 'Failed to send command: ' + insertError.message }, { status: 500 });
    }
    
    console.log(`Command inserted into database for agent ${agent_id}, DB ID: ${insertedCommand.id}`);
    
    return Response.json({ 
      success: true,
      command_id: insertedCommand.id,
      agent_id,
      delivery: 'realtime',
      status: 'sent'
    });
    
  } catch (error) {
    console.error('Send agent command error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});