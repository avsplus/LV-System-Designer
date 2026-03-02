import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const {
      agent_id,
      organization_id,
      unregister_token,
      timestamp,
      signature
    } = await req.json();

    if (!agent_id || !organization_id || !unregister_token || !timestamp || !signature) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const base44 = createClientFromRequest(req);

    // 1. Validate token exists and is active
    const tokens = await base44.asServiceRole.entities.AgentUnregisterToken.filter({
      token: unregister_token,
      organization_id,
      status: 'active'
    });

    if (tokens.length === 0) {
      return Response.json({ error: 'Invalid or expired token' }, { status: 400 });
    }

    const token = tokens[0];

    // 2. Check token expiration
    if (new Date(token.expires_at) < new Date()) {
      await base44.asServiceRole.entities.AgentUnregisterToken.update(token.id, {
        status: 'expired'
      });
      return Response.json({ error: 'Token expired' }, { status: 400 });
    }

    // 3. Check token scope (if agent_id specified on token)
    if (token.agent_id && token.agent_id !== agent_id) {
      return Response.json({ error: 'Token not valid for this agent' }, { status: 403 });
    }

    // 4. Get agent and verify organization
    const agents = await base44.asServiceRole.entities.Agent.filter({
      agent_id,
      organization_id
    });

    if (agents.length === 0) {
      return Response.json({ error: 'Agent not found in organization' }, { status: 404 });
    }

    const agent = agents[0];

    // 5. Verify Ed25519 signature
    const message = `${agent_id}${organization_id}${unregister_token}${timestamp}`;
    const messageBytes = new TextEncoder().encode(message);

    try {
      const signatureBytes = Uint8Array.from(atob(signature), c => c.charCodeAt(0));
      const publicKeyBytes = Uint8Array.from(atob(agent.agent_public_key), c => c.charCodeAt(0));

      const publicKey = await crypto.subtle.importKey(
        'raw',
        publicKeyBytes,
        { name: 'Ed25519' },
        false,
        ['verify']
      );

      const valid = await crypto.subtle.verify(
        'Ed25519',
        publicKey,
        signatureBytes,
        messageBytes
      );

      if (!valid) {
        return Response.json({ error: 'Invalid signature' }, { status: 403 });
      }
    } catch (sigError) {
      console.error('Signature verification error:', sigError);
      return Response.json({ error: 'Signature verification failed' }, { status: 403 });
    }

    // 6. All checks passed - unregister agent
    await base44.asServiceRole.entities.Agent.delete(agent.id);

    // 7. Mark token as used
    await base44.asServiceRole.entities.AgentUnregisterToken.update(token.id, {
      status: 'used'
    });

    return Response.json({ success: true });
  } catch (error) {
    console.error('Unregister agent error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});