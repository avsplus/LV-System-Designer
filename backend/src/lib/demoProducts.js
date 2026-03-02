import { supabaseAdmin } from './supabase.js';

export const DEVICE_CATEGORIES = [
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
  'routers',
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

const toTitleCase = (value) =>
  value
    .replace(/_/g, ' ')
    .split(' ')
    .map((word) => `${word.charAt(0).toUpperCase()}${word.slice(1)}`)
    .join(' ');

const demoBrandForCategory = (category) => `Demo ${toTitleCase(category)}`;

export const seedDemoProductsForOrganization = async (organizationId) => {
  if (!organizationId) {
    throw new Error('organizationId is required');
  }

  const { data: existingRows, error: existingError } = await supabaseAdmin
    .from('av_products')
    .select('category,brand')
    .eq('organization_id', organizationId)
    .in('category', DEVICE_CATEGORIES);

  if (existingError) {
    throw new Error(`Failed to query existing demo products: ${existingError.message}`);
  }

  const existingSet = new Set(
    (existingRows || []).map((row) => `${row.category}::${(row.brand || '').toLowerCase()}`)
  );

  const created = [];
  const existing = [];

  const insertRows = [];
  for (const category of DEVICE_CATEGORIES) {
    const demoBrand = demoBrandForCategory(category);
    const key = `${category}::${demoBrand.toLowerCase()}`;
    if (existingSet.has(key)) {
      existing.push(category);
      continue;
    }

    insertRows.push({
      organization_id: organizationId,
      brand: demoBrand,
      model: 'Demonstration Unit',
      category,
      description: 'Demo product for demonstration purposes',
      price: 0,
      input_connections: [],
      output_connections: [],
      control: {},
      specs: {}
    });
    created.push(category);
  }

  if (insertRows.length > 0) {
    const { error: insertError } = await supabaseAdmin.from('av_products').insert(insertRows);
    if (insertError) {
      throw new Error(`Failed to create demo products: ${insertError.message}`);
    }
  }

  return {
    created,
    existing
  };
};
