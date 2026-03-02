import { randomUUID } from 'node:crypto';
import { config } from '../config.js';
import { requireAuth } from '../lib/auth.js';
import { supabaseAdmin } from '../lib/supabase.js';

const MAX_FILE_BYTES = 25 * 1024 * 1024;

const sanitizeSegment = (value) =>
  String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9/_-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^[-/]+|[-/]+$/g, '');

const safeExt = (filename = '', fallback = 'bin') => {
  const parts = filename.split('.');
  if (parts.length < 2) return fallback;
  const ext = parts.pop().toLowerCase().replace(/[^a-z0-9]/g, '');
  return ext || fallback;
};

export default async function fileRoutes(fastify) {
  fastify.post('/files/upload', async (request, reply) => {
    const auth = await requireAuth(request, reply);
    if (!auth) {
      return;
    }

    const body = request.body || {};
    const fileName = String(body.file_name || '').trim();
    const mimeType = String(body.mime_type || '').trim() || 'application/octet-stream';
    const folder = sanitizeSegment(body.folder || 'general') || 'general';
    const base64 = String(body.data_base64 || '').trim();

    if (!fileName || !base64) {
      return reply.code(400).send({ error: 'file_name and data_base64 are required' });
    }

    let buffer;
    try {
      buffer = Buffer.from(base64, 'base64');
    } catch {
      return reply.code(400).send({ error: 'Invalid base64 payload' });
    }

    if (!buffer || buffer.length === 0) {
      return reply.code(400).send({ error: 'Uploaded file is empty' });
    }

    if (buffer.length > MAX_FILE_BYTES) {
      return reply.code(400).send({ error: 'File too large (max 25MB)' });
    }

    const orgId = sanitizeSegment(auth.user.organization_id || 'personal') || 'personal';
    const ext = safeExt(fileName, mimeType.includes('pdf') ? 'pdf' : 'bin');
    const key = `${orgId}/${folder}/${Date.now()}-${randomUUID()}.${ext}`;

    const { error } = await supabaseAdmin.storage
      .from(config.storageBucket)
      .upload(key, buffer, {
        contentType: mimeType,
        upsert: false
      });

    if (error) {
      request.log.error({ error, bucket: config.storageBucket }, 'Failed to upload file to storage');
      return reply.code(500).send({ error: 'Failed to upload file' });
    }

    const { data: urlData } = supabaseAdmin.storage
      .from(config.storageBucket)
      .getPublicUrl(key);

    return {
      file_path: key,
      file_url: urlData?.publicUrl || null,
      bucket: config.storageBucket
    };
  });
}
