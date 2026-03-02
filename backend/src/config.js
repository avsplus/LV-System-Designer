import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.resolve(__dirname, '..', '.env');

dotenv.config({ path: envPath });

const parseOrigins = (raw) => {
  if (!raw) {
    return ['http://localhost:5173'];
  }

  return raw
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
};

export const config = {
  port: Number(process.env.PORT || 4000),
  nodeEnv: process.env.NODE_ENV || 'development',
  appBaseUrl: process.env.APP_BASE_URL || 'http://localhost:5173',
  corsOrigins: parseOrigins(process.env.CORS_ORIGINS),
  supabaseUrl: process.env.SUPABASE_URL || '',
  supabaseAnonKey: process.env.SUPABASE_ANON_KEY || '',
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  stripeApiKey: process.env.STRIPE_API_KEY || '',
  stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
  stripePricePro: process.env.STRIPE_PRICE_PRO || '',
  stripePriceEnterprise: process.env.STRIPE_PRICE_ENTERPRISE || '',
  resendApiKey: process.env.RESEND_API_KEY || '',
  emailFromAddress: process.env.EMAIL_FROM_ADDRESS || 'onboarding@resend.dev',
  emailFromName: process.env.EMAIL_FROM_NAME || 'AV System Design',
  storageBucket: process.env.SUPABASE_STORAGE_BUCKET || 'uploads',
  openaiApiKey: process.env.OPENAI_API_KEY || '',
  openaiModel: process.env.OPENAI_MODEL || 'gpt-4.1',
  openaiBaseUrl: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
  apiTemplateApiKey: process.env.APITEMPLATE_API_KEY || '',
  apiTemplateEndpoint: process.env.APITEMPLATE_ENDPOINT || 'https://rest.apitemplate.io/v2/create-pdf',
  apiTemplateTemplateDefault: process.env.APITEMPLATE_TEMPLATE_ID || '',
  apiTemplateTemplateInstaller: process.env.APITEMPLATE_TEMPLATE_INSTALLER || '',
  apiTemplateTemplateClient: process.env.APITEMPLATE_TEMPLATE_CLIENT || '',
  apiTemplateTemplateDocumentation: process.env.APITEMPLATE_TEMPLATE_DOCUMENTATION || ''
};

export const requireConfig = (name, value) => {
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
};
