import { requireAuth } from '../lib/auth.js';
import { supabaseAdmin } from '../lib/supabase.js';
import { resolveTableName } from '../lib/tableResolver.js';

const queryPendingInvites = async (email) => {
  const pendingInvitesTable = await resolveTableName(supabaseAdmin, 'pending_invites', [
    'pending_invites',
    'pending_invite',
    'PendingInvite'
  ]);

  const normalized = (email || '').toLowerCase();
  if (!normalized) {
    return [];
  }

  const { data, error } = await supabaseAdmin
    .from(pendingInvitesTable)
    .select('*')
    .eq('status', 'pending')
    .eq('email', normalized);

  if (error) {
    throw new Error(`Failed to query pending invites: ${error.message}`);
  }

  return data || [];
};

export default async function organizationRoutes(fastify) {
  fastify.get('/organizations/current', async (request, reply) => {
    const auth = await requireAuth(request, reply);
    if (!auth) {
      return;
    }

    if (!auth.user.organization_id) {
      return { organization: null };
    }

    const organizationsTable = await resolveTableName(supabaseAdmin, 'organizations', [
      'organizations',
      'organization',
      'Organization'
    ]);

    const { data, error } = await supabaseAdmin
      .from(organizationsTable)
      .select('*')
      .eq('id', auth.user.organization_id)
      .maybeSingle();

    if (error) {
      return reply.code(500).send({ error: `Failed to load organization: ${error.message}` });
    }

    return { organization: data || null };
  });

  fastify.get('/bootstrap', async (request, reply) => {
    const auth = await requireAuth(request, reply);
    if (!auth) {
      return;
    }

    const organizationsTable = await resolveTableName(supabaseAdmin, 'organizations', [
      'organizations',
      'organization',
      'Organization'
    ]);

    let organization = null;
    if (auth.user.organization_id) {
      const orgResult = await supabaseAdmin
        .from(organizationsTable)
        .select('*')
        .eq('id', auth.user.organization_id)
        .maybeSingle();
      if (orgResult.error) {
        return reply.code(500).send({ error: `Failed to load organization: ${orgResult.error.message}` });
      }
      organization = orgResult.data || null;
    }

    const { data: orgRows, error: orgCountError } = await supabaseAdmin
      .from(organizationsTable)
      .select('id')
      .limit(1);

    if (orgCountError) {
      return reply.code(500).send({ error: `Failed to query organizations: ${orgCountError.message}` });
    }

    const pendingInvites = await queryPendingInvites(auth.user.email);

    return {
      user: auth.user,
      organization,
      has_any_organization: (orgRows || []).length > 0,
      pending_invite: pendingInvites[0] || null
    };
  });
}
