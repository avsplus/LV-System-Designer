import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Authenticate user
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Check if user is admin
    if (user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }
    
    // Get user's organization
    const orgs = await base44.entities.Organization.filter({ id: user.organization_id });
    if (orgs.length === 0) {
      return Response.json({ error: 'Organization not found' }, { status: 404 });
    }
    
    const org = orgs[0];
    
    // Generate org signing keypair if not exists
    let orgPublicKey = org.org_signing_public_key;
    let orgPrivateKey = org.org_signing_private_key;
    
    if (!orgPublicKey || !orgPrivateKey) {
      // Generate Ed25519 keypair for organization
      const keypair = await crypto.subtle.generateKey(
        { name: "Ed25519" },
        true,
        ["sign", "verify"]
      );
      
      const publicKeyBytes = await crypto.subtle.exportKey("raw", keypair.publicKey);
      const privateKeyBytes = await crypto.subtle.exportKey("pkcs8", keypair.privateKey);
      
      orgPublicKey = btoa(String.fromCharCode(...new Uint8Array(publicKeyBytes)));
      orgPrivateKey = btoa(String.fromCharCode(...new Uint8Array(privateKeyBytes)));
      
      // Store keypair in organization
      await base44.asServiceRole.entities.Organization.update(org.id, {
        org_signing_public_key: orgPublicKey,
        org_signing_private_key: orgPrivateKey
      });
    }
    
    // Generate short registration code (e.g., REG-A7X9-K2M4)
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Removed ambiguous chars
    const generateCode = () => {
      const segments = [];
      for (let i = 0; i < 3; i++) {
        let segment = '';
        for (let j = 0; j < 4; j++) {
          segment += chars[Math.floor(Math.random() * chars.length)];
        }
        segments.push(segment);
      }
      return `REG-${segments.join('-')}`;
    };
    
    const token = generateCode();
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
    
    await base44.asServiceRole.entities.RegistrationToken.create({
      organization_id: user.organization_id,
      token,
      status: 'active',
      expires_at: expiresAt.toISOString(),
      created_by: user.email
    });
    
    // Return registration package
    const url = new URL(req.url);
    const baseUrl = `${url.protocol}//${url.host}`;
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');

    // Extract Supabase project ref from URL (e.g., qtrypzzcjebvfcihiynt from https://qtrypzzcjebvfcihiynt.supabase.co)
    const supabaseHost = new URL(supabaseUrl).host;
    const supabaseRealtimeUrl = `wss://${supabaseHost}/realtime/v1/websocket`;

    return Response.json({
      reg_token: token,
      org_id: user.organization_id,
      backend_url: baseUrl,
      supabase_realtime_url: supabaseRealtimeUrl,
      supabase_anon_key: supabaseAnonKey,
      agent_event_post_url: `${baseUrl}/functions/agentPostEvent`,
      org_public_key: orgPublicKey,
      expires_at: expiresAt.toISOString()
    });
  } catch (error) {
    console.error('Create registration token error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});