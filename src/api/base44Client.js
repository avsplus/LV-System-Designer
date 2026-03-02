import { createClient } from '@base44/sdk';
import { appParams } from '@/lib/app-params';

const { appId, serverUrl, token, functionsVersion } = appParams;

const hasValidBase44Config = Boolean(appId && serverUrl);

const createOfflineEntityApi = () => ({
  list: async () => [],
  filter: async () => [],
  create: async (payload = {}) => ({ id: crypto.randomUUID(), ...payload }),
  update: async (_id, payload = {}) => payload,
  delete: async () => ({ success: true }),
  subscribe: () => () => {}
});

const createOfflineBase44Client = () => ({
  auth: {
    me: async () => ({ data: null }),
    isAuthenticated: async () => false,
    updateMe: async () => ({ data: null }),
    logout: async () => {}
  },
  entities: new Proxy(
    {},
    {
      get: () => createOfflineEntityApi()
    }
  ),
  functions: {
    invoke: async () => ({ data: null })
  },
  integrations: {
    Core: {
      UploadFile: async () => ({ file_url: '' }),
      InvokeLLM: async () => ({ data: null }),
      SendEmail: async () => ({ success: true }),
      SendSMS: async () => ({ success: true }),
      GenerateImage: async () => ({ data: null }),
      ExtractDataFromUploadedFile: async () => ({ data: null })
    }
  },
  appLogs: {
    logUserInApp: async () => ({ success: true })
  }
});

// During migration, do not initialize Base44 SDK when required params are missing.
export const base44 = hasValidBase44Config
  ? createClient({
      appId,
      serverUrl,
      token,
      functionsVersion,
      requiresAuth: false
    })
  : createOfflineBase44Client();
