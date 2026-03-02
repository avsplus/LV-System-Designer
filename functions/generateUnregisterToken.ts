import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { agent_id } = await req.json();

    // Generate short confirmation code
    const token = Array.from({ length: 3 }, () =>
      Math.random().toString(36).substring(2, 6).toUpperCase()
    ).join('-');

    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // 15 minutes

    // Store token
    await base44.asServiceRole.entities.AgentUnregisterToken.create({
      organization_id: user.organization_id,
      agent_id: agent_id || null,
      token,
      status: 'active',
      expires_at: expiresAt,
      created_by: user.email
    });

    return Response.json({
      token,
      expires_at: expiresAt,
      agent_id: agent_id || null
    });
  } catch (error) {
    console.error('Generate unregister token error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});