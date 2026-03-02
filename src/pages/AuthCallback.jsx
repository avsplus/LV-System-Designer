import React, { useEffect, useState } from 'react';
import { supabase, isSupabaseConfigured } from '@/lib/supabaseClient';

const DEFAULT_REDIRECT = '/AVCanvas';

const readRedirectTarget = () => {
  const params = new URLSearchParams(window.location.search);
  return params.get('redirect_to') || DEFAULT_REDIRECT;
};

export default function AuthCallback() {
  const [message, setMessage] = useState('Completing sign-in...');

  useEffect(() => {
    const finishLogin = async () => {
      const redirectTarget = readRedirectTarget();

      if (!isSupabaseConfigured || !supabase) {
        setMessage('Supabase auth is not configured.');
        return;
      }

      try {
        const params = new URLSearchParams(window.location.search);
        const code = params.get('code');
        const tokenHash = params.get('token_hash');
        const type = params.get('type');

        if (tokenHash && type) {
          const { error: verifyError } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type
          });
          if (verifyError) {
            throw verifyError;
          }
        }

        if (code) {
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
          if (exchangeError) {
            throw exchangeError;
          }
        }

        let accessToken = null;
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) {
          throw sessionError;
        }
        accessToken = sessionData?.session?.access_token || null;

        // Fallback for hash-based callbacks
        if (!accessToken && window.location.hash) {
          const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
          accessToken = hashParams.get('access_token');
        }

        if (!accessToken) {
          throw new Error('No access token found in auth callback.');
        }

        localStorage.setItem('auth_token', accessToken);
        localStorage.setItem('sb-access-token', accessToken);

        window.location.href = redirectTarget;
      } catch (error) {
        setMessage(error.message || 'Failed to complete sign-in.');
      }
    };

    finishLogin();
  }, []);

  return (
    <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-gray-900 border border-gray-800 rounded-xl p-6">
        <p className="text-sm text-gray-300">{message}</p>
      </div>
    </div>
  );
}
