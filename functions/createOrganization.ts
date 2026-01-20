import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { name } = await req.json();

    if (!name || !name.trim()) {
      return Response.json({ 
        success: false, 
        error: 'Organization name is required' 
      }, { status: 400 });
    }

    // Check for duplicate organization name
    const existing = await base44.asServiceRole.entities.Organization.filter({
      name: name.trim()
    });

    if (existing && existing.length > 0) {
      return Response.json({ 
        success: false, 
        error: 'Organization name already exists' 
      }, { status: 400 });
    }

    // Generate Ed25519 key pair for signing
    const keyPair = await crypto.subtle.generateKey(
      {
        name: 'Ed25519',
        namedCurve: 'Ed25519',
      },
      true,
      ['sign', 'verify']
    );

    // Export keys to base64
    const privateKeyBuffer = await crypto.subtle.exportKey('pkcs8', keyPair.privateKey);
    const publicKeyBuffer = await crypto.subtle.exportKey('spki', keyPair.publicKey);
    
    const privateKeyBase64 = btoa(String.fromCharCode(...new Uint8Array(privateKeyBuffer)));
    const publicKeyBase64 = btoa(String.fromCharCode(...new Uint8Array(publicKeyBuffer)));

    // Create organization with signing keys
    const org = await base44.asServiceRole.entities.Organization.create({
      name: name.trim(),
      org_signing_private_key: privateKeyBase64,
      org_signing_public_key: publicKeyBase64
    });

    return Response.json({ 
      success: true, 
      organization: org 
    });
  } catch (error) {
    console.error('Organization creation error:', error);
    return Response.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
});