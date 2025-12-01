import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Collect all user data
    const exportData = {
      exportDate: new Date().toISOString(),
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        display_name: user.display_name,
        organization_id: user.organization_id,
        organization_role: user.organization_role,
        created_date: user.created_date
      },
      projects: [],
      devices: [],
      activities: [],
      wirePricing: [],
      pdfExports: []
    };

    // Get user's projects
    const ownProjects = await base44.entities.AVProject.filter({ owner_email: user.email });
    exportData.projects = ownProjects.map(p => ({
      id: p.id,
      name: p.name,
      description: p.description,
      rooms: p.rooms,
      canvas_products: p.canvas_products,
      connections: p.connections,
      shared_with: p.shared_with,
      created_date: p.created_date,
      updated_date: p.updated_date
    }));

    // Get organization data if user has one
    if (user.organization_id) {
      // Get devices in organization
      const devices = await base44.entities.AVProduct.filter({ organization_id: user.organization_id });
      exportData.devices = devices;

      // Get wire pricing
      const wirePricing = await base44.entities.WirePricing.filter({ organization_id: user.organization_id });
      exportData.wirePricing = wirePricing;

      // Get user's activities
      const activities = await base44.entities.Activity.filter({ user_email: user.email });
      exportData.activities = activities.slice(0, 100); // Limit to last 100

      // Get PDF exports
      const pdfExports = await base44.entities.PdfExport.filter({ exported_by: user.email });
      exportData.pdfExports = pdfExports;
    }

    // Return as downloadable JSON
    const jsonData = JSON.stringify(exportData, null, 2);
    
    return new Response(jsonData, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="av-system-design-export-${user.email.replace('@', '-at-')}-${new Date().toISOString().split('T')[0]}.json"`
      }
    });

  } catch (error) {
    console.error('Export error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});