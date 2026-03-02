import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { token } = await req.json();
    
    if (!token) {
      return Response.json({ error: 'Token required' }, { status: 400 });
    }

    // Check token status using service role
    const tokens = await base44.asServiceRole.entities.RegistrationToken.filter({ 
      token: token 
    });

    if (tokens.length === 0) {
      return Response.json({ status: 'not_found' });
    }

    const regToken = tokens[0];
    
    return Response.json({
      status: regToken.status,
      used_by_agent_id: regToken.used_by_agent_id
    });
  } catch (error) {
    console.error('Check registration status error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});