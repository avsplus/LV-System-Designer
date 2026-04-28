import React, { createContext, useState, useContext, useEffect } from 'react';
import { appClient } from '@/api/appClient';
import { supabase, isSupabaseConfigured } from '@/lib/supabaseClient';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoadingPublicSettings, setIsLoadingPublicSettings] = useState(false);
  const [authError, setAuthError] = useState(null);
  const [appPublicSettings] = useState(null);

  useEffect(() => {
    checkAppState();
  }, []);

  const checkAppState = async () => {
    try {
      setIsLoadingAuth(true);
      setAuthError(null);

      const authCompletion = await appClient.completeAuthFromUrl();
      if (authCompletion?.error) {
        setAuthError({
          type: 'auth_callback_error',
          message: authCompletion.error
        });
        setIsAuthenticated(false);
        setUser(null);
        setIsLoadingAuth(false);
        return;
      }

      if (authCompletion?.completed && authCompletion.redirectTo) {
        window.location.replace(authCompletion.redirectTo);
        return;
      }

      await checkUserAuth();
    } catch (error) {
      console.error('Unexpected error:', error);
      setAuthError({
        type: 'unknown',
        message: error.message || 'An unexpected error occurred'
      });
      setIsLoadingAuth(false);
    }
  };

  const checkUserAuth = async () => {
    const hydrateTokenFromSupabase = async () => {
      if (!isSupabaseConfigured || !supabase) {
        return false;
      }

      const { data, error } = await supabase.auth.getSession();
      if (error) {
        return false;
      }

      const token = data?.session?.access_token;
      if (!token) {
        return false;
      }

      localStorage.setItem('auth_token', token);
      localStorage.setItem('sb-access-token', token);
      return true;
    };

    try {
      setIsLoadingAuth(true);
      const response = await appClient.getMe();
      setUser(response.user);
      setIsAuthenticated(true);
      setAuthError(null);
      setIsLoadingAuth(false);
    } catch (error) {
      console.error('User auth check failed:', error);
      const tokenRecovered = await hydrateTokenFromSupabase();
      if (tokenRecovered) {
        try {
          const response = await appClient.getMe();
          setUser(response.user);
          setIsAuthenticated(true);
          setAuthError(null);
          setIsLoadingAuth(false);
          return;
        } catch (retryError) {
          console.error('User auth retry failed:', retryError);
        }
      }

      setIsLoadingAuth(false);
      setIsAuthenticated(false);
      setUser(null);

      setAuthError({
        type: 'auth_required',
        message: 'Authentication required'
      });
    }
  };

  const logout = (shouldRedirect = true) => {
    setUser(null);
    setIsAuthenticated(false);
    
    if (shouldRedirect) {
      appClient.logout(window.location.origin);
    } else {
      appClient.logout();
    }
  };

  const navigateToLogin = () => {
    appClient.redirectToLogin(window.location.href);
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      isAuthenticated, 
      isLoadingAuth,
      isLoadingPublicSettings,
      authError,
      appPublicSettings,
      logout,
      navigateToLogin,
      checkAppState
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
