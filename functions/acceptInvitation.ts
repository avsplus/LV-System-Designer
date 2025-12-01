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

    // Check for pending invite for this user's email
    const pendingInvites = await base44.asServiceRole.entities.PendingInvite.filter({
      email: user.email,
      organization_id: organization_id,
      status: 'pending'
    });

    let assignedRole = role;
    
    // If there's a pending invite, use its role and mark ALL matching invites as accepted
    if (pendingInvites && pendingInvites.length > 0) {
      const invite = pendingInvites[0];
      assignedRole = invite.organization_role;
      
      // Mark ALL pending invites for this user as accepted (cleanup duplicates)
      for (const inv of pendingInvites) {
        await base44.asServiceRole.entities.PendingInvite.update(inv.id, {
          status: 'accepted'
        });
      }
    }

    // Validate role
    const validRoles = ['owner', 'administrator', 'designer', 'viewer'];
    if (!validRoles.includes(assignedRole)) {
      assignedRole = 'viewer';
    }

    await base44.asServiceRole.entities.User.update(user.id, {
      organization_id: organization_id,
      organization_role: assignedRole,
      status: 'pending'
    });

    return Response.json({ 
      success: true, 
      message: 'Successfully joined organization - awaiting approval',
      organization_id: organization_id,
      role: assignedRole,
      status: 'pending'
    });

  } catch (error) {
    console.error('Accept invitation error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});