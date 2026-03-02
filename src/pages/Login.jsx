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
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  const [otpStep, setOtpStep] = useState(false);
  const redirectTarget = useMemo(() => getRedirectTarget(), []);
  const authMode = useMemo(() => getAuthMode(), []);
  const isSignup = authMode === 'signup';

  const buildCallbackUrl = () => {
    const callbackUrl = new URL('/auth/callback', window.location.origin);
    callbackUrl.searchParams.set('redirect_to', redirectTarget);
    return callbackUrl.toString();
  };

  const handleGoogleAuth = async () => {
    setError('');

    if (!isSupabaseConfigured || !supabase) {
      setError('Supabase auth is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
      return;
    }

    setLoading(true);
    try {
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: buildCallbackUrl()
        }
      });

      if (oauthError) {
        throw oauthError;
      }
    } catch (err) {
      setError(err.message || 'Unable to continue with Google.');
      setLoading(false);
    }
  };

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

    if (!password) {
      setError('Password is required.');
      return;
    }

    setLoading(true);
    try {
      if (isSignup) {
        if (password.length < 8) {
          throw new Error('Password must be at least 8 characters.');
        }
        if (password !== confirmPassword) {
          throw new Error('Passwords do not match.');
        }

        const { data, error: signUpError } = await supabase.auth.signUp({
          email: normalizedEmail,
          password,
          options: {
            emailRedirectTo: buildCallbackUrl()
          }
        });

        if (signUpError) {
          throw signUpError;
        }

        const sessionToken = data?.session?.access_token;
        if (sessionToken) {
          localStorage.setItem('auth_token', sessionToken);
          localStorage.setItem('sb-access-token', sessionToken);
          window.location.href = redirectTarget;
          return;
        }

        setSent(true);
        return;
      }

      // Sign-in flow: validate password first, then require one-time code.
      const { error: passwordError } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password
      });

      if (passwordError) {
        throw passwordError;
      }

      await supabase.auth.signOut();

      const { error: otpError } = await supabase.auth.signInWithOtp({
        email: normalizedEmail,
        options: {
          shouldCreateUser: false,
          emailRedirectTo: buildCallbackUrl()
        }
      });

      if (otpError) {
        throw otpError;
      }

      setOtpStep(true);
      setSent(true);
    } catch (err) {
      setError(err.message || 'Unable to send sign-in link.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async (event) => {
    event.preventDefault();
    setError('');

    if (!otpCode.trim()) {
      setError('Enter the one-time code from your email.');
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) {
      setError('Email is required.');
      return;
    }

    setLoading(true);
    try {
      const { data, error: verifyError } = await supabase.auth.verifyOtp({
        email: normalizedEmail,
        token: otpCode.trim(),
        type: 'email'
      });

      if (verifyError) {
        throw verifyError;
      }

      const accessToken = data?.session?.access_token;
      if (!accessToken) {
        throw new Error('Verification succeeded but no session was created.');
      }

      localStorage.setItem('auth_token', accessToken);
      localStorage.setItem('sb-access-token', accessToken);
      window.location.href = redirectTarget;
    } catch (err) {
      setError(err.message || 'Invalid code. Try again.');
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
            : 'Sign in with email and password, then verify with a one-time code.'}
        </p>

        <Button
          type="button"
          variant="outline"
          onClick={handleGoogleAuth}
          disabled={loading}
          className="w-full border-gray-700 text-white hover:bg-gray-800 mb-4"
        >
          Continue with Google
        </Button>

        {!otpStep ? (
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@company.com"
            className="bg-gray-950 border-gray-700 text-white"
            disabled={loading || sent}
          />
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={isSignup ? 'Create password (8+ chars)' : 'Password'}
            className="bg-gray-950 border-gray-700 text-white"
            disabled={loading || sent}
          />
          {isSignup && (
            <Input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm password"
              className="bg-gray-950 border-gray-700 text-white"
              disabled={loading || sent}
            />
          )}

          {error && <p className="text-sm text-red-400">{error}</p>}
          {sent && (
            <p className="text-sm text-green-400">
              {isSignup
                ? 'Check your email to finish creating your account.'
                : 'Password verified. Enter the one-time code sent to your email.'}
            </p>
          )}

          <Button type="submit" disabled={loading || sent} className="w-full bg-blue-600 hover:bg-blue-700">
            {loading
              ? 'Please wait...'
              : sent
                ? (isSignup ? 'Verification Sent' : 'Code Sent')
                : isSignup ? 'Create Free Account' : 'Continue'}
          </Button>
        </form>
        ) : (
          <form onSubmit={handleVerifyCode} className="space-y-4">
            <Input
              type="text"
              value={otpCode}
              onChange={(e) => setOtpCode(e.target.value)}
              placeholder="Enter one-time code"
              className="bg-gray-950 border-gray-700 text-white"
              disabled={loading}
            />
            {error && <p className="text-sm text-red-400">{error}</p>}
            <p className="text-xs text-gray-500">
              If your email provider sends a magic link instead of a code, open that link to complete sign-in.
            </p>
            <Button type="submit" disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700">
              {loading ? 'Verifying...' : 'Verify Code'}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
