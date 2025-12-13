import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import { createClient } from 'npm:@supabase/supabase-js@2.39.3';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized - App owner access required' }, { status: 403 });
    }

    const formData = await req.formData();
    const file = formData.get('file');
    
    if (!file) {
      return Response.json({ error: 'No file provided' }, { status: 400 });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL'),
      Deno.env.get('SUPABASE_SERVICE_KEY')
    );

    const fileName = `agent-installer/netmap-agent-setup.exe`;
    const fileBuffer = await file.arrayBuffer();

    const { data, error } = await supabase.storage
      .from(Deno.env.get('SUPABASE_BUCKET'))
      .upload(fileName, fileBuffer, {
        contentType: 'application/octet-stream',
        upsert: true
      });

    if (error) {
      return Response.json({ error: error.message }, { status: 500 });
    }

    const { data: urlData } = supabase.storage
      .from(Deno.env.get('SUPABASE_BUCKET'))
      .getPublicUrl(fileName);

    // Store URL in organization
    const orgs = await base44.asServiceRole.entities.Organization.filter({ id: user.organization_id });
    if (orgs[0]) {
      await base44.asServiceRole.entities.Organization.update(orgs[0].id, {
        agent_installer_url: urlData.publicUrl
      });
    }

    return Response.json({ 
      success: true, 
      url: urlData.publicUrl 
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});