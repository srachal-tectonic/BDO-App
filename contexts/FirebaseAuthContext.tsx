'use client';

// TODO: Migrate authentication to Microsoft Entra ID (formerly Azure AD).
// All auth methods are stubbed until Entra ID integration is complete.

import React, { createContext, useContext, useState } from 'react';
import { UserInfo } from '@/types';

// A minimal user shape that callers expect. Replace with the Entra ID
// user object once the MSAL integration is wired up.
interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}

interface AuthContextType {
  currentUser: AuthUser | null;
  userInfo: UserInfo | null;
  isLoading: boolean;
  error: string | null;
  // TODO: Implement with Microsoft Entra ID / MSAL
  signIn: (email: string, password: string) => Promise<void>;
  // TODO: Remove or repurpose once Entra ID is integrated
  signInWithZohoToken: (customToken: string) => Promise<void>;
  // TODO: Implement with Microsoft Entra ID / MSAL
  signUp: (email: string, password: string, displayName: string, role?: string) => Promise<void>;
  // TODO: Implement with Microsoft Entra ID / MSAL
  logout: () => Promise<void>;
  // TODO: Implement with Microsoft Entra ID / MSAL (password reset handled by Entra ID portal)
  resetPassword: (email: string) => Promise<void>;
  refreshUserInfo: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useFirebaseAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useFirebaseAuth must be used within FirebaseAuthProvider');
  }
  return context;
}

// Alias kept so existing callers (e.g. login page) don't need changes yet.
export { useFirebaseAuth as useAuth };

// Dev bypass: allowed test accounts (development only)
const DEV_USERS: Record<string, { uid: string; displayName: string; role: UserInfo['role'] }> = {
  'srachal@tectonicfinancial.com': {
    uid: 'dev-srachal',
    displayName: 'Shane Rachal',
    role: 'Admin',
  },
};

const DEV_TOKEN = 'dev-bypass-token';

function isDevMode() {
  return process.env.NEXT_PUBLIC_APP_ENV === 'development' || process.env.NODE_ENV === 'development';
}

export function FirebaseAuthProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  // Start as false so the app doesn't spin indefinitely waiting for an
  // auth observer that doesn't exist yet.
  const [isLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // TODO: Replace with MSAL account change subscription once Entra ID is integrated.

  // Restore dev session on mount
  React.useEffect(() => {
    if (isDevMode() && typeof window !== 'undefined') {
      const stored = localStorage.getItem('dev-auth-user');
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          setCurrentUser(parsed.authUser);
          setUserInfo(parsed.userInfo);
        } catch {
          localStorage.removeItem('dev-auth-user');
          localStorage.removeItem('dev-auth-token');
        }
      }
    }
  }, []);

  const signIn = async (email: string, _password: string): Promise<void> => {
    // Dev bypass for testing without Entra ID
    if (isDevMode()) {
      const devUser = DEV_USERS[email.toLowerCase()];
      if (devUser) {
        const authUser: AuthUser = {
          uid: devUser.uid,
          email,
          displayName: devUser.displayName,
          photoURL: null,
        };
        const info: UserInfo = {
          uid: devUser.uid,
          email,
          displayName: devUser.displayName,
          photoURL: null,
          role: devUser.role,
        };
        setCurrentUser(authUser);
        setUserInfo(info);
        setError(null);
        localStorage.setItem('dev-auth-token', DEV_TOKEN);
        localStorage.setItem('dev-auth-user', JSON.stringify({ authUser, userInfo: info }));
        return;
      }
      setError('Dev mode: email not in allowed dev users list');
      throw new Error('Dev mode: email not in allowed dev users list');
    }

    setError('Not implemented - migrate to Microsoft Entra ID');
    throw new Error('Not implemented - migrate to Microsoft Entra ID');
  };

  // Custom token sign-in is no longer supported.
  const signInWithZohoToken = async (_customToken: string): Promise<void> => {
    setError('Not implemented - migrate to Microsoft Entra ID');
    throw new Error('Not implemented - migrate to Microsoft Entra ID');
  };

  const signUp = async (
    _email: string,
    _password: string,
    _displayName: string,
    _role: string = 'BDO',
  ): Promise<void> => {
    setError('Not implemented - migrate to Microsoft Entra ID');
    throw new Error('Not implemented - migrate to Microsoft Entra ID');
  };

  const logout = async (): Promise<void> => {
    if (isDevMode()) {
      setCurrentUser(null);
      setUserInfo(null);
      setError(null);
      localStorage.removeItem('dev-auth-token');
      localStorage.removeItem('dev-auth-user');
      return;
    }
    setError('Not implemented - migrate to Microsoft Entra ID');
    throw new Error('Not implemented - migrate to Microsoft Entra ID');
  };

  const resetPassword = async (_email: string): Promise<void> => {
    setError('Not implemented - migrate to Microsoft Entra ID');
    throw new Error('Not implemented - migrate to Microsoft Entra ID');
  };

  const refreshUserInfo = async (): Promise<void> => {
    // No-op until Entra ID integration populates currentUser.
  };

  const value: AuthContextType = {
    currentUser,
    userInfo,
    isLoading,
    error,
    signIn,
    signInWithZohoToken,
    logout,
    resetPassword,
    refreshUserInfo,
    signUp,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

// Keep the old provider name as an alias so layout files don't break.
export { FirebaseAuthProvider as AuthProvider };
