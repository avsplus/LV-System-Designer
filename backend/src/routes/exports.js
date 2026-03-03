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
const escapeHtml = (value) =>
  String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');

const formatDate = (isoValue) => {
  const date = isoValue ? new Date(isoValue) : new Date();
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-US');
};

const buildHtmlBody = (payload, exportType) => {
  const products = Array.isArray(payload.canvasProducts) ? payload.canvasProducts : [];
  const connections = Array.isArray(payload.connections) ? payload.connections : [];
  const rooms = Array.isArray(payload.rooms) ? payload.rooms : [];
  const floorplans = Array.isArray(payload.floorplans) ? payload.floorplans : [];

  const summary = `
    <section style="margin:16px 0;">
      <h2 style="font-size:20px;margin:0 0 8px;">Project Summary</h2>
      <p style="margin:0;color:#475569;">Devices: ${products.length} | Connections: ${connections.length} | Rooms: ${rooms.length} | Floorplans: ${floorplans.length}</p>
    </section>
  `;

  const devices = products.length
    ? `
      <section style="margin:16px 0;">
        <h2 style="font-size:20px;margin:0 0 8px;">Devices</h2>
        ${products
          .map((item, idx) => {
            const p = item?.product || {};
            return `<div style="padding:10px 12px;border:1px solid #d1d5db;border-radius:8px;margin-bottom:8px;">
              <strong>${idx + 1}. ${escapeHtml(`${p.brand || ''} ${p.model || ''}`.trim() || 'Unnamed device')}</strong><br/>
              <span style="color:#64748b;">Category: ${escapeHtml(p.category || 'n/a')} | Room: ${escapeHtml(item?.room || 'n/a')}</span>
            </div>`;
          })
          .join('')}
      </section>
    `
    : '';

  const connectionSchedule = connections.length
    ? `
      <section style="margin:16px 0;">
        <h2 style="font-size:20px;margin:0 0 8px;">Connection Schedule</h2>
        ${connections
          .map((c, idx) => {
            const from = products.find((p) => p.instanceId === c.from);
            const to = products.find((p) => p.instanceId === c.to);
            const fromName = `${from?.product?.brand || ''} ${from?.product?.model || ''}`.trim() || c.from || 'unknown';
            const toName = `${to?.product?.brand || ''} ${to?.product?.model || ''}`.trim() || c.to || 'unknown';
            return `<div style="padding:10px 12px;border:1px solid #d1d5db;border-radius:8px;margin-bottom:8px;">
              <strong>${idx + 1}. ${escapeHtml(c.wireId || c.type || 'Connection')}</strong><br/>
              <span style="color:#64748b;">${escapeHtml(fromName)} -> ${escapeHtml(toName)}</span>
            </div>`;
          })
          .join('')}
      </section>
    `
    : '';

  const roomBreakdown =
    exportType !== 'client' && rooms.length
      ? `
      <section style="margin:16px 0;">
        <h2 style="font-size:20px;margin:0 0 8px;">Room Breakdown</h2>
        ${rooms
          .map((room, idx) => {
            const name = typeof room === 'string' ? room : room?.name;
            const roomId = typeof room === 'string' ? room : room?.id;
            const roomDevices = products.filter((p) => p.room === roomId || p.room === name);
            return `<div style="padding:10px 12px;border:1px solid #d1d5db;border-radius:8px;margin-bottom:8px;">
              <strong>${idx + 1}. ${escapeHtml(name || 'Unnamed Room')}</strong><br/>
              <span style="color:#64748b;">Devices: ${roomDevices.length}</span>
            </div>`;
          })
          .join('')}
      </section>
    `
      : '';

  return `${summary}${devices}${connectionSchedule}${roomBreakdown}`;
};

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

    const exportTypeTitle =
      exportType === 'client'
        ? 'Client Proposal'
        : exportType === 'documentation'
          ? 'Full Documentation'
          : 'Installer Package';
    const title = sanitize(payload.projectName || 'AV System Designer');
    const generatedAt = new Date().toISOString();
    const body = buildHtmlBody(payload, exportType);

    const apiPayload = {
      // Keep in payload for backwards compatibility with providers/proxies that accept body config.
      template_id: templateId,
      output_format: 'pdf',
      title: `${title} - ${exportTypeTitle}`,
      date: formatDate(generatedAt),
      body,
      data: {
        title: `${title} - ${exportTypeTitle}`,
        date: formatDate(generatedAt),
        body,
        project_name: sanitize(payload.projectName || 'AV System Design'),
        client_name: sanitize(payload.clientName || ''),
        location: sanitize(payload.location || ''),
        export_type: exportType,
        generated_at: generatedAt,
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
