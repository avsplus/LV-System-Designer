import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const { reg_token, agent_id, agent_public_key, machine_info } = await req.json();
    
    if (!reg_token || !agent_id || !agent_public_key) {
      return Response.json({ 
        error: 'Missing required fields: reg_token, agent_id, agent_public_key' 
      }, { status: 400 });
    }
    
    // Validate registration token
    const tokens = await base44.asServiceRole.entities.RegistrationToken.filter({ 
      token: reg_token,
      status: 'active'
    });
    
    if (tokens.length === 0) {
      return Response.json({ error: 'Invalid or expired registration token' }, { status: 401 });
    }
    
    const token = tokens[0];
    
    // Check token expiration
    if (new Date(token.expires_at) < new Date()) {
      await base44.asServiceRole.entities.RegistrationToken.update(token.id, { status: 'expired' });
      return Response.json({ error: 'Registration token expired' }, { status: 401 });
    }
    
    // Check if agent already registered
    const existingAgents = await base44.asServiceRole.entities.Agent.filter({ agent_id });
    if (existingAgents.length > 0) {
      return Response.json({ 
        error: 'Agent already registered. Unregister first to move to another org.' 
      }, { status: 409 });
    }
    
    // Get organization
    const orgs = await base44.asServiceRole.entities.Organization.filter({ id: token.organization_id });
    if (orgs.length === 0) {
      return Response.json({ error: 'Organization not found' }, { status: 404 });
    }
    
    const org = orgs[0];
    
    // Register agent
    await base44.asServiceRole.entities.Agent.create({
      organization_id: token.organization_id,
      agent_id,
      agent_public_key,
      name: machine_info?.hostname || `Agent ${agent_id.substring(0, 8)}`,
      status: 'registered',
      capabilities: machine_info?.capabilities || ['scan'],
      location: machine_info?.location || ''
    });
    
    // Mark token as used
    await base44.asServiceRole.entities.RegistrationToken.update(token.id, {
      status: 'used',
      used_by_agent_id: agent_id
    });
    
    return Response.json({
      success: true,
      org_id: token.organization_id,
      org_public_key: org.org_signing_public_key,
      base44_app_id: Deno.env.get('BASE44_APP_ID'),
      base44_service_token: Deno.env.get('BASE44_SERVICE_ROLE_KEY'),
      message: 'Agent registered successfully'
    });
  } catch (error) {
    console.error('Register agent error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});