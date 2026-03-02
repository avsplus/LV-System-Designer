import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Authenticate user
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Get user's organization
    const organizations = await base44.entities.Organization.filter({ 
      id: user.organization_id 
    });
    
    if (organizations.length === 0) {
      return Response.json({ error: 'Organization not found' }, { status: 404 });
    }
    
    // List agents for this organization
    const agents = await base44.entities.Agent.filter({ 
      organization_id: user.organization_id 
    });
    
    return Response.json(agents);
  } catch (error) {
    console.error('List agents error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});