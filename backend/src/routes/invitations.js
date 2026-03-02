import { requireAuth } from '../lib/auth.js';
import { supabaseAdmin } from '../lib/supabase.js';
import { resolveTableName } from '../lib/tableResolver.js';
import { config } from '../config.js';
import { sendEmail } from '../lib/email.js';

const normalizeEmail = (value) => (value || '').trim().toLowerCase();

const canSendInvites = (role) => ['owner', 'administrator'].includes(role);

const buildInviteUrl = ({ organizationId, role }) => {
  const url = new URL('/noorganization', config.appBaseUrl);
  url.searchParams.set('org', organizationId);
  url.searchParams.set('role', role || 'viewer');
  return url.toString();
};

const inviteEmailHtml = ({ inviterName, organizationName, role, inviteUrl }) => `
  <div style="font-family:Arial,sans-serif;line-height:1.5;color:#111">
    <h2>You are invited to join ${organizationName}</h2>
    <p><strong>${inviterName}</strong> invited you as <strong>${role}</strong>.</p>
    <p>
      <a href="${inviteUrl}" style="display:inline-block;padding:10px 16px;background:#2563eb;color:#fff;text-decoration:none;border-radius:6px;">
        Accept Invitation
      </a>
    </p>
    <p>If the button does not work, open this link:</p>
    <p><a href="${inviteUrl}">${inviteUrl}</a></p>
  </div>
`;

export default async function invitationRoutes(fastify) {
  fastify.post('/invitations/send', async (request, reply) => {
    const auth = await requireAuth(request, reply);
    if (!auth) {
      return;
    }

    if (!canSendInvites(auth.user.organization_role)) {
      return reply.code(403).send({ error: 'Only owners and administrators can send invites' });
    }

    const payload = request.body || {};
    const email = normalizeEmail(payload.email);
    const organizationId = payload.organization_id || auth.user.organization_id;
    const role = payload.role || 'viewer';

    if (!email) {
      return reply.code(400).send({ error: 'Invite email is required' });
    }
    if (!organizationId) {
      return reply.code(400).send({ error: 'organization_id is required' });
    }
    if (!config.resendApiKey) {
      return reply.code(400).send({ error: 'Email provider not configured: missing RESEND_API_KEY' });
    }
    if (organizationId !== auth.user.organization_id) {
      return reply.code(403).send({ error: 'Forbidden' });
    }

    const organizationsTable = await resolveTableName(supabaseAdmin, 'organizations', [
      'organizations',
      'organization',
      'Organization'
    ]);
    const pendingInvitesTable = await resolveTableName(supabaseAdmin, 'pending_invites', [
      'pending_invites',
      'pending_invite',
      'PendingInvite'
    ]);

    const { data: org, error: orgError } = await supabaseAdmin
      .from(organizationsTable)
      .select('id,name')
      .eq('id', organizationId)
      .maybeSingle();

    if (orgError) {
      return reply.code(500).send({ error: `Failed to load organization: ${orgError.message}` });
    }
    if (!org) {
      return reply.code(404).send({ error: 'Organization not found' });
    }

    const { data: existingInvites, error: existingError } = await supabaseAdmin
      .from(pendingInvitesTable)
      .select('id')
      .eq('organization_id', organizationId)
      .eq('email', email)
      .eq('status', 'pending')
      .limit(1);

    if (existingError) {
      return reply.code(500).send({ error: `Failed to check existing invites: ${existingError.message}` });
    }

    if ((existingInvites || []).length > 0) {
      const { error: updateError } = await supabaseAdmin
        .from(pendingInvitesTable)
        .update({ organization_role: role, status: 'pending' })
        .eq('id', existingInvites[0].id);
      if (updateError) {
        return reply.code(500).send({ error: `Failed to update invite: ${updateError.message}` });
      }
    } else {
      const { error: insertError } = await supabaseAdmin
        .from(pendingInvitesTable)
        .insert({
          email,
          organization_id: organizationId,
          organization_role: role,
          status: 'pending'
        });
      if (insertError) {
        return reply.code(500).send({ error: `Failed to create invite: ${insertError.message}` });
      }
    }

    const inviteUrl = buildInviteUrl({ organizationId, role });
    const inviterName = auth.user.full_name || auth.user.email || 'A teammate';
    const organizationName = org.name || 'your organization';

    try {
      await sendEmail({
        to: email,
        subject: `${inviterName} invited you to join ${organizationName}`,
        html: inviteEmailHtml({ inviterName, organizationName, role, inviteUrl }),
        text: `${inviterName} invited you to join ${organizationName} as ${role}. Open: ${inviteUrl}`
      });
    } catch (error) {
      fastify.log.error(error);
      return reply.code(502).send({
        error: `Failed to send invite email: ${error.message}`
      });
    }

    return { success: true };
  });
}
