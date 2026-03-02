import { createClient } from '@supabase/supabase-js';
import { config, requireConfig } from '../config.js';

requireConfig('SUPABASE_URL', config.supabaseUrl);
requireConfig('SUPABASE_ANON_KEY', config.supabaseAnonKey);
requireConfig('SUPABASE_SERVICE_ROLE_KEY', config.supabaseServiceRoleKey);

export const supabaseAnon = createClient(config.supabaseUrl, config.supabaseAnonKey, {
  auth: {
    persistSession: false
  }
});

export const supabaseAdmin = createClient(config.supabaseUrl, config.supabaseServiceRoleKey, {
  auth: {
    persistSession: false
  }
});

