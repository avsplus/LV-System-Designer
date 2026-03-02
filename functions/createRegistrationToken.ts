import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import { createClient } from 'npm:@supabase/supabase-js@2.39.0';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Allow app admins OR organization administrators/owners
    const hasPermission = user.role === 'admin' || 
                         user.organization_role === 'administrator' || 
                         user.organization_role === 'owner';
    
    if (!hasPermission) {
      return Response.json({ error: 'Administrator access required' }, { status: 403 });
    }

    const orgs = await base44.entities.Organization.filter({ id: user.organization_id });
    if (orgs.length === 0) {
      return Response.json({ error: 'Organization not found' }, { status: 404 });
    }

    const org = orgs[0];
    const defaultLogoUrl = 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/fusion-logo.png';

    // Generate or retrieve organization signing keys
    let orgPublicKey = org.org_signing_public_key;
    let orgPrivateKey = org.org_signing_private_key;

    if (!orgPublicKey || !orgPrivateKey) {
      const { subtle } = globalThis.crypto;
      const keyPair = await subtle.generateKey(
        { name: 'Ed25519' },
        true,
        ['sign', 'verify']
      );

      const publicKeyRaw = await subtle.exportKey('raw', keyPair.publicKey);
      const privateKeyRaw = await subtle.exportKey('pkcs8', keyPair.privateKey);

      orgPublicKey = btoa(String.fromCharCode(...new Uint8Array(publicKeyRaw)));
      orgPrivateKey = btoa(String.fromCharCode(...new Uint8Array(privateKeyRaw)));

      await base44.entities.Organization.update(org.id, {
        org_signing_public_key: orgPublicKey,
        org_signing_private_key: orgPrivateKey
      });
    }

    // Generate short token
    const token = Array.from({ length: 4 }, () =>
      Math.random().toString(36).substring(2, 6).toUpperCase()
    ).join('-');

    const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();

    // Store token in Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_KEY');
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { error: insertError } = await supabase
      .from('registration_tokens')
      .insert({
        organization_id: user.organization_id,
        organization_name: org.name,
        organization_logo_url: org.logo_url || defaultLogoUrl,
        org_signing_public_key: orgPublicKey,
        token,
        status: 'active',
        expires_at: expiresAt,
        created_by: user.email
      });

    if (insertError) {
      console.error('Insert token error:', insertError);
      return Response.json({ error: 'Failed to create token' }, { status: 500 });
    }

    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
    const supabaseHost = new URL(supabaseUrl).host;
    const supabaseRealtimeUrl = `wss://${supabaseHost}/realtime/v1/websocket`;

    // Use Supabase Edge Functions (no auth required)
    const supabaseFunctionsUrl = `${supabaseUrl}/functions/v1`;

    return Response.json({
      reg_token: token,
      org_id: user.organization_id,
      org_name: org.name,
      org_logo_url: org.logo_url || defaultLogoUrl,
      backend_url: supabaseFunctionsUrl,
      register_agent_url: `${supabaseFunctionsUrl}/register-agent`,
      supabase_realtime_url: supabaseRealtimeUrl,
      supabase_anon_key: supabaseAnonKey,
      agent_event_post_url: `${supabaseFunctionsUrl}/agent-post-event`,
      org_public_key: orgPublicKey,
      expires_at: expiresAt
    });
  } catch (error) {
    console.error('Create registration token error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});