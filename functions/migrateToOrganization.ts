import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only owners can migrate data
    if (user.app_role !== 'owner') {
      return Response.json({ error: 'Only organization owners can migrate data' }, { status: 403 });
    }

    const organizationId = user.organization_id;
    if (!organizationId) {
      return Response.json({ error: 'User must belong to an organization' }, { status: 400 });
    }

    const stats = {
      users: 0,
      projects: 0,
      products: 0,
      wirePricing: 0,
      activities: 0
    };

    // Migrate users without organization_id
    const users = await base44.asServiceRole.entities.User.filter({});
    for (const u of users) {
      if (!u.organization_id) {
        await base44.asServiceRole.entities.User.update(u.id, { 
          organization_id: organizationId,
          app_role: u.app_role || 'viewer'
        });
        stats.users++;
      }
    }

    // Migrate projects without organization_id
    const projects = await base44.asServiceRole.entities.AVProject.filter({});
    for (const project of projects) {
      if (!project.organization_id) {
        await base44.asServiceRole.entities.AVProject.update(project.id, { 
          organization_id: organizationId 
        });
        stats.projects++;
      }
    }

    // Migrate products without organization_id
    const products = await base44.asServiceRole.entities.AVProduct.filter({});
    for (const product of products) {
      if (!product.organization_id) {
        await base44.asServiceRole.entities.AVProduct.update(product.id, { 
          organization_id: organizationId 
        });
        stats.products++;
      }
    }

    // Migrate wire pricing without organization_id
    const wirePricing = await base44.asServiceRole.entities.WirePricing.filter({});
    for (const wp of wirePricing) {
      if (!wp.organization_id) {
        await base44.asServiceRole.entities.WirePricing.update(wp.id, { 
          organization_id: organizationId 
        });
        stats.wirePricing++;
      }
    }

    // Migrate activities without organization_id
    const activities = await base44.asServiceRole.entities.Activity.filter({});
    for (const activity of activities) {
      if (!activity.organization_id) {
        await base44.asServiceRole.entities.Activity.update(activity.id, { 
          organization_id: organizationId 
        });
        stats.activities++;
      }
    }

    return Response.json({ 
      success: true, 
      message: 'Migration completed',
      stats,
      organization_id: organizationId
    });

  } catch (error) {
    console.error('Migration error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});