import { requireAuth } from '../lib/auth.js';
import { supabaseAdmin } from '../lib/supabase.js';
import { resolveTableName } from '../lib/tableResolver.js';
import { seedDemoProductsForOrganization } from '../lib/demoProducts.js';

const encodeBase64 = (buffer) => Buffer.from(buffer).toString('base64');

const generateSigningKeys = async () => {
  const keyPair = await crypto.subtle.generateKey(
    {
      name: 'Ed25519',
      namedCurve: 'Ed25519'
    },
    true,
    ['sign', 'verify']
  );

  const privateKeyBuffer = await crypto.subtle.exportKey('pkcs8', keyPair.privateKey);
  const publicKeyBuffer = await crypto.subtle.exportKey('spki', keyPair.publicKey);

  return {
    privateKey: encodeBase64(privateKeyBuffer),
    publicKey: encodeBase64(publicKeyBuffer)
  };
};

const tryFindOrganizationByName = async (tableName, normalizedName) => {
  const nameColumns = ['name', 'organization_name', 'org_name'];
  let lastError = null;

  for (const column of nameColumns) {
    const existing = await supabaseAdmin
      .from(tableName)
      .select('id')
      .ilike(column, normalizedName)
      .limit(1);

    if (!existing.error) {
      return { rows: existing.data || [], nameColumn: column };
    }

    lastError = existing.error;
    const message = (existing.error.message || '').toLowerCase();
    if (!message.includes('column')) {
      throw new Error(`Failed to validate organization name: ${existing.error.message}`);
    }
  }

  throw new Error(`Failed to validate organization name: ${lastError?.message || 'unknown error'}`);
};

const tryCreateOrganization = async (tableName, normalizedName) => {
  const keys = await generateSigningKeys();

  const candidatePayloads = [
    {
      name: normalizedName,
      org_signing_private_key: keys.privateKey,
      org_signing_public_key: keys.publicKey
    },
    { name: normalizedName },
    { organization_name: normalizedName },
    { org_name: normalizedName }
  ];

  let lastError = null;
  for (const payload of candidatePayloads) {
    const result = await supabaseAdmin.from(tableName).insert(payload).select('*').single();
    if (!result.error) {
      return result.data;
    }

    lastError = result.error;
    const message = (result.error.message || '').toLowerCase();
    if (!message.includes('column')) {
      throw new Error(`Failed to create organization: ${result.error.message}`);
    }
  }

  throw new Error(`Failed to create organization: ${lastError?.message || 'unknown error'}`);
};

const tryAssignOrgOwner = async (tableName, user, organizationId) => {
  const candidatePayloads = [
    {
      id: user.id,
      email: user.email,
      organization_id: organizationId,
      organization_role: 'owner',
      status: 'approved'
    },
    {
      id: user.id,
      email: user.email,
      organization_id: organizationId
    },
    {
      id: user.id,
      email: user.email
    }
  ];

  let lastError = null;
  for (const payload of candidatePayloads) {
    const result = await supabaseAdmin.from(tableName).upsert(payload, { onConflict: 'id' });
    if (!result.error) {
      return;
    }

    lastError = result.error;
    const message = (result.error.message || '').toLowerCase();
    if (message.includes('no unique') || message.includes('on conflict')) {
      const updateResult = await supabaseAdmin.from(tableName).update(payload).eq('id', user.id);
      if (!updateResult.error) {
        return;
      }
      const insertResult = await supabaseAdmin.from(tableName).insert(payload);
      if (!insertResult.error) {
        return;
      }
      lastError = insertResult.error;
      continue;
    }
    if (!message.includes('column')) {
      throw new Error(`Organization created but failed to assign owner: ${result.error.message}`);
    }
  }

  throw new Error(
    `Organization created but failed to assign owner: ${lastError?.message || 'unknown error'}`
  );
};

export default async function onboardingRoutes(fastify) {
  fastify.post('/organizations', async (request, reply) => {
    const auth = await requireAuth(request, reply);
    if (!auth) {
      return;
    }

    const { name } = request.body || {};
    const normalizedName = (name || '').trim();
    if (!normalizedName) {
      return reply.code(400).send({ success: false, error: 'Organization name is required' });
    }

    const organizationsTable = await resolveTableName(supabaseAdmin, 'organizations', [
      'organizations',
      'organization',
      'Organization'
    ]);
    const usersTable = await resolveTableName(supabaseAdmin, 'users', ['users', 'user', 'User']);

    let rows;
    try {
      ({ rows } = await tryFindOrganizationByName(organizationsTable, normalizedName));
    } catch (error) {
      return reply.code(500).send({ success: false, error: error.message });
    }

    if ((rows || []).length > 0) {
      return reply.code(400).send({ success: false, error: 'Organization name already exists' });
    }

    let organization;
    try {
      organization = await tryCreateOrganization(organizationsTable, normalizedName);
    } catch (error) {
      return reply.code(500).send({ success: false, error: error.message });
    }

    try {
      await tryAssignOrgOwner(usersTable, auth.user, organization.id);
    } catch (error) {
      return reply.code(500).send({ success: false, error: error.message });
    }

    let demoSeed = null;
    try {
      const seeded = await seedDemoProductsForOrganization(organization.id);
      demoSeed = {
        created: seeded.created.length,
        existing: seeded.existing.length
      };
    } catch (error) {
      fastify.log.warn(
        { organizationId: organization.id, error: error.message },
        'Organization created but demo device seed failed'
      );
    }

    return {
      success: true,
      organization,
      demo_seed: demoSeed
    };
  });

  fastify.post('/invitations/accept', async (request, reply) => {
    const auth = await requireAuth(request, reply);
    if (!auth) {
      return;
    }

    const { organization_id, role } = request.body || {};
    if (!organization_id) {
      return reply.code(400).send({ error: 'Organization ID is required' });
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
    const usersTable = await resolveTableName(supabaseAdmin, 'users', ['users', 'user', 'User']);

    const orgResult = await supabaseAdmin
      .from(organizationsTable)
      .select('id')
      .eq('id', organization_id)
      .maybeSingle();

    if (orgResult.error) {
      return reply.code(500).send({ error: `Failed to query organization: ${orgResult.error.message}` });
    }
    if (!orgResult.data) {
      return reply.code(404).send({ error: 'Organization not found' });
    }

    if (auth.user.organization_id) {
      return reply.code(400).send({
        error: 'User already belongs to an organization',
        current_organization_id: auth.user.organization_id
      });
    }

    const normalizedEmail = (auth.user.email || '').toLowerCase();
    const inviteResult = await supabaseAdmin
      .from(pendingInvitesTable)
      .select('*')
      .eq('organization_id', organization_id)
      .eq('status', 'pending')
      .eq('email', normalizedEmail);

    if (inviteResult.error) {
      return reply.code(500).send({ error: `Failed to query pending invites: ${inviteResult.error.message}` });
    }

    const validRoles = new Set(['owner', 'administrator', 'designer', 'viewer']);
    let assignedRole = role;
    if (!validRoles.has(assignedRole)) {
      assignedRole = 'viewer';
    }

    if ((inviteResult.data || []).length > 0) {
      assignedRole = inviteResult.data[0].organization_role || assignedRole;

      const inviteIds = inviteResult.data.map((inv) => inv.id);
      const markAccepted = await supabaseAdmin
        .from(pendingInvitesTable)
        .update({ status: 'accepted' })
        .in('id', inviteIds);

      if (markAccepted.error) {
        return reply.code(500).send({ error: `Failed to update invite status: ${markAccepted.error.message}` });
      }
    }

    const userUpdate = await supabaseAdmin
      .from(usersTable)
      .upsert(
        {
          id: auth.user.id,
          email: auth.user.email,
          organization_id,
          organization_role: assignedRole,
          status: 'pending'
        },
        { onConflict: 'id' }
      );

    if (userUpdate.error) {
      return reply.code(500).send({ error: `Failed to update user organization: ${userUpdate.error.message}` });
    }

    return {
      success: true,
      message: 'Successfully joined organization - awaiting approval',
      organization_id,
      role: assignedRole,
      status: 'pending'
    };
  });
}
