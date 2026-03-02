import React, { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase, isSupabaseConfigured } from '@/lib/supabaseClient';

const DEFAULT_REDIRECT = '/AVCanvas';

const getRedirectTarget = () => {
  const params = new URLSearchParams(window.location.search);
  const redirectTo = params.get('redirect_to');
  if (!redirectTo) return DEFAULT_REDIRECT;

  try {
    const parsed = new URL(redirectTo, window.location.origin);
    const hashParams = new URLSearchParams(parsed.hash.replace(/^#/, ''));
    const hasAuthHash =
      hashParams.has('access_token') ||
      hashParams.has('refresh_token') ||
      hashParams.has('sb') ||
      hashParams.has('type');

    if (hasAuthHash) {
      parsed.hash = '';
    }
    return parsed.toString();
  } catch {
    return DEFAULT_REDIRECT;
  }
};

const getAuthMode = () => {
  const params = new URLSearchParams(window.location.search);
  return params.get('mode') === 'signup' ? 'signup' : 'signin';
};

export default function Login() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  const redirectTarget = useMemo(() => getRedirectTarget(), []);
  const authMode = useMemo(() => getAuthMode(), []);
  const isSignup = authMode === 'signup';

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    if (!isSupabaseConfigured || !supabase) {
      setError('Supabase auth is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) {
      setError('Email is required.');
      return;
    }

    setLoading(true);
    try {
      const callbackUrl = new URL('/auth/callback', window.location.origin);
      callbackUrl.searchParams.set('redirect_to', redirectTarget);

      const { error: signInError } = await supabase.auth.signInWithOtp({
        email: normalizedEmail,
        options: {
          emailRedirectTo: callbackUrl.toString()
        }
      });

      if (signInError) {
        throw signInError;
      }
      setSent(true);
    } catch (err) {
      setError(err.message || 'Unable to send sign-in link.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-gray-900 border border-gray-800 rounded-xl p-6">
        <h1 className="text-2xl font-semibold mb-2">{isSignup ? 'Start Free' : 'Sign In'}</h1>
        <p className="text-sm text-gray-400 mb-6">
          {isSignup
            ? 'Enter your email to create your free account.'
            : 'Enter your email to receive a secure login link.'}
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@company.com"
            className="bg-gray-950 border-gray-700 text-white"
            disabled={loading || sent}
          />

          {error && <p className="text-sm text-red-400">{error}</p>}
          {sent && (
            <p className="text-sm text-green-400">
              {isSignup ? 'Check your email to finish creating your account.' : 'Check your email for the sign-in link.'}
            </p>
          )}

          <Button type="submit" disabled={loading || sent} className="w-full bg-blue-600 hover:bg-blue-700">
            {loading ? 'Sending...' : sent ? 'Link Sent' : isSignup ? 'Create Free Account' : 'Send Login Link'}
          </Button>
        </form>
      </div>
    </div>
  );
}
