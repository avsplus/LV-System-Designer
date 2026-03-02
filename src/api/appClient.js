const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';
import { supabase } from '@/lib/supabaseClient';

const RAW_LOGIN_URL = import.meta.env.VITE_LOGIN_URL || '/login';

const resolveLoginUrl = () => {
  const raw = (RAW_LOGIN_URL || '').trim();
  if (!raw) {
    return '/login';
  }

  const looksLikePlaceholder =
    raw.includes('YOUR-REAL-LOGIN-URL') ||
    raw.includes('<') ||
    raw.includes('real-login-url');

  if (looksLikePlaceholder) {
    return '/login';
  }

  return raw;
};

const LOGIN_URL = resolveLoginUrl();

const TOKEN_KEYS = ['auth_token', 'sb-access-token'];

const persistTokenFromUrl = () => {
  const params = new URLSearchParams(window.location.search);
  let tokenFromUrl = params.get('access_token');
  let hashParams = null;

  if (!tokenFromUrl && window.location.hash) {
    hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    tokenFromUrl = hashParams.get('access_token');
  }

  if (!tokenFromUrl) {
    return;
  }

  localStorage.setItem('auth_token', tokenFromUrl);
  localStorage.setItem('sb-access-token', tokenFromUrl);

  params.delete('access_token');
  if (hashParams) {
    hashParams.delete('access_token');
    hashParams.delete('refresh_token');
    hashParams.delete('expires_at');
    hashParams.delete('expires_in');
    hashParams.delete('token_type');
    hashParams.delete('type');
  }

  const nextHash = hashParams ? hashParams.toString() : window.location.hash.replace(/^#/, '');
  const newUrl = `${window.location.pathname}${params.toString() ? `?${params.toString()}` : ''}${nextHash ? `#${nextHash}` : ''}`;
  window.history.replaceState({}, document.title, newUrl);
};

persistTokenFromUrl();

const getToken = () => {
  // Supabase stores session in keys like: sb-<project-ref>-auth-token.
  // Prefer this token over legacy localStorage keys to avoid stale auth_token loops.
  const supabaseKey = Object.keys(localStorage).find(
    (key) => key.startsWith('sb-') && key.endsWith('-auth-token')
  );
  if (supabaseKey) {
    try {
      const raw = localStorage.getItem(supabaseKey);
      const parsed = raw ? JSON.parse(raw) : null;
      const token =
        parsed?.access_token ||
        parsed?.currentSession?.access_token ||
        parsed?.session?.access_token ||
        parsed?.data?.session?.access_token;

      if (token) {
        localStorage.setItem('auth_token', token);
        return token;
      }
    } catch {
      // Ignore malformed local storage payloads and continue unauthenticated.
    }
  }

  // Migration-compatible token lookup fallback.
  for (const key of TOKEN_KEYS) {
    const token = localStorage.getItem(key);
    if (token) {
      return token;
    }
  }

  return null;
};

const clearTokens = () => {
  for (const key of TOKEN_KEYS) {
    localStorage.removeItem(key);
  }
};

const unwrapRedirectTarget = (value) => {
  let target = value;
  let safety = 0;

  while (target && safety < 10) {
    try {
      const parsed = new URL(target, window.location.origin);
      const nested = parsed.searchParams.get('redirect_to');
      if (!nested) {
        break;
      }
      target = decodeURIComponent(nested);
      safety += 1;
    } catch {
      break;
    }
  }

  return target;
};

async function request(path, options = {}) {
  const token = getToken();
  const headers = {
    ...(options.headers || {})
  };

  const method = (options.method || 'GET').toUpperCase();
  const hasBody = options.body !== undefined && options.body !== null;

  if (hasBody && method !== 'GET' && method !== 'HEAD') {
    headers['Content-Type'] = headers['Content-Type'] || 'application/json';
  }

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data?.error || `Request failed (${response.status})`);
  }
  return data;
}

const toQueryString = (params = {}) => {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') {
      return;
    }
    search.set(key, String(value));
  });
  const value = search.toString();
  return value ? `?${value}` : '';
};

const readAsBase64 = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || '');
      const [, base64 = ''] = result.split(',');
      resolve(base64);
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });

export const appClient = {
  getMe: () => request('/api/me'),
  updateMe: (payload) =>
    request('/api/me', {
      method: 'PATCH',
      body: JSON.stringify(payload)
    }),
  isAuthenticated: async () => {
    try {
      await request('/api/me');
      return true;
    } catch {
      return false;
    }
  },
  logout: (redirectUrl) => {
    if (supabase) {
      supabase.auth.signOut().catch(() => {});
    }
    clearTokens();
    if (redirectUrl) {
      window.location.href = redirectUrl;
    }
  },
  redirectToLogin: (returnTo) => {
    let url;
    try {
      url = new URL(LOGIN_URL, window.location.origin);
    } catch {
      url = new URL('/login', window.location.origin);
    }
    const current = new URL(window.location.href);
    const isAlreadyOnLoginPath = current.pathname === url.pathname;

    // Prevent self-loop redirects when we're already on the login/landing page.
    if (isAlreadyOnLoginPath && current.searchParams.get('redirect_to')) {
      return;
    }

    const rawTarget = returnTo || window.location.href;
    const normalizedTarget = unwrapRedirectTarget(rawTarget);
    if (normalizedTarget) {
      url.searchParams.set('redirect_to', normalizedTarget);
    }
    window.location.href = url.toString();
  },
  getCurrentOrganization: () => request('/api/organizations/current'),
  getBootstrap: () => request('/api/bootstrap'),
  createOrganization: (payload) =>
    request('/api/organizations', {
      method: 'POST',
      body: JSON.stringify(payload)
    }),
  acceptInvitation: (payload) =>
    request('/api/invitations/accept', {
      method: 'POST',
      body: JSON.stringify(payload)
    }),
  sendInvitation: (payload) =>
    request('/api/invitations/send', {
      method: 'POST',
      body: JSON.stringify(payload)
    }),
  getBillingSubscription: () => request('/api/billing/subscription'),
  createCheckoutSession: (payload) =>
    request('/api/billing/checkout-session', {
      method: 'POST',
      body: JSON.stringify(payload)
    }),
  createPortalSession: (payload) =>
    request('/api/billing/portal-session', {
      method: 'POST',
      body: JSON.stringify(payload)
    }),
  listProjects: async (params = {}) => {
    const result = await request(`/api/projects${toQueryString(params)}`);
    return result.projects || [];
  },
  getProject: async (id) => {
    const result = await request(`/api/projects/${id}`);
    return result.project;
  },
  createProject: async (payload) => {
    const result = await request('/api/projects', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    return result.project;
  },
  updateProject: async (id, payload) => {
    const result = await request(`/api/projects/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload)
    });
    return result.project;
  },
  deleteProject: (id) =>
    request(`/api/projects/${id}`, {
      method: 'DELETE'
    }),
  listProducts: async (params = {}) => {
    const result = await request(`/api/products${toQueryString(params)}`);
    return result.products || [];
  },
  createProduct: async (payload) => {
    const result = await request('/api/products', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    return result.product;
  },
  updateProduct: async (id, payload) => {
    const result = await request(`/api/products/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload)
    });
    return result.product;
  },
  deleteProduct: (id) =>
    request(`/api/products/${id}`, {
      method: 'DELETE'
    }),
  importProducts: async (payload) => request('/api/products/import', {
    method: 'POST',
    body: JSON.stringify(payload)
  }),
  enrichProductConnections: async (payload) => request('/api/products/enrich-connections', {
    method: 'POST',
    body: JSON.stringify(payload)
  }),
  cleanupProductConnections: async () => request('/api/products/cleanup-connections', {
    method: 'POST',
    body: JSON.stringify({})
  }),
  exportPdfCloud: async (payload) => request('/api/exports/pdf', {
    method: 'POST',
    body: JSON.stringify(payload)
  }),
  listWirePricing: async () => {
    const result = await request('/api/wire-pricing');
    return result.wire_pricing || [];
  },
  createWirePricing: async (payload) => {
    const result = await request('/api/wire-pricing', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    return result.wire_pricing;
  },
  updateWirePricing: async (id, payload) => {
    const result = await request(`/api/wire-pricing/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload)
    });
    return result.wire_pricing;
  },
  deleteWirePricing: (id) =>
    request(`/api/wire-pricing/${id}`, {
      method: 'DELETE'
    }),
  uploadFile: async ({ file, folder = 'general' }) => {
    if (!file) {
      throw new Error('No file provided');
    }

    const dataBase64 = await readAsBase64(file);
    return request('/api/files/upload', {
      method: 'POST',
      body: JSON.stringify({
        file_name: file.name,
        mime_type: file.type || 'application/octet-stream',
        data_base64: dataBase64,
        folder
      })
    });
  }
};
