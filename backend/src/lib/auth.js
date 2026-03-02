import { supabaseAdmin, supabaseAnon } from './supabase.js';

const AUTH_HEADER_PREFIX = 'Bearer ';

const readBearerToken = (request) => {
  const authHeader = request.headers.authorization;
  if (!authHeader || !authHeader.startsWith(AUTH_HEADER_PREFIX)) {
    return null;
  }
  return authHeader.slice(AUTH_HEADER_PREFIX.length).trim();
};

export const getUserFromRequest = async (request) => {
  const token = readBearerToken(request);
  if (!token) {
    return null;
  }

  const { data, error } = await supabaseAnon.auth.getUser(token);
  if (error || !data?.user) {
    return null;
  }

  const authUser = data.user;
  let profile = null;

  const byId = await supabaseAdmin
    .from('users')
    .select('*')
    .eq('id', authUser.id)
    .maybeSingle();

  if (!byId.error && byId.data) {
    profile = byId.data;
  } else {
    const byEmail = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('email', authUser.email)
      .maybeSingle();

    if (!byEmail.error && byEmail.data) {
      profile = byEmail.data;
    }
  }

  // Owners should never be blocked behind pending approval.
  if (profile?.organization_role === 'owner' && profile?.status !== 'approved') {
    const { error: ownerStatusError } = await supabaseAdmin
      .from('users')
      .update({ status: 'approved' })
      .eq('id', profile.id);

    if (!ownerStatusError) {
      profile = { ...profile, status: 'approved' };
    }
  }

  return {
    token,
    authUser,
    user: {
      id: profile?.id || authUser.id,
      email: profile?.email || authUser.email,
      full_name: profile?.full_name || authUser.user_metadata?.full_name || null,
      status: profile?.status || 'approved',
      organization_id: profile?.organization_id || authUser.user_metadata?.organization_id || null,
      organization_role: profile?.organization_role || authUser.user_metadata?.organization_role || null
    }
  };
};

export const requireAuth = async (request, reply) => {
  const auth = await getUserFromRequest(request);
  if (!auth) {
    reply.code(401).send({ error: 'Unauthorized' });
    return null;
  }
  return auth;
};
