import { requireAuth } from '../lib/auth.js';
import { supabaseAdmin } from '../lib/supabase.js';
import { seedDemoProductsForOrganization } from '../lib/demoProducts.js';
import { importProductsFromWeb } from '../lib/productImport.js';
import { enrichConnectionsForProducts, normalizeExistingConnections } from '../lib/connectionEnrichment.js';
import { config } from '../config.js';

const canMutateProducts = (role) => ['owner', 'administrator'].includes(role);
const normalizeProductPayload = (payload = {}, organizationId = null) => {
  const product = {
    brand: payload.brand || '',
    model: payload.model || '',
    category: payload.category || '',
    description: payload.description || '',
    price: payload.price ?? null,
    image_url: payload.image_url || null,
    installation_manual_url: payload.installation_manual_url || null,
    user_manual_url: payload.user_manual_url || null,
    input_connections: payload.input_connections || [],
    output_connections: payload.output_connections || [],
    control: payload.control || {},
    specs: payload.specs || {},
    installation_labor: payload.installation_labor ?? null,
    configuration_labor: payload.configuration_labor ?? null
  };

  if (organizationId !== undefined) {
    product.organization_id = organizationId;
  }

  return product;
};

const normalizeProductUpdatePayload = (payload = {}) => {
  const allowedKeys = [
    'brand',
    'model',
    'category',
    'description',
    'price',
    'image_url',
    'installation_manual_url',
    'user_manual_url',
    'input_connections',
    'output_connections',
    'control',
    'specs',
    'installation_labor',
    'configuration_labor'
  ];

  const updates = {};
  for (const key of allowedKeys) {
    if (!(key in payload)) {
      continue;
    }
    updates[key] = payload[key];
  }

  // Do not allow accidentally blanking core identifiers.
  for (const requiredTextField of ['brand', 'model', 'category']) {
    if (requiredTextField in updates) {
      const value = String(updates[requiredTextField] ?? '').trim();
      if (!value) {
        delete updates[requiredTextField];
      } else {
        updates[requiredTextField] = value;
      }
    }
  }

  return updates;
};

export default async function productRoutes(fastify) {
  fastify.get('/products', async (request, reply) => {
    const auth = await requireAuth(request, reply);
    if (!auth) {
      return;
    }

    const includeGlobal = request.query?.include_global !== 'false';
    const organizationId = auth.user.organization_id;

    let query = supabaseAdmin.from('av_products').select('*');

    if (organizationId && includeGlobal) {
      query = query.or(`organization_id.eq.${organizationId},organization_id.is.null`);
    } else if (organizationId) {
      query = query.eq('organization_id', organizationId);
    } else {
      query = query.is('organization_id', null);
    }

    const { data, error } = await query.order('brand', { ascending: true }).order('model', { ascending: true });
    if (error) {
      return reply.code(500).send({ error: `Failed to load products: ${error.message}` });
    }

    return { products: data || [] };
  });

  fastify.post('/products', async (request, reply) => {
    const auth = await requireAuth(request, reply);
    if (!auth) {
      return;
    }

    if (!canMutateProducts(auth.user.organization_role)) {
      return reply.code(403).send({ error: 'Only owners and administrators can create devices' });
    }

    if (!auth.user.organization_id) {
      return reply.code(400).send({ error: 'User must belong to an organization' });
    }

    const payload = request.body || {};
    const insertPayload = normalizeProductPayload(payload, auth.user.organization_id);

    if (!insertPayload.brand || !insertPayload.model || !insertPayload.category) {
      return reply.code(400).send({ error: 'brand, model, and category are required' });
    }

    const { data, error } = await supabaseAdmin
      .from('av_products')
      .insert(insertPayload)
      .select('*')
      .single();

    if (error) {
      return reply.code(500).send({ error: `Failed to create product: ${error.message}` });
    }

    return { product: data };
  });

  fastify.patch('/products/:id', async (request, reply) => {
    const auth = await requireAuth(request, reply);
    if (!auth) {
      return;
    }

    if (!canMutateProducts(auth.user.organization_role)) {
      return reply.code(403).send({ error: 'Only owners and administrators can edit devices' });
    }

    const { data: existing, error: findError } = await supabaseAdmin
      .from('av_products')
      .select('*')
      .eq('id', request.params.id)
      .maybeSingle();

    if (findError) {
      return reply.code(500).send({ error: `Failed to load product: ${findError.message}` });
    }
    if (!existing) {
      return reply.code(404).send({ error: 'Product not found' });
    }
    if (!existing.organization_id || existing.organization_id !== auth.user.organization_id) {
      return reply.code(403).send({ error: 'You can only update organization-owned products' });
    }

    const updates = normalizeProductUpdatePayload(request.body || {});
    // Keep organization ownership immutable from this endpoint.
    delete updates.organization_id;

    if (Object.keys(updates).length === 0) {
      return { product: existing };
    }

    const { data, error } = await supabaseAdmin
      .from('av_products')
      .update(updates)
      .eq('id', existing.id)
      .select('*')
      .single();

    if (error) {
      return reply.code(500).send({ error: `Failed to update product: ${error.message}` });
    }

    return { product: data };
  });

  fastify.delete('/products/:id', async (request, reply) => {
    const auth = await requireAuth(request, reply);
    if (!auth) {
      return;
    }

    if (!canMutateProducts(auth.user.organization_role)) {
      return reply.code(403).send({ error: 'Only owners and administrators can delete devices' });
    }

    const { data: existing, error: findError } = await supabaseAdmin
      .from('av_products')
      .select('id, organization_id')
      .eq('id', request.params.id)
      .maybeSingle();

    if (findError) {
      return reply.code(500).send({ error: `Failed to load product: ${findError.message}` });
    }
    if (!existing) {
      return reply.code(404).send({ error: 'Product not found' });
    }
    if (!existing.organization_id || existing.organization_id !== auth.user.organization_id) {
      return reply.code(403).send({ error: 'You can only delete organization-owned products' });
    }

    const { error } = await supabaseAdmin.from('av_products').delete().eq('id', existing.id);
    if (error) {
      return reply.code(500).send({ error: `Failed to delete product: ${error.message}` });
    }

    return { success: true };
  });

  fastify.post('/products/seed-demo', async (request, reply) => {
    const auth = await requireAuth(request, reply);
    if (!auth) {
      return;
    }

    if (!canMutateProducts(auth.user.organization_role)) {
      return reply.code(403).send({ error: 'Only owners and administrators can seed demo devices' });
    }

    if (!auth.user.organization_id) {
      return reply.code(400).send({ error: 'User must belong to an organization' });
    }

    try {
      const result = await seedDemoProductsForOrganization(auth.user.organization_id);
      return {
        success: true,
        created: result.created.length,
        existing: result.existing.length,
        categories: result
      };
    } catch (error) {
      return reply.code(500).send({ error: error.message || 'Failed to seed demo products' });
    }
  });

  fastify.post('/products/import', async (request, reply) => {
    const auth = await requireAuth(request, reply);
    if (!auth) {
      return;
    }

    if (!canMutateProducts(auth.user.organization_role)) {
      return reply.code(403).send({ error: 'Only owners and administrators can import products' });
    }

    if (!auth.user.organization_id) {
      return reply.code(400).send({ error: 'User must belong to an organization' });
    }

    const payload = request.body || {};
    const mode = payload.mode === 'search' ? 'search' : 'category';
    const category = String(payload.category || '').trim();
    const brand = String(payload.brand || '').trim();
    const model = String(payload.model || '').trim();

    if (mode === 'category' && !category) {
      return reply.code(400).send({ error: 'category is required for category mode' });
    }
    if (mode === 'search' && !brand) {
      return reply.code(400).send({ error: 'brand is required for search mode' });
    }

    let candidates = [];
    try {
      candidates = await importProductsFromWeb({
        mode,
        category,
        brand,
        model,
        openaiApiKey: config.openaiApiKey,
        openaiModel: config.openaiModel,
        openaiBaseUrl: config.openaiBaseUrl
      });
    } catch (error) {
      return reply.code(500).send({ error: `Import provider failed: ${error.message}` });
    }

    if (candidates.length === 0) {
      return { productsFound: 0, skippedDuplicates: 0 };
    }

    const { data: existingRows, error: existingError } = await supabaseAdmin
      .from('av_products')
      .select('brand,model')
      .eq('organization_id', auth.user.organization_id);

    if (existingError) {
      return reply.code(500).send({ error: `Failed to load existing products: ${existingError.message}` });
    }

    const existingSet = new Set(
      (existingRows || []).map((row) => `${String(row.brand || '').toLowerCase()}::${String(row.model || '').toLowerCase()}`)
    );

    const rowsToInsert = [];
    let skippedDuplicates = 0;
    for (const candidate of candidates) {
      const key = `${candidate.brand.toLowerCase()}::${candidate.model.toLowerCase()}`;
      if (existingSet.has(key)) {
        skippedDuplicates += 1;
        continue;
      }
      existingSet.add(key);
      rowsToInsert.push({
        ...candidate,
        organization_id: auth.user.organization_id
      });
    }

    if (rowsToInsert.length > 0) {
      const { error: insertError } = await supabaseAdmin.from('av_products').insert(rowsToInsert);
      if (insertError) {
        return reply.code(500).send({ error: `Failed to import products: ${insertError.message}` });
      }
    }

    return {
      productsFound: rowsToInsert.length,
      skippedDuplicates
    };
  });

  fastify.post('/products/enrich-connections', async (request, reply) => {
    const auth = await requireAuth(request, reply);
    if (!auth) {
      return;
    }

    if (!canMutateProducts(auth.user.organization_role)) {
      return reply.code(403).send({ error: 'Only owners and administrators can enrich connections' });
    }

    if (!auth.user.organization_id) {
      return reply.code(400).send({ error: 'User must belong to an organization' });
    }

    const payload = request.body || {};
    const mode = payload.mode === 'search' ? 'search' : 'category';
    const category = String(payload.category || '').trim();
    const brand = String(payload.brand || '').trim();
    const model = String(payload.model || '').trim();

    let query = supabaseAdmin
      .from('av_products')
      .select('id,brand,model,category,input_connections,output_connections')
      .eq('organization_id', auth.user.organization_id);

    if (mode === 'category') {
      if (category && category !== 'all') {
        query = query.eq('category', category);
      }
    } else {
      if (!brand) {
        return reply.code(400).send({ error: 'brand is required for search mode' });
      }
      query = query.ilike('brand', `%${brand}%`);
      if (model) {
        query = query.ilike('model', `%${model}%`);
      }
    }

    const { data: products, error: listError } = await query.order('brand', { ascending: true }).order('model', { ascending: true });
    if (listError) {
      return reply.code(500).send({ error: `Failed to load products for enrichment: ${listError.message}` });
    }

    if (!products || products.length === 0) {
      return { enriched: 0, total: 0, failed: 0 };
    }

    let enrichedRows = [];
    try {
      enrichedRows = await enrichConnectionsForProducts({
        products,
        openaiApiKey: config.openaiApiKey,
        openaiModel: config.openaiModel,
        openaiBaseUrl: config.openaiBaseUrl
      });
    } catch (error) {
      return reply.code(500).send({ error: `Enrichment provider failed: ${error.message}` });
    }

    let enriched = 0;
    let failed = 0;

    for (const row of enrichedRows) {
      if (!row.changed) {
        continue;
      }
      const { error: updateError } = await supabaseAdmin
        .from('av_products')
        .update({
          input_connections: row.input_connections,
          output_connections: row.output_connections
        })
        .eq('id', row.id)
        .eq('organization_id', auth.user.organization_id);

      if (updateError) {
        failed += 1;
      } else {
        enriched += 1;
      }
    }

    return {
      enriched,
      total: products.length,
      failed
    };
  });

  fastify.post('/products/cleanup-connections', async (request, reply) => {
    const auth = await requireAuth(request, reply);
    if (!auth) {
      return;
    }

    if (!canMutateProducts(auth.user.organization_role)) {
      return reply.code(403).send({ error: 'Only owners and administrators can cleanup connections' });
    }

    if (!auth.user.organization_id) {
      return reply.code(400).send({ error: 'User must belong to an organization' });
    }

    const { data: products, error: listError } = await supabaseAdmin
      .from('av_products')
      .select('id,input_connections,output_connections')
      .eq('organization_id', auth.user.organization_id);

    if (listError) {
      return reply.code(500).send({ error: `Failed to load products: ${listError.message}` });
    }

    let fixed = 0;
    for (const product of products || []) {
      const normalized = normalizeExistingConnections(product);
      if (!normalized.changed) {
        continue;
      }
      const { error: updateError } = await supabaseAdmin
        .from('av_products')
        .update({
          input_connections: normalized.input_connections,
          output_connections: normalized.output_connections
        })
        .eq('id', normalized.id)
        .eq('organization_id', auth.user.organization_id);

      if (!updateError) {
        fixed += 1;
      }
    }

    return { fixed };
  });
}
