import { requireAuth } from '../lib/auth.js';
import { config } from '../config.js';

const canExport = (role) => ['owner', 'administrator', 'collaborator'].includes(role);

const getTemplateIdForType = (exportType) => {
  // Prefer per-type overrides, fall back to one shared template.
  if (exportType === 'client') return sanitize(config.apiTemplateTemplateClient || config.apiTemplateTemplateDefault);
  if (exportType === 'documentation') return sanitize(config.apiTemplateTemplateDocumentation || config.apiTemplateTemplateDefault);
  return sanitize(config.apiTemplateTemplateInstaller || config.apiTemplateTemplateDefault);
};

const sanitize = (value) => String(value ?? '').trim();

export default async function exportRoutes(fastify) {
  fastify.post('/exports/pdf', async (request, reply) => {
    const auth = await requireAuth(request, reply);
    if (!auth) {
      return;
    }

    if (!canExport(auth.user.organization_role)) {
      return reply.code(403).send({ error: 'Insufficient permissions to export PDFs' });
    }

    if (!config.apiTemplateApiKey) {
      return reply.code(400).send({ error: 'APITEMPLATE_API_KEY is not configured' });
    }

    const payload = request.body || {};
    const exportType = sanitize(payload.exportType || 'installer');
    const templateId = getTemplateIdForType(exportType);
    if (!templateId) {
      return reply.code(400).send({ error: `No APITemplate template configured for export type: ${exportType}` });
    }

    const apiPayload = {
      // Keep in payload for backwards compatibility with providers/proxies that accept body config.
      template_id: templateId,
      output_format: 'pdf',
      data: {
        project_name: sanitize(payload.projectName || 'AV System Design'),
        client_name: sanitize(payload.clientName || ''),
        location: sanitize(payload.location || ''),
        export_type: exportType,
        generated_at: new Date().toISOString(),
        summary: {
          devices: Array.isArray(payload.canvasProducts) ? payload.canvasProducts.length : 0,
          connections: Array.isArray(payload.connections) ? payload.connections.length : 0,
          rooms: Array.isArray(payload.rooms) ? payload.rooms.length : 0,
          floorplans: Array.isArray(payload.floorplans) ? payload.floorplans.length : 0
        },
        canvas_products: Array.isArray(payload.canvasProducts) ? payload.canvasProducts : [],
        connections: Array.isArray(payload.connections) ? payload.connections : [],
        rooms: Array.isArray(payload.rooms) ? payload.rooms : [],
        floorplans: Array.isArray(payload.floorplans) ? payload.floorplans : [],
        arrows: Array.isArray(payload.arrows) ? payload.arrows : [],
        annotations: Array.isArray(payload.annotations) ? payload.annotations : [],
        org_settings: payload.orgSettings || {}
      }
    };

    const endpointUrl = new URL(config.apiTemplateEndpoint);
    // APITemplate v2 expects template_id in querystring.
    endpointUrl.searchParams.set('template_id', templateId);

    const response = await fetch(endpointUrl.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': config.apiTemplateApiKey
      },
      body: JSON.stringify(apiPayload)
    });

    const responseData = await response.json().catch(() => ({}));
    if (!response.ok) {
      const providerError = responseData?.message || responseData?.error || `APITemplate request failed (${response.status})`;
      return reply.code(502).send({ error: providerError });
    }

    const downloadUrl =
      responseData?.download_url ||
      responseData?.pdf_url ||
      responseData?.url ||
      responseData?.data?.download_url ||
      null;

    if (!downloadUrl) {
      return reply.code(502).send({ error: 'APITemplate did not return a download URL' });
    }

    return {
      download_url: downloadUrl
    };
  });
}
