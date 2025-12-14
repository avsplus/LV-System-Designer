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
    
    // Generate registration token
    const token = crypto.randomUUID();
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
    const wsProtocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
    
    return Response.json({
      reg_token: token,
      org_id: user.organization_id,
      backend_url: baseUrl,
      websocket_url: `${wsProtocol}//${url.host}/agent/ws`,
      org_public_key: orgPublicKey,
      expires_at: expiresAt.toISOString()
    });
  } catch (error) {
    console.error('Create registration token error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});