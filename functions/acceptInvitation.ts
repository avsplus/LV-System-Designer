import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { organization_id, role } = await req.json();

    if (!organization_id) {
      return Response.json({ error: 'Organization ID is required' }, { status: 400 });
    }

    // Verify the organization exists
    const orgs = await base44.asServiceRole.entities.Organization.filter({ id: organization_id });
    if (!orgs || orgs.length === 0) {
      return Response.json({ error: 'Organization not found' }, { status: 404 });
    }

    // Check if user already belongs to an organization
    if (user.organization_id) {
      return Response.json({ 
        error: 'User already belongs to an organization',
        current_organization_id: user.organization_id 
      }, { status: 400 });
    }

    // Assign organization and role to user using service role
    const validRoles = ['owner', 'admin', 'designer', 'viewer'];
    const assignedRole = validRoles.includes(role) ? role : 'viewer';

    await base44.asServiceRole.entities.User.update(user.id, {
      organization_id: organization_id,
      app_role: assignedRole
    });

    return Response.json({ 
      success: true, 
      message: 'Successfully joined organization',
      organization_id: organization_id,
      role: assignedRole
    });

  } catch (error) {
    console.error('Accept invitation error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});