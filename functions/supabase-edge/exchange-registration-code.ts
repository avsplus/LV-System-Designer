// Deploy this to Supabase Edge Functions: supabase functions deploy exchange-registration-code
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { code } = await req.json();
    
    if (!code) {
      return Response.json({ error: 'Registration code required' }, { 
        status: 400,
        headers: corsHeaders 
      });
    }
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Look up registration token
    const { data: regToken, error: tokenError } = await supabase
      .from('registration_tokens')
      .select('*')
      .eq('token', code)
      .eq('status', 'active')
      .single();
    
    if (tokenError || !regToken) {
      return Response.json({ error: 'Invalid or expired registration code' }, { 
        status: 404,
        headers: corsHeaders 
      });
    }
    
    // Check expiration
    if (new Date(regToken.expires_at) < new Date()) {
      await supabase
        .from('registration_tokens')
        .update({ status: 'expired' })
        .eq('id', regToken.id);
      return Response.json({ error: 'Registration code has expired' }, { 
        status: 410,
        headers: corsHeaders 
      });
    }
    
    const orgPublicKey = regToken.org_signing_public_key;
    const orgName = regToken.organization_name || 'Unknown Organization';

    if (!orgPublicKey) {
      return Response.json({ error: 'Invalid registration token configuration' }, { 
        status: 500,
        headers: corsHeaders 
      });
    }
    
    const url = new URL(req.url);
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseHost = new URL(supabaseUrl).host;
    const supabaseRealtimeUrl = `wss://${supabaseHost}/realtime/v1/websocket`;
    const functionsBaseUrl = `${url.protocol}//${url.host}`;

    return Response.json({
      reg_token: code,
      org_id: regToken.organization_id,
      org_name: orgName,
      backend_url: functionsBaseUrl,
      register_agent_url: `${functionsBaseUrl}/register-agent`,
      supabase_realtime_url: supabaseRealtimeUrl,
      supabase_anon_key: supabaseAnonKey,
      agent_event_post_url: `${functionsBaseUrl}/agent-post-event`,
      org_public_key: orgPublicKey,
      expires_at: regToken.expires_at
    }, {
      headers: corsHeaders
    });
  } catch (error) {
    console.error('Exchange registration code error:', error);
    return Response.json({ error: error.message }, { 
      status: 500,
      headers: corsHeaders
    });
  }
});