import { createClient } from 'npm:@supabase/supabase-js@2.39.0';

Deno.serve(async (req) => {
  try {
    const { code } = await req.json();
    
    if (!code) {
      return Response.json({ error: 'Registration code required' }, { status: 400 });
    }
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_KEY');
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Look up registration token
    const { data: regToken, error: tokenError } = await supabase
      .from('registration_tokens')
      .select('*')
      .eq('token', code)
      .eq('status', 'active')
      .single();
    
    if (tokenError || !regToken) {
      return Response.json({ error: 'Invalid or expired registration code' }, { status: 404 });
    }
    
    // Check expiration
    if (new Date(regToken.expires_at) < new Date()) {
      await supabase
        .from('registration_tokens')
        .update({ status: 'expired' })
        .eq('id', regToken.id);
      return Response.json({ error: 'Registration code has expired' }, { status: 410 });
    }
    
    // Get organization details from Base44 (without auth since this is called by external agent)
    const baseUrl = new URL(req.url);
    const base44Url = `${baseUrl.protocol}//${baseUrl.host}`;
    const appId = Deno.env.get('BASE44_APP_ID');

    const orgResponse = await fetch(`${base44Url}/api/data/Organization/${regToken.organization_id}`, {
      headers: {
        'Base44-App-Id': appId
      }
    });

    if (!orgResponse.ok) {
      return Response.json({ error: 'Organization not found' }, { status: 404 });
    }

    const org = await orgResponse.json();
    
    // Build full configuration
    const url = new URL(req.url);
    const baseUrl = `${url.protocol}//${url.host}`;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');

    // Extract Supabase project ref from URL
    const supabaseHost = new URL(supabaseUrl).host;
    const supabaseRealtimeUrl = `wss://${supabaseHost}/realtime/v1/websocket`;

    return Response.json({
      reg_token: code,
      org_id: regToken.organization_id,
      backend_url: baseUrl,
      register_agent_url: `${baseUrl}/functions/registerAgent`,
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