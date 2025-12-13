import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const orgs = await base44.asServiceRole.entities.Organization.filter({ id: user.organization_id });
    const org = orgs[0];

    return Response.json({ 
      url: org?.agent_installer_url || null 
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});