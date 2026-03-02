const ALLOWED_CONNECTION_TYPES = [
  'HDMI',
  'HDBaseT',
  'Component',
  'Composite',
  'VGA',
  'Optical',
  'Optical/TOSLINK',
  'RCA',
  'XLR',
  'Speaker Wire',
  'Coaxial',
  'Subwoofer',
  '3.5mm Jack',
  'Wireless',
  'Ethernet',
  'USB',
  'RS232',
  'Control',
  'Power',
  'IR'
];

const normalizeType = (value = '') => {
  const raw = String(value || '').trim();
  if (!raw) return '';
  const lower = raw.toLowerCase();
  const aliases = new Map([
    ['toslink', 'Optical/TOSLINK'],
    ['optical toslink', 'Optical/TOSLINK'],
    ['optical/toslink', 'Optical/TOSLINK'],
    ['speaker', 'Speaker Wire'],
    ['speakerwire', 'Speaker Wire'],
    ['speaker wire', 'Speaker Wire'],
    ['ethernet/lan', 'Ethernet'],
    ['lan', 'Ethernet'],
    ['rs-232', 'RS232'],
    ['hdbase t', 'HDBaseT']
  ]);
  if (aliases.has(lower)) {
    return aliases.get(lower);
  }
  const exact = ALLOWED_CONNECTION_TYPES.find((type) => type.toLowerCase() === lower);
  return exact || raw;
};

const normalizeConnectionList = (connections) => {
  if (!Array.isArray(connections)) return [];

  const normalized = [];
  for (const item of connections) {
    const type = normalizeType(item?.type);
    const ports = Array.isArray(item?.ports)
      ? item.ports.map((port) => String(port || '').trim()).filter(Boolean)
      : [];
    if (!type || ports.length === 0) continue;
    normalized.push({
      type,
      ports: [...new Set(ports)]
    });
  }
  return normalized;
};

const ENRICH_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['products'],
  properties: {
    products: {
      type: 'array',
      maxItems: 20,
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['id', 'input_connections', 'output_connections'],
        properties: {
          id: { type: 'string' },
          input_connections: {
            type: 'array',
            maxItems: 20,
            items: {
              type: 'object',
              additionalProperties: false,
              required: ['type', 'ports'],
              properties: {
                type: { type: 'string' },
                ports: { type: 'array', items: { type: 'string' }, maxItems: 30 }
              }
            }
          },
          output_connections: {
            type: 'array',
            maxItems: 20,
            items: {
              type: 'object',
              additionalProperties: false,
              required: ['type', 'ports'],
              properties: {
                type: { type: 'string' },
                ports: { type: 'array', items: { type: 'string' }, maxItems: 30 }
              }
            }
          }
        }
      }
    }
  }
};

const buildSystemPrompt = () =>
  [
    'You are an AV integration hardware specialist.',
    'Given products, return realistic physical connection ports only.',
    'Use manufacturer docs and reliable product pages.',
    `Use these connection types where possible: ${ALLOWED_CONNECTION_TYPES.join(', ')}.`,
    'Do not invent impossible ports.',
    'Return strict JSON that matches schema.'
  ].join(' ');

const buildUserPrompt = (products) => {
  const lines = products.map((product) => `- ${product.id}: ${product.brand} ${product.model} (${product.category})`);
  return [
    'For each product below, provide input_connections and output_connections.',
    'Products:',
    ...lines,
    'Each connection entry must include type and ports (array of labels).',
    'If unknown, return empty arrays for that product.'
  ].join('\n');
};

const extractResponseText = (response) => {
  if (typeof response?.output_text === 'string' && response.output_text.trim()) {
    return response.output_text;
  }

  const parts = [];
  for (const item of response?.output || []) {
    for (const content of item?.content || []) {
      if (content?.type === 'output_text' && content?.text) {
        parts.push(content.text);
      }
    }
  }
  return parts.join('\n');
};

const chunk = (arr, size) => {
  const chunks = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
};

const callOpenAIForChunk = async ({ apiKey, baseUrl, model, products }) => {
  const response = await fetch(`${baseUrl.replace(/\/$/, '')}/responses`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      tools: [{ type: 'web_search_preview' }],
      input: [
        { role: 'system', content: buildSystemPrompt() },
        { role: 'user', content: buildUserPrompt(products) }
      ],
      text: {
        format: {
          type: 'json_schema',
          name: 'av_connection_enrichment',
          strict: true,
          schema: ENRICH_SCHEMA
        }
      }
    })
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const errorMsg = data?.error?.message || `OpenAI request failed (${response.status})`;
    throw new Error(errorMsg);
  }

  const text = extractResponseText(data);
  if (!text) {
    throw new Error('No enrichment data returned by provider');
  }
  const parsed = JSON.parse(text);
  return Array.isArray(parsed?.products) ? parsed.products : [];
};

export const enrichConnectionsForProducts = async ({
  products,
  openaiApiKey,
  openaiModel,
  openaiBaseUrl
}) => {
  if (!openaiApiKey) {
    throw new Error('OPENAI_API_KEY is not configured');
  }
  if (!Array.isArray(products) || products.length === 0) {
    return [];
  }

  const chunks = chunk(products, 10);
  const result = [];
  for (const currentChunk of chunks) {
    const enrichedChunk = await callOpenAIForChunk({
      apiKey: openaiApiKey,
      baseUrl: openaiBaseUrl,
      model: openaiModel,
      products: currentChunk
    });
    result.push(...enrichedChunk);
  }

  const byId = new Map(result.map((item) => [String(item.id), item]));
  return products.map((product) => {
    const candidate = byId.get(String(product.id));
    if (!candidate) {
      return {
        id: product.id,
        input_connections: normalizeConnectionList(product.input_connections),
        output_connections: normalizeConnectionList(product.output_connections),
        changed: false
      };
    }
    const inputConnections = normalizeConnectionList(candidate.input_connections);
    const outputConnections = normalizeConnectionList(candidate.output_connections);
    const changed =
      JSON.stringify(inputConnections) !== JSON.stringify(normalizeConnectionList(product.input_connections)) ||
      JSON.stringify(outputConnections) !== JSON.stringify(normalizeConnectionList(product.output_connections));
    return {
      id: product.id,
      input_connections: inputConnections,
      output_connections: outputConnections,
      changed
    };
  });
};

export const normalizeExistingConnections = (product) => {
  const inputConnections = normalizeConnectionList(product.input_connections);
  const outputConnections = normalizeConnectionList(product.output_connections);
  const changed =
    JSON.stringify(inputConnections) !== JSON.stringify(Array.isArray(product.input_connections) ? product.input_connections : []) ||
    JSON.stringify(outputConnections) !== JSON.stringify(Array.isArray(product.output_connections) ? product.output_connections : []);
  return {
    id: product.id,
    input_connections: inputConnections,
    output_connections: outputConnections,
    changed
  };
};

