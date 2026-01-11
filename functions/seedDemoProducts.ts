import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

const categories = [
  'televisions', 'projectors', 'projector_screens', 'video_distribution',
  'matrix_switchers', 'audio_streamers', 'media_streamers', 'speakers',
  'soundbars', 'subwoofers', 'stereo_amps', 'multizone_amps',
  'surround_processors', 'av_receivers', 'network_switches', 'control_processors',
  'hdmi_extenders', 'routers', 'access_points', 'patch_panels', 'data_jacks',
  'telephones', 'phone_jacks', 'intercoms', 'nvrs', 'ip_cameras'
];

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get organization_id from user
    const organizationId = user.organization_id;

    if (!organizationId) {
      return Response.json({ error: 'No organization found' }, { status: 400 });
    }

    const created = [];
    const existing = [];

    for (const category of categories) {
      // Check if demo product already exists by brand name pattern
      const capitalizedName = category.replace(/_/g, ' ')
        .split(' ')
        .map(w => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ');
      
      const existingProducts = await base44.asServiceRole.entities.AVProduct.filter({
        brand: `Demo ${capitalizedName}`,
        category: category,
        organization_id: organizationId
      });

      if (existingProducts.length > 0) {
        existing.push(category);
        continue;
      }

      // Create demo product
      const capitalizedName = category.replace(/_/g, ' ')
        .split(' ')
        .map(w => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ');

      await base44.asServiceRole.entities.AVProduct.create({
        organization_id: organizationId,
        brand: `Demo ${capitalizedName}`,
        model: 'Demonstration Unit',
        category: category,
        description: 'Demo product for demonstration purposes',
        price: 0
      });

      created.push(category);
    }

    return Response.json({
      success: true,
      created: created.length,
      existing: existing.length,
      categories: { created, existing }
    });
  } catch (error) {
    return Response.json({ 
      error: error.message,
      stack: error.stack 
    }, { status: 500 });
  }
});