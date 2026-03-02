import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { email, role, organizationId, inviteUrl } = await req.json();

    if (!email || !organizationId) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Get organization name
    const orgs = await base44.entities.Organization.filter({ id: organizationId });
    const orgName = orgs[0]?.name || 'AV System Design';

    const roleLabels = {
      owner: 'Owner',
      administrator: 'Administrator', 
      designer: 'Designer',
      viewer: 'Viewer'
    };

    const emailBody = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #0a0a0f; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0a0a0f; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #111827; border-radius: 16px; border: 1px solid #1f2937;">
          <tr>
            <td style="padding: 40px;">
              <!-- Header -->
              <div style="text-align: center; margin-bottom: 32px;">
                <div style="width: 64px; height: 64px; background: linear-gradient(135deg, #3b82f6, #8b5cf6); border-radius: 16px; margin: 0 auto 16px; display: flex; align-items: center; justify-content: center;">
                  <span style="font-size: 28px;">🎛️</span>
                </div>
                <h1 style="color: #ffffff; font-size: 24px; margin: 0;">You're Invited!</h1>
              </div>
              
              <!-- Content -->
              <div style="color: #9ca3af; font-size: 16px; line-height: 1.6; margin-bottom: 32px;">
                <p style="margin: 0 0 16px;">Hi there,</p>
                <p style="margin: 0 0 16px;">
                  <strong style="color: #ffffff;">${user.full_name || user.email}</strong> has invited you to join 
                  <strong style="color: #3b82f6;">${orgName}</strong> on AV System Design as a 
                  <strong style="color: #8b5cf6;">${roleLabels[role] || 'team member'}</strong>.
                </p>
                <p style="margin: 0;">
                  AV System Design is a professional tool for designing and documenting audio-visual systems.
                </p>
              </div>
              
              <!-- CTA Button -->
              <div style="text-align: center; margin-bottom: 32px;">
                <a href="${inviteUrl}" style="display: inline-block; background: linear-gradient(135deg, #3b82f6, #2563eb); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
                  Accept Invitation
                </a>
              </div>
              
              <!-- Link fallback -->
              <div style="background-color: #1f2937; border-radius: 8px; padding: 16px; margin-bottom: 32px;">
                <p style="color: #6b7280; font-size: 12px; margin: 0 0 8px;">Or copy and paste this link:</p>
                <p style="color: #9ca3af; font-size: 12px; margin: 0; word-break: break-all;">${inviteUrl}</p>
              </div>
              
              <!-- Footer -->
              <div style="border-top: 1px solid #1f2937; padding-top: 24px; text-align: center;">
                <p style="color: #6b7280; font-size: 12px; margin: 0;">
                  This invitation will expire in 7 days.<br>
                  If you didn't expect this invitation, you can safely ignore this email.
                </p>
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `.trim();

    await base44.integrations.Core.SendEmail({
      to: email,
      subject: `${user.full_name || 'Someone'} invited you to join ${orgName}`,
      body: emailBody
    });

    return Response.json({ success: true });

  } catch (error) {
    console.error('Send invite email error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});