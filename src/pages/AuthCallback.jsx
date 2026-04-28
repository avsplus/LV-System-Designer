import React, { useEffect, useState } from 'react';
import { appClient } from '@/api/appClient';
import { isSupabaseConfigured } from '@/lib/supabaseClient';

export default function AuthCallback() {
  const [message, setMessage] = useState('Completing sign-in...');

  useEffect(() => {
    const finishLogin = async () => {
      if (!isSupabaseConfigured) {
        setMessage('Supabase auth is not configured.');
        return;
      }

      const result = await appClient.completeAuthFromUrl();
      if (result.completed && result.redirectTo) {
        window.location.replace(result.redirectTo);
        return;
      }

      setMessage(result.error || 'Failed to complete sign-in.');
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
