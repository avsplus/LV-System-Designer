import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only owners and administrators can view all users
    const canViewUsers = user.organization_role === 'owner' || 
                         user.organization_role === 'administrator' ||
                         user.role === 'admin';
    
    if (!canViewUsers) {
      return Response.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const organizationId = user.organization_id;
    if (!organizationId) {
      return Response.json({ error: 'User must belong to an organization' }, { status: 400 });
    }

    // Use service role to fetch all users in the organization
    const users = await base44.asServiceRole.entities.User.filter({ 
      organization_id: organizationId 
    });

    // Also fetch all projects in the organization to calculate per-user project counts
    const projects = await base44.asServiceRole.entities.AVProject.filter({
      organization_id: organizationId
    });

    // Calculate project counts per user
    const userProjectCounts = {};
    for (const project of projects) {
      // Count for owner
      if (project.owner_email) {
        userProjectCounts[project.owner_email] = (userProjectCounts[project.owner_email] || 0) + 1;
      }
      // Count for shared users
      if (project.shared_with && Array.isArray(project.shared_with)) {
        for (const email of project.shared_with) {
          userProjectCounts[email] = (userProjectCounts[email] || 0) + 1;
        }
      }
    }

    // Attach project counts to users
    const usersWithCounts = users.map(u => ({
      ...u,
      project_count: userProjectCounts[u.email] || 0
    }));

    return Response.json({ 
      users: usersWithCounts,
      totalProjects: projects.length
    });

  } catch (error) {
    console.error('Error fetching organization users:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});