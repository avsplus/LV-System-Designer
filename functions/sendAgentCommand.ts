import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

// This would need to be shared with agentWebSocket.js
// In production, use Redis or similar
const agentConnections = new Map();
const commandQueues = new Map();

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Authenticate user
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { agentId, command } = await req.json();
    
    // Verify agent belongs to user's organization
    const agents = await base44.entities.Agent.filter({ 
      agent_id: agentId,
      organization_id: user.organization_id 
    });
    
    if (agents.length === 0) {
      return Response.json({ error: 'Agent not found or access denied' }, { status: 404 });
    }
    
    const agent = agents[0];
    
    // Get organization for signing
    const orgs = await base44.entities.Organization.filter({ id: user.organization_id });
    if (orgs.length === 0) {
      return Response.json({ error: 'Organization not found' }, { status: 404 });
    }
    const org = orgs[0];
    
    // Check if agent is online and connected
    const connection = agentConnections.get(agentId);
    
    const commandId = `cmd_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const issuedAt = Math.floor(Date.now() / 1000);
    const nonce = crypto.randomUUID();
    
    // Sign command
    let signature = null;
    let sigInputB64 = null;
    if (org.org_signing_private_key) {
      try {
        const messageToSign = `${commandId}:${command.name}:${issuedAt}:${nonce}`;
        const messageBytes = new TextEncoder().encode(messageToSign);
        
        // Store sig_input as base64 for agent verification
        sigInputB64 = btoa(String.fromCharCode(...messageBytes));
        
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
        
        signature = btoa(String.fromCharCode(...new Uint8Array(signatureBytes)));
      } catch (error) {
        console.error('Failed to sign command:', error);
      }
    }
    
    const commandMessage = {
      type: 'command',
      command_id: commandId,
      command: command.name,
      args: command.params || {},
      issued_at: issuedAt,
      nonce,
      sig_input_b64: sigInputB64,
      signature
    };
    
    if (connection && connection.socket.readyState === WebSocket.OPEN) {
      // Agent is connected, send immediately
      connection.socket.send(JSON.stringify(commandMessage));
      
      return Response.json({ 
        success: true,
        command_id: commandMessage.command_id,
        status: 'sent'
      });
    } else {
      // Agent offline, queue command
      if (!commandQueues.has(agentId)) {
        commandQueues.set(agentId, []);
      }
      commandQueues.get(agentId).push(commandMessage);
      
      return Response.json({ 
        success: true,
        command_id: commandMessage.command_id,
        status: 'queued',
        message: 'Agent offline, command will be sent when agent reconnects'
      });
    }
  } catch (error) {
    console.error('Send command error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});