const IMPORT_CATEGORIES = [
  'televisions',
  'projectors',
  'projector_screens',
  'video_distribution',
  'matrix_switchers',
  'audio_streamers',
  'media_streamers',
  'speakers',
  'soundbars',
  'subwoofers',
  'stereo_amps',
  'multizone_amps',
  'surround_processors',
  'av_receivers',
  'network_switches',
  'control_processors',
  'touch_panels',
  'remotes',
  'hdmi_extenders',
  'access_points',
  'patch_panels',
  'data_jacks',
  'telephones',
  'phone_jacks',
  'intercoms',
  'nvrs',
  'ip_cameras',
  'power_conditioner',
  'smart_power_conditioner',
  'power_strip',
  'ups_backup'
];

const CATEGORY_ALIASES = new Map([
  ['television', 'televisions'],
  ['tv', 'televisions'],
  ['display', 'televisions'],
  ['projector', 'projectors'],
  ['projector_screen', 'projector_screens'],
  ['screen', 'projector_screens'],
  ['video_switcher', 'matrix_switchers'],
  ['matrix', 'matrix_switchers'],
  ['streamer', 'media_streamers'],
  ['amp', 'stereo_amps'],
  ['amplifier', 'stereo_amps'],
  ['avr', 'av_receivers'],
  ['receiver', 'av_receivers'],
  ['switch', 'network_switches'],
  ['network_switch', 'network_switches'],
  ['touchpanel', 'touch_panels'],
  ['remote_control', 'remotes'],
  ['camera', 'ip_cameras'],
  ['nvr', 'nvrs'],
  ['ups', 'ups_backup'],
  ['pdu', 'power_strip']
]);

const PRODUCT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['products'],
  properties: {
    products: {
      type: 'array',
      maxItems: 50,
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['brand', 'model', 'category', 'description', 'price'],
        properties: {
          brand: { type: 'string' },
          model: { type: 'string' },
          category: { type: 'string' },
          description: { type: 'string' },
          price: { type: ['number', 'null'] }
        }
      }
    }
  }
};

const CATEGORY_GUIDANCE = [
  'televisions: TVs/displays only.',
  'projectors: video projectors only.',
  'projector_screens: projection screens only.',
  'video_distribution: baluns/splitters/distribution amps (not matrix switchers).',
  'matrix_switchers: matrix switch devices.',
  'audio_streamers: dedicated network audio streamers/streaming DACs.',
  'media_streamers: Roku, Apple TV, Chromecast, Fire TV, Sonos Port, and similar media players/streamers.',
  'speakers/soundbars/subwoofers: speaker products only.',
  'stereo_amps/multizone_amps/surround_processors/av_receivers: amplification/processing products.',
  'network_switches/access_points: networking gear only.',
  'hdmi_extenders: HDMI-over-CAT/HDBaseT extenders only.',
  'nvrs/ip_cameras: surveillance products only.',
  'power_conditioner/smart_power_conditioner/power_strip/ups_backup: power products only.'
];

const normalizeCategory = (value) => {
  const cleaned = String(value || '')
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .trim()
    .replace(/\s+/g, '_');

  if (!cleaned) {
    return 'uncategorized';
  }
  if (IMPORT_CATEGORIES.includes(cleaned)) {
    return cleaned;
  }
  if (CATEGORY_ALIASES.has(cleaned)) {
    return CATEGORY_ALIASES.get(cleaned);
  }

  const singular = cleaned.endsWith('s') ? cleaned.slice(0, -1) : cleaned;
  if (CATEGORY_ALIASES.has(singular)) {
    return CATEGORY_ALIASES.get(singular);
  }
  if (IMPORT_CATEGORIES.includes(singular)) {
    return singular;
  }

  return 'uncategorized';
};

const clampPrice = (value) => {
  if (value === null || value === undefined || value === '') {
    return null;
  }
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return null;
  }
  return Math.round(parsed * 100) / 100;
};

const CATEGORY_RULES = [
  { category: 'televisions', patterns: [/\b(tv|television|oled|qled|mini[\s-]?led|smart\s*tv)\b/] },
  { category: 'projectors', patterns: [/\b(projector|laser\s+projector|ultra\s+short\s+throw|ust)\b/] },
  { category: 'projector_screens', patterns: [/\b(projector\s+screen|projection\s+screen|screen\s+material)\b/] },
  { category: 'video_distribution', patterns: [/\b(video\s+distribution|distribution\s+amplifier|da\s+\d+x\d+|video\s+splitter)\b/] },
  { category: 'matrix_switchers', patterns: [/\b(matrix\s+switch|hdmi\s+matrix|video\s+matrix)\b/] },
  { category: 'audio_streamers', patterns: [/\b(audio\s+streamer|network\s+audio\s+player|streaming\s+dac|music\s+streamer)\b/] },
  { category: 'media_streamers', patterns: [/\b(roku|apple\s*tv|chromecast|fire\s*tv|nvidia\s+shield|media\s+player|media\s+streamer)\b/, /\bsonos\b.*\bport\b/] },
  { category: 'speakers', patterns: [/\b(bookshelf\s+speaker|in[\s-]?ceiling\s+speaker|in[\s-]?wall\s+speaker|loudspeaker)\b/] },
  { category: 'soundbars', patterns: [/\b(soundbar|sound\s+bar)\b/] },
  { category: 'subwoofers', patterns: [/\b(subwoofer|sub-woofer)\b/] },
  { category: 'stereo_amps', patterns: [/\b(stereo\s+amp|integrated\s+amplifier|2[\s-]?channel\s+amplifier)\b/] },
  { category: 'multizone_amps', patterns: [/\b(multi[\s-]?zone\s+amplifier|distribution\s+amplifier|zone\s+amp)\b/] },
  { category: 'surround_processors', patterns: [/\b(surround\s+processor|home\s+theater\s+processor|pre[\s-]?pro)\b/] },
  { category: 'av_receivers', patterns: [/\b(avr|av\s+receiver|home\s+theater\s+receiver)\b/] },
  { category: 'network_switches', patterns: [/\b(network\s+switch|ethernet\s+switch|managed\s+switch|gigabit\s+switch|poe\s+switch)\b/] },
  { category: 'control_processors', patterns: [/\b(control\s+processor|automation\s+processor|control\s+hub)\b/] },
  { category: 'touch_panels', patterns: [/\b(touch\s*panel|control\s+panel|wall\s+touchscreen)\b/] },
  { category: 'remotes', patterns: [/\b(remote\s+control|universal\s+remote|handheld\s+remote)\b/] },
  { category: 'hdmi_extenders', patterns: [/\b(hdmi\s+extender|hdbaset\s+extender|hdmi\s+over\s+cat)\b/] },
  { category: 'access_points', patterns: [/\b(access\s+point|wireless\s+ap|wifi\s*6|wifi\s*7)\b/] },
  { category: 'patch_panels', patterns: [/\b(patch\s+panel)\b/] },
  { category: 'data_jacks', patterns: [/\b(data\s+jack|keystone\s+jack|rj45\s+jack)\b/] },
  { category: 'telephones', patterns: [/\b(telephone|desk\s+phone|sip\s+phone)\b/] },
  { category: 'phone_jacks', patterns: [/\b(phone\s+jack|rj11\s+jack)\b/] },
  { category: 'intercoms', patterns: [/\b(intercom|door\s+station|room\s+station)\b/] },
  { category: 'nvrs', patterns: [/\b(nvr|network\s+video\s+recorder)\b/] },
  { category: 'ip_cameras', patterns: [/\b(ip\s+camera|dome\s+camera|bullet\s+camera|ptz\s+camera)\b/] },
  { category: 'power_conditioner', patterns: [/\b(power\s+conditioner)\b/] },
  { category: 'smart_power_conditioner', patterns: [/\b(smart\s+power\s+conditioner|managed\s+power\s+conditioner)\b/] },
  { category: 'power_strip', patterns: [/\b(power\s+strip|pdu|rack\s+pdu)\b/] },
  { category: 'ups_backup', patterns: [/\b(ups|battery\s+backup|uninterruptible\s+power)\b/] }
];

const classifyCategoryByRules = (text) => {
  for (const rule of CATEGORY_RULES) {
    for (const pattern of rule.patterns) {
      if (pattern.test(text)) {
        return rule.category;
      }
    }
  }
  return null;
};

const correctDeviceType = (product) => {
  const text = `${product.brand} ${product.model} ${product.description}`.toLowerCase();
  const brand = String(product.brand || '').toLowerCase();
  const model = String(product.model || '').toLowerCase();

  // Exact known mappings first.
  if (brand.includes('sonos') && /\bport\b/.test(model)) {
    return 'media_streamers';
  }

  // Deterministic rule pass for all categories.
  const ruleCategory = classifyCategoryByRules(text);
  if (ruleCategory) {
    return ruleCategory;
  }

  return product.category;
};

const sanitizeProduct = (item) => {
  const brand = String(item?.brand || '').trim();
  const model = String(item?.model || '').trim();
  const description = String(item?.description || '').trim();
  const normalized = {
    brand,
    model,
    category: normalizeCategory(item?.category),
    description: description || `${brand} ${model}`.trim(),
    price: clampPrice(item?.price),
    input_connections: [],
    output_connections: [],
    control: {},
    specs: {}
  };
  normalized.category = correctDeviceType(normalized);
  return normalized;
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

const buildUserPrompt = ({ mode, category, brand, model, maxResults }) => {
  const scope =
    mode === 'category'
      ? category === 'all'
        ? 'across many AV categories'
        : `in the "${category}" category`
      : model
        ? `for the exact brand/model "${brand} ${model}"`
        : `for the brand "${brand}"`;

  return [
    `Find real, currently sold AV products ${scope}.`,
    'Use reliable product/manufacturer pages and current retailer pages.',
    `Return up to ${maxResults} items.`,
    `Allowed categories: ${IMPORT_CATEGORIES.join(', ')}.`,
    `Category guidance:\n- ${CATEGORY_GUIDANCE.join('\n- ')}`,
    'Do not classify streamers/media players as av_receivers.',
    'For Sonos Port, use media_streamers.',
    'Output only valid JSON matching the schema.'
  ].join('\n');
};

const buildSystemPrompt = () =>
  [
    'You are an AV hardware researcher.',
    'Prioritize well-known products and avoid fabricated entries.',
    'Each item must have: brand, model, category, description, price.',
    'Category must be one of the allowed snake_case values.',
    'Apply strict category semantics, especially for streamers vs receivers.',
    'If exact price is unavailable, set price to null.',
    'Do not include duplicates.'
  ].join(' ');

const callOpenAI = async ({ apiKey, baseUrl, model, mode, category, brand, modelQuery, maxResults }) => {
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
        { role: 'user', content: buildUserPrompt({ mode, category, brand, model: modelQuery, maxResults }) }
      ],
      text: {
        format: {
          type: 'json_schema',
          name: 'av_product_import',
          strict: true,
          schema: PRODUCT_SCHEMA
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
    throw new Error('No import data returned by product discovery provider');
  }

  const parsed = JSON.parse(text);
  return Array.isArray(parsed?.products) ? parsed.products : [];
};

export const importProductsFromWeb = async ({
  mode,
  category,
  brand,
  model,
  openaiApiKey,
  openaiModel,
  openaiBaseUrl
}) => {
  if (!openaiApiKey) {
    throw new Error('OPENAI_API_KEY is not configured');
  }

  const maxResults = mode === 'category' ? (category === 'all' ? 34 : 12) : model ? 3 : 12;

  const rawProducts = await callOpenAI({
    apiKey: openaiApiKey,
    baseUrl: openaiBaseUrl,
    model: openaiModel,
    mode,
    category,
    brand,
    modelQuery: model,
    maxResults
  });

  const dedupe = new Set();
  const sanitized = [];
  for (const raw of rawProducts) {
    const product = sanitizeProduct(raw);
    if (!product.brand || !product.model) {
      continue;
    }
    if (mode === 'category' && category && category !== 'all' && product.category !== category) {
      continue;
    }
    if (mode === 'search' && brand && !product.brand.toLowerCase().includes(brand.toLowerCase())) {
      continue;
    }

    const key = `${product.brand.toLowerCase()}::${product.model.toLowerCase()}`;
    if (dedupe.has(key)) {
      continue;
    }
    dedupe.add(key);
    sanitized.push(product);
  }

  return sanitized;
};
