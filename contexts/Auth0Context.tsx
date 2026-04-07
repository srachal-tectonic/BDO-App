'use client';

import React, { createContext, useContext, useMemo } from 'react';
import { Auth0Provider as Auth0ClientProvider, useUser } from '@auth0/nextjs-auth0/client';
import { UserInfo } from '@/types';

interface Auth0ContextType {
  userInfo: UserInfo | null;
  isLoading: boolean;
  error: Error | null | undefined;
  isAuthenticated: boolean;
}

const Auth0Context = createContext<Auth0ContextType | undefined>(undefined);

export function useAuth0Borrower() {
  const context = useContext(Auth0Context);
  if (!context) {
    throw new Error('useAuth0Borrower must be used within Auth0Provider');
  }
  return context;
}

interface Auth0ProviderProps {
  children: React.ReactNode;
}

function Auth0ContextProvider({ children }: { children: React.ReactNode }) {
  const { user, error, isLoading } = useUser();

  const userInfo = useMemo<UserInfo | null>(() => {
    if (!user) return null;

    return {
      uid: user.sub || '',
      email: user.email || null,
      displayName: user.name || null,
      photoURL: user.picture || null,
      role: 'Borrower',
    };
  }, [user]);

  const isAuthenticated = !!user;

  const value = {
    userInfo,
    isLoading,
    error,
    isAuthenticated,
  };

  return <Auth0Context.Provider value={value}>{children}</Auth0Context.Provider>;
}

export function Auth0Provider({ children }: Auth0ProviderProps) {
  return (
    <Auth0ClientProvider>
      <Auth0ContextProvider>{children}</Auth0ContextProvider>
    </Auth0ClientProvider>
  );
}
