import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { code } = await req.json();
    
    if (!code) {
      return Response.json({ error: 'Registration code required' }, { status: 400 });
    }
    
    // Look up registration token
    const tokens = await base44.asServiceRole.entities.RegistrationToken.filter({ 
      token: code,
      status: 'active'
    });
    
    if (tokens.length === 0) {
      return Response.json({ error: 'Invalid or expired registration code' }, { status: 404 });
    }
    
    const regToken = tokens[0];
    
    // Check expiration
    if (new Date(regToken.expires_at) < new Date()) {
      await base44.asServiceRole.entities.RegistrationToken.update(regToken.id, {
        status: 'expired'
      });
      return Response.json({ error: 'Registration code has expired' }, { status: 410 });
    }
    
    // Get organization details
    const orgs = await base44.asServiceRole.entities.Organization.filter({ 
      id: regToken.organization_id 
    });
    
    if (orgs.length === 0) {
      return Response.json({ error: 'Organization not found' }, { status: 404 });
    }
    
    const org = orgs[0];
    
    // Build full configuration
    const url = new URL(req.url);
    const baseUrl = `${url.protocol}//${url.host}`;
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');

    // Extract Supabase project ref from URL
    const supabaseHost = new URL(supabaseUrl).host;
    const supabaseRealtimeUrl = `wss://${supabaseHost}/realtime/v1/websocket`;

    return Response.json({
      reg_token: code,
      org_id: regToken.organization_id,
      backend_url: baseUrl,
      supabase_realtime_url: supabaseRealtimeUrl,
      supabase_anon_key: supabaseAnonKey,
      agent_event_post_url: `${baseUrl}/functions/agentPostEvent`,
      org_public_key: org.org_signing_public_key,
      expires_at: regToken.expires_at
    });
  } catch (error) {
    console.error('Exchange registration code error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});