import { requireAuth } from '../lib/auth.js';
import { supabaseAdmin } from '../lib/supabase.js';

export default async function authRoutes(fastify) {
  fastify.get('/me', async (request, reply) => {
    const auth = await requireAuth(request, reply);
    if (!auth) {
      return;
    }

    return {
      user: auth.user
    };
  });

  fastify.patch('/me', async (request, reply) => {
    const auth = await requireAuth(request, reply);
    if (!auth) {
      return;
    }

    const payload = request.body || {};
    const updates = {};

    if (typeof payload.display_name === 'string') {
      updates.full_name = payload.display_name.trim();
    }
    if (typeof payload.full_name === 'string') {
      updates.full_name = payload.full_name.trim();
    }
    if (typeof payload.organization_id === 'string' || payload.organization_id === null) {
      updates.organization_id = payload.organization_id;
    }
    if (typeof payload.organization_role === 'string' || payload.organization_role === null) {
      updates.organization_role = payload.organization_role;
    }
    if (typeof payload.status === 'string') {
      updates.status = payload.status;
    }

    if (Object.keys(updates).length === 0) {
      return { user: auth.user };
    }

    const { error } = await supabaseAdmin
      .from('users')
      .upsert(
        {
          id: auth.user.id,
          email: auth.user.email,
          ...updates
        },
        { onConflict: 'id' }
      );

    if (error) {
      return reply.code(500).send({ error: `Failed to update user profile: ${error.message}` });
    }

    const { data: updated, error: fetchError } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', auth.user.id)
      .maybeSingle();

    if (fetchError) {
      return reply.code(500).send({ error: `Failed to load updated profile: ${fetchError.message}` });
    }

    return {
      user: {
        id: updated?.id || auth.user.id,
        email: updated?.email || auth.user.email,
        full_name: updated?.full_name || null,
        status: updated?.status || 'approved',
        organization_id: updated?.organization_id || null,
        organization_role: updated?.organization_role || null
      }
    };
  });
}
