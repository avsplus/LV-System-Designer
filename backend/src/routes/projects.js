import { requireAuth } from '../lib/auth.js';
import { supabaseAdmin } from '../lib/supabase.js';

const normalizeEmail = (value) => (value || '').trim().toLowerCase();

const toArray = (value) => (Array.isArray(value) ? value : []);

const mapProject = (project) => {
  if (!project) {
    return null;
  }

  const createdDate = project.created_date || project.created_at || null;
  const updatedDate = project.updated_date || project.updated_at || createdDate;

  return {
    ...project,
    created_date: createdDate,
    updated_date: updatedDate
  };
};

const canAccessProject = (project, userEmail) => {
  const email = normalizeEmail(userEmail);
  if (!email || !project) {
    return false;
  }
  if (normalizeEmail(project.owner_email) === email) {
    return true;
  }
  return toArray(project.shared_with).map(normalizeEmail).includes(email);
};

const ensureProjectAccess = async (projectId, auth, reply) => {
  const { data: project, error } = await supabaseAdmin
    .from('av_projects')
    .select('*')
    .eq('id', projectId)
    .maybeSingle();

  if (error) {
    reply.code(500).send({ error: `Failed to load project: ${error.message}` });
    return null;
  }
  if (!project) {
    reply.code(404).send({ error: 'Project not found' });
    return null;
  }

  if (!canAccessProject(project, auth.user.email)) {
    reply.code(403).send({ error: 'Forbidden' });
    return null;
  }

  return project;
};

const sortByLastUpdatedDesc = (projects) =>
  [...projects].sort((a, b) => {
    const aTime = Date.parse(a.updated_date || a.updated_at || a.created_date || a.created_at || 0);
    const bTime = Date.parse(b.updated_date || b.updated_at || b.created_date || b.created_at || 0);
    return bTime - aTime;
  });

const isMissingTableError = (error) => {
  const message = (error?.message || '').toLowerCase();
  return (
    message.includes('could not find the table') ||
    message.includes('schema cache') ||
    message.includes('does not exist')
  );
};

const cleanupProjectDependencies = async (projectId) => {
  // Best-effort cleanup for optional tables that may enforce FK restrictions.
  const cleanupTargets = [
    { table: 'activities', column: 'project_id' },
    { table: 'project_presence', column: 'project_id' },
    { table: 'pdf_exports', column: 'project_id' }
  ];

  for (const target of cleanupTargets) {
    const { error } = await supabaseAdmin
      .from(target.table)
      .delete()
      .eq(target.column, projectId);

    if (!error || isMissingTableError(error)) {
      continue;
    }

    throw new Error(`Failed to cleanup ${target.table}: ${error.message}`);
  }
};

export default async function projectRoutes(fastify) {
  fastify.get('/projects', async (request, reply) => {
    const auth = await requireAuth(request, reply);
    if (!auth) {
      return;
    }

    const query = request.query || {};
    const organizationId = query.organization_id || auth.user.organization_id;
    if (!organizationId) {
      return reply.code(400).send({ error: 'organization_id is required' });
    }
    if (auth.user.organization_id && organizationId !== auth.user.organization_id) {
      return reply.code(403).send({ error: 'Forbidden' });
    }

    const { data, error } = await supabaseAdmin
      .from('av_projects')
      .select('*')
      .eq('organization_id', organizationId);

    if (error) {
      return reply.code(500).send({ error: `Failed to list projects: ${error.message}` });
    }

    const userEmail = normalizeEmail(auth.user.email);
    const ownerEmailFilter = query.owner_email ? normalizeEmail(query.owner_email) : null;
    const sharedWithFilter = query.shared_with_email ? normalizeEmail(query.shared_with_email) : null;

    let projects = (data || []).filter((project) => canAccessProject(project, userEmail));

    if (ownerEmailFilter) {
      projects = projects.filter((project) => normalizeEmail(project.owner_email) === ownerEmailFilter);
    }

    if (sharedWithFilter) {
      projects = projects.filter((project) =>
        toArray(project.shared_with).map(normalizeEmail).includes(sharedWithFilter)
      );
    }

    return { projects: sortByLastUpdatedDesc(projects).map(mapProject) };
  });

  fastify.get('/projects/:id', async (request, reply) => {
    const auth = await requireAuth(request, reply);
    if (!auth) {
      return;
    }

    const project = await ensureProjectAccess(request.params.id, auth, reply);
    if (!project) {
      return;
    }

    return { project: mapProject(project) };
  });

  fastify.post('/projects', async (request, reply) => {
    const auth = await requireAuth(request, reply);
    if (!auth) {
      return;
    }

    const payload = request.body || {};
    const organizationId = payload.organization_id || auth.user.organization_id;
    const name = (payload.name || '').trim();
    if (!organizationId) {
      return reply.code(400).send({ error: 'organization_id is required' });
    }
    if (organizationId !== auth.user.organization_id) {
      return reply.code(403).send({ error: 'Forbidden' });
    }
    if (!name) {
      return reply.code(400).send({ error: 'Project name is required' });
    }

    const insertPayload = {
      name,
      description: payload.description || '',
      organization_id: organizationId,
      owner_email: normalizeEmail(payload.owner_email || auth.user.email),
      shared_with: toArray(payload.shared_with),
      canvas_products: payload.canvas_products || [],
      connections: payload.connections || [],
      rooms: payload.rooms || [],
      floorplans: payload.floorplans || [],
      arrows: payload.arrows || [],
      annotations: payload.annotations || []
    };

    const { data: created, error } = await supabaseAdmin
      .from('av_projects')
      .insert(insertPayload)
      .select('*')
      .single();

    if (error) {
      return reply.code(500).send({ error: `Failed to create project: ${error.message}` });
    }

    return { project: mapProject(created) };
  });

  fastify.patch('/projects/:id', async (request, reply) => {
    const auth = await requireAuth(request, reply);
    if (!auth) {
      return;
    }

    const project = await ensureProjectAccess(request.params.id, auth, reply);
    if (!project) {
      return;
    }

    const payload = request.body || {};
    const updates = {};

    if (typeof payload.name === 'string') {
      updates.name = payload.name.trim();
    }
    if (typeof payload.description === 'string') {
      updates.description = payload.description;
    }
    if (payload.canvas_products !== undefined) {
      updates.canvas_products = payload.canvas_products;
    }
    if (payload.connections !== undefined) {
      updates.connections = payload.connections;
    }
    if (payload.rooms !== undefined) {
      updates.rooms = payload.rooms;
    }
    if (payload.floorplans !== undefined) {
      updates.floorplans = payload.floorplans;
    }
    if (payload.arrows !== undefined) {
      updates.arrows = payload.arrows;
    }
    if (payload.annotations !== undefined) {
      updates.annotations = payload.annotations;
    }

    if (payload.shared_with !== undefined) {
      if (normalizeEmail(project.owner_email) !== normalizeEmail(auth.user.email)) {
        return reply.code(403).send({ error: 'Only the owner can manage sharing' });
      }
      updates.shared_with = toArray(payload.shared_with).map(normalizeEmail);
    }

    if (Object.keys(updates).length === 0) {
      return { project: mapProject(project) };
    }

    const { data: updated, error } = await supabaseAdmin
      .from('av_projects')
      .update(updates)
      .eq('id', project.id)
      .select('*')
      .single();

    if (error) {
      return reply.code(500).send({ error: `Failed to update project: ${error.message}` });
    }

    return { project: mapProject(updated) };
  });

  fastify.delete('/projects/:id', async (request, reply) => {
    const auth = await requireAuth(request, reply);
    if (!auth) {
      return;
    }

    const project = await ensureProjectAccess(request.params.id, auth, reply);
    if (!project) {
      return;
    }
    if (normalizeEmail(project.owner_email) !== normalizeEmail(auth.user.email)) {
      return reply.code(403).send({ error: 'Only the owner can delete this project' });
    }

    try {
      await cleanupProjectDependencies(project.id);
    } catch (error) {
      return reply.code(500).send({ error: error.message });
    }

    const { error } = await supabaseAdmin
      .from('av_projects')
      .delete()
      .eq('id', project.id);

    if (error) {
      return reply.code(500).send({ error: `Failed to delete project: ${error.message}` });
    }

    return { success: true };
  });
}
