import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const { agent_id, organization_id, command_id, event_type, data, signature } = await req.json();
    
    if (!agent_id || !organization_id || !event_type) {
      return Response.json({ error: 'agent_id, organization_id, and event_type required' }, { status: 400 });
    }
    
    // Verify agent exists and belongs to organization
    const agents = await base44.asServiceRole.entities.Agent.filter({ 
      agent_id,
      organization_id 
    });
    
    if (agents.length === 0) {
      return Response.json({ error: 'Agent not found' }, { status: 404 });
    }
    
    const agent = agents[0];
    
    // Optional: Verify signature if provided
    if (signature) {
      try {
        const messageToVerify = JSON.stringify({
          agent_id,
          organization_id,
          event_type,
          command_id,
          timestamp: data?.timestamp
        });
        
        const publicKeyBytes = Uint8Array.from(atob(agent.agent_public_key), c => c.charCodeAt(0));
        const signatureBytes = Uint8Array.from(atob(signature), c => c.charCodeAt(0));
        const messageBytes = new TextEncoder().encode(messageToVerify);
        
        const cryptoKey = await crypto.subtle.importKey(
          "raw",
          publicKeyBytes,
          { name: "Ed25519" },
          false,
          ["verify"]
        );
        
        const isValid = await crypto.subtle.verify(
          "Ed25519",
          cryptoKey,
          signatureBytes,
          messageBytes
        );
        
        if (!isValid) {
          return Response.json({ error: 'Invalid signature' }, { status: 403 });
        }
      } catch (error) {
        console.error('Signature verification failed:', error);
        return Response.json({ error: 'Signature verification failed' }, { status: 403 });
      }
    }
    
    // Store event
    await base44.asServiceRole.entities.AgentEvent.create({
      organization_id,
      agent_id,
      command_id: command_id || null,
      event_type,
      data: data || {}
    });
    
    // Update agent last_seen
    await base44.asServiceRole.entities.Agent.update(agent.id, {
      last_seen: new Date().toISOString()
    });
    
    console.log(`Event received from agent ${agent_id}: ${event_type}`);
    
    return Response.json({ success: true });
    
  } catch (error) {
    console.error('Agent post event error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});