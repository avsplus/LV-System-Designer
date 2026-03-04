import { requireAuth } from '../lib/auth.js';
import { supabaseAdmin } from '../lib/supabase.js';

const canMutateWirePricing = (role) => ['owner', 'administrator'].includes(role);

const normalizeCreatePayload = (payload = {}, organizationId = null) => {
  const normalized = {
    wire_type: payload.wire_type || '',
    wire_spec: payload.wire_spec || null,
    material_price_per_foot: payload.material_price_per_foot ?? 0,
    labor_price_per_run: payload.labor_price_per_run ?? 0,
    termination_price: payload.termination_price ?? 0
  };

  if (organizationId !== undefined) {
    normalized.organization_id = organizationId;
  }

  return normalized;
};

const normalizeUpdatePayload = (payload = {}) => {
  const normalized = {};

  if (Object.prototype.hasOwnProperty.call(payload, 'wire_type')) {
    normalized.wire_type = payload.wire_type || '';
  }
  if (Object.prototype.hasOwnProperty.call(payload, 'wire_spec')) {
    normalized.wire_spec = payload.wire_spec || null;
  }
  if (Object.prototype.hasOwnProperty.call(payload, 'material_price_per_foot')) {
    normalized.material_price_per_foot = payload.material_price_per_foot ?? 0;
  }
  if (Object.prototype.hasOwnProperty.call(payload, 'labor_price_per_run')) {
    normalized.labor_price_per_run = payload.labor_price_per_run ?? 0;
  }
  if (Object.prototype.hasOwnProperty.call(payload, 'termination_price')) {
    normalized.termination_price = payload.termination_price ?? 0;
  }

  return normalized;
};

export default async function wirePricingRoutes(fastify) {
  fastify.get('/wire-pricing', async (request, reply) => {
    const auth = await requireAuth(request, reply);
    if (!auth) {
      return;
    }

    const organizationId = auth.user.organization_id;
    if (!organizationId) {
      return { wire_pricing: [] };
    }

    const { data, error } = await supabaseAdmin
      .from('wire_pricing')
      .select('*')
      .eq('organization_id', organizationId)
      .order('wire_type', { ascending: true })
      .order('wire_spec', { ascending: true, nullsFirst: true });

    if (error) {
      return reply.code(500).send({ error: `Failed to load wire pricing: ${error.message}` });
    }

    return { wire_pricing: data || [] };
  });

  fastify.post('/wire-pricing', async (request, reply) => {
    const auth = await requireAuth(request, reply);
    if (!auth) {
      return;
    }

    if (!canMutateWirePricing(auth.user.organization_role)) {
      return reply.code(403).send({ error: 'Only owners and administrators can create wire pricing' });
    }

    if (!auth.user.organization_id) {
      return reply.code(400).send({ error: 'User must belong to an organization' });
    }

    const payload = normalizeCreatePayload(request.body || {}, auth.user.organization_id);
    if (!payload.wire_type) {
      return reply.code(400).send({ error: 'wire_type is required' });
    }

    const { data, error } = await supabaseAdmin
      .from('wire_pricing')
      .insert(payload)
      .select('*')
      .single();

    if (error) {
      return reply.code(500).send({ error: `Failed to create wire pricing: ${error.message}` });
    }

    return { wire_pricing: data };
  });

  fastify.patch('/wire-pricing/:id', async (request, reply) => {
    const auth = await requireAuth(request, reply);
    if (!auth) {
      return;
    }

    if (!canMutateWirePricing(auth.user.organization_role)) {
      return reply.code(403).send({ error: 'Only owners and administrators can update wire pricing' });
    }

    const { data: existing, error: findError } = await supabaseAdmin
      .from('wire_pricing')
      .select('id,organization_id')
      .eq('id', request.params.id)
      .maybeSingle();

    if (findError) {
      return reply.code(500).send({ error: `Failed to load wire pricing: ${findError.message}` });
    }
    if (!existing) {
      return reply.code(404).send({ error: 'Wire pricing entry not found' });
    }
    if (!existing.organization_id || existing.organization_id !== auth.user.organization_id) {
      return reply.code(403).send({ error: 'You can only update your organization wire pricing' });
    }

    const updates = normalizeUpdatePayload(request.body || {});
    if (!Object.keys(updates).length) {
      return reply.code(400).send({ error: 'No fields provided for update' });
    }

    const { data, error } = await supabaseAdmin
      .from('wire_pricing')
      .update(updates)
      .eq('id', existing.id)
      .select('*')
      .single();

    if (error) {
      return reply.code(500).send({ error: `Failed to update wire pricing: ${error.message}` });
    }

    return { wire_pricing: data };
  });

  fastify.delete('/wire-pricing/:id', async (request, reply) => {
    const auth = await requireAuth(request, reply);
    if (!auth) {
      return;
    }

    if (!canMutateWirePricing(auth.user.organization_role)) {
      return reply.code(403).send({ error: 'Only owners and administrators can delete wire pricing' });
    }

    const { data: existing, error: findError } = await supabaseAdmin
      .from('wire_pricing')
      .select('id,organization_id')
      .eq('id', request.params.id)
      .maybeSingle();

    if (findError) {
      return reply.code(500).send({ error: `Failed to load wire pricing: ${findError.message}` });
    }
    if (!existing) {
      return reply.code(404).send({ error: 'Wire pricing entry not found' });
    }
    if (!existing.organization_id || existing.organization_id !== auth.user.organization_id) {
      return reply.code(403).send({ error: 'You can only delete your organization wire pricing' });
    }

    const { error } = await supabaseAdmin.from('wire_pricing').delete().eq('id', existing.id);
    if (error) {
      return reply.code(500).send({ error: `Failed to delete wire pricing: ${error.message}` });
    }

    return { success: true };
  });
}
