import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { confirmEmail } = await req.json();

    // Verify email confirmation matches
    if (confirmEmail?.toLowerCase() !== user.email.toLowerCase()) {
      return Response.json({ 
        error: 'Email confirmation does not match. Please type your email exactly.' 
      }, { status: 400 });
    }

    const deletionLog = {
      projects: 0,
      activities: 0,
      pdfExports: 0,
      pendingInvites: 0
    };

    // Delete user's projects
    const ownProjects = await base44.entities.AVProject.filter({ owner_email: user.email });
    for (const project of ownProjects) {
      await base44.entities.AVProject.delete(project.id);
      deletionLog.projects++;
    }

    // Delete user's activities
    const activities = await base44.entities.Activity.filter({ user_email: user.email });
    for (const activity of activities) {
      await base44.entities.Activity.delete(activity.id);
      deletionLog.activities++;
    }

    // Delete user's PDF exports
    const pdfExports = await base44.entities.PdfExport.filter({ exported_by: user.email });
    for (const exp of pdfExports) {
      await base44.entities.PdfExport.delete(exp.id);
      deletionLog.pdfExports++;
    }

    // Delete pending invites for this email
    const pendingInvites = await base44.entities.PendingInvite.filter({ email: user.email.toLowerCase() });
    for (const invite of pendingInvites) {
      await base44.entities.PendingInvite.delete(invite.id);
      deletionLog.pendingInvites++;
    }

    // Remove user from shared projects (just remove from shared_with, don't delete)
    if (user.organization_id) {
      const allProjects = await base44.entities.AVProject.filter({ organization_id: user.organization_id });
      for (const project of allProjects) {
        if (project.shared_with?.includes(user.email)) {
          const newSharedWith = project.shared_with.filter(e => e !== user.email);
          await base44.entities.AVProject.update(project.id, { shared_with: newSharedWith });
        }
      }
    }

    // Clear user data (can't delete user, but clear their org association)
    await base44.auth.updateMe({
      organization_id: null,
      organization_role: null,
      display_name: '[Deleted User]'
    });

    // Send confirmation email
    try {
      await base44.integrations.Core.SendEmail({
        to: user.email,
        subject: 'Account Deletion Confirmed - AV System Design',
        body: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin: 0; padding: 0; background-color: #0a0a0f; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0a0a0f; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #111827; border-radius: 16px; border: 1px solid #1f2937;">
          <tr>
            <td style="padding: 40px;">
              <h1 style="color: #ffffff; font-size: 24px; margin: 0 0 24px;">Account Deletion Complete</h1>
              <p style="color: #9ca3af; font-size: 16px; line-height: 1.6; margin: 0 0 16px;">
                Your account data has been deleted from AV System Design as requested.
              </p>
              <div style="background-color: #1f2937; border-radius: 8px; padding: 16px; margin: 24px 0;">
                <p style="color: #9ca3af; font-size: 14px; margin: 0;">Deleted:</p>
                <ul style="color: #ffffff; font-size: 14px; margin: 8px 0 0 0; padding-left: 20px;">
                  <li>${deletionLog.projects} projects</li>
                  <li>${deletionLog.activities} activity records</li>
                  <li>${deletionLog.pdfExports} export records</li>
                </ul>
              </div>
              <p style="color: #6b7280; font-size: 12px; margin: 0;">
                If you did not request this deletion, please contact support immediately.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
        `.trim()
      });
    } catch (emailError) {
      console.error('Failed to send deletion confirmation email:', emailError);
    }

    return Response.json({ 
      success: true, 
      message: 'Account data deleted successfully',
      deleted: deletionLog
    });

  } catch (error) {
    console.error('Account deletion error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});