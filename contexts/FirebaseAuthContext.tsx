'use client';

// Authentication via Azure Easy Auth (Microsoft Entra ID).
// Azure handles the OAuth flow — we read user info from /.auth/me.

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { UserInfo } from '@/types';

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
  signIn: (email: string, password: string) => Promise<void>;
  signInWithZohoToken: (customToken: string) => Promise<void>;
  signUp: (email: string, password: string, displayName: string, role?: string) => Promise<void>;
  logout: () => Promise<void>;
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

// Microsoft Entra ID passes app roles via these claim URIs…
const AAD_ROLE_CLAIM_URIS = [
  'roles',
  'http://schemas.microsoft.com/ws/2008/06/identity/claims/role',
];

// …and security-group memberships (object IDs) via these:
const AAD_GROUP_CLAIM_URIS = [
  'groups',
  'http://schemas.microsoft.com/ws/2008/06/identity/claims/groups',
];

type AppRole = NonNullable<UserInfo['role']>;

// Higher precedence wins when a user is in multiple groups.
const ROLE_PRECEDENCE: AppRole[] = ['Admin', 'Manager', 'BDO'];

// Optional mapping from Azure AD security-group object IDs to app roles.
// Configure these in Azure App Service app settings if your tenant grants
// access via security groups rather than Entra ID app roles.
function buildGroupRoleMap(): Record<string, AppRole> {
  const map: Record<string, AppRole> = {};
  const admin = process.env.NEXT_PUBLIC_AZURE_GROUP_ID_ADMIN;
  const manager = process.env.NEXT_PUBLIC_AZURE_GROUP_ID_MANAGER;
  const bdo = process.env.NEXT_PUBLIC_AZURE_GROUP_ID_BDO;
  if (admin) map[admin] = 'Admin';
  if (manager) map[manager] = 'Manager';
  if (bdo) map[bdo] = 'BDO';
  return map;
}

function resolveRoleFromClaims(claims: Array<{ typ: string; val: string }>): AppRole {
  const groupMap = buildGroupRoleMap();
  const found = new Set<AppRole>();

  for (const c of claims) {
    if (AAD_ROLE_CLAIM_URIS.includes(c.typ)) {
      // Entra app-role values come through as the role name we configured.
      if (ROLE_PRECEDENCE.includes(c.val as AppRole)) {
        found.add(c.val as AppRole);
      }
    } else if (AAD_GROUP_CLAIM_URIS.includes(c.typ)) {
      const mapped = groupMap[c.val];
      if (mapped) found.add(mapped);
    }
  }

  for (const r of ROLE_PRECEDENCE) {
    if (found.has(r)) return r;
  }
  // Least-privilege default: a signed-in Entra user with no matching role
  // should still be able to use the BDO views, but not Admin Settings.
  return 'BDO';
}

// Parse the Azure Easy Auth /.auth/me response into our user shape
function parseEasyAuthUser(profile: Record<string, unknown>): { authUser: AuthUser; userInfo: UserInfo } | null {
  // Easy Auth returns an array of identity providers
  const claims = (profile as { user_claims?: Array<{ typ: string; val: string }> }).user_claims || [];
  const claimMap = new Map(claims.map((c) => [c.typ, c.val]));

  const email =
    claimMap.get('http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress') ||
    claimMap.get('preferred_username') ||
    (profile as { user_id?: string }).user_id ||
    null;

  const displayName =
    claimMap.get('name') ||
    claimMap.get('http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name') ||
    (email as string | null) ||
    null;

  const uid =
    claimMap.get('http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier') ||
    claimMap.get('http://schemas.microsoft.com/identity/claims/objectidentifier') ||
    (email as string) ||
    '';

  if (!uid) return null;

  const authUser: AuthUser = {
    uid,
    email: email as string | null,
    displayName: displayName as string | null,
    photoURL: null,
  };

  const userInfo: UserInfo = {
    uid,
    email: email as string | null,
    displayName: displayName as string | null,
    photoURL: null,
    role: resolveRoleFromClaims(claims),
  };

  return { authUser, userInfo };
}

// Fire-and-forget auth audit log
function logAuthEvent(event: string, data: Record<string, unknown>) {
  fetch('/api/auth/audit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ event, ...data }),
  }).catch(() => {}); // never block auth flow
}

export function FirebaseAuthProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEasyAuthUser = useCallback(async () => {
    try {
      const res = await fetch('/.auth/me');
      if (!res.ok) return null;
      const data = await res.json();
      // Easy Auth returns an array; first element is the active provider
      const profile = Array.isArray(data) ? data[0] : data;
      if (!profile) return null;
      return parseEasyAuthUser(profile);
    } catch {
      return null;
    }
  }, []);

  // On mount: check if user is already authenticated via Easy Auth or dev session
  useEffect(() => {
    let cancelled = false;

    async function init() {
      // Dev mode: restore from localStorage
      if (isDevMode() && typeof window !== 'undefined') {
        const stored = localStorage.getItem('dev-auth-user');
        if (stored) {
          try {
            const parsed = JSON.parse(stored);
            if (!cancelled) {
              setCurrentUser(parsed.authUser);
              setUserInfo(parsed.userInfo);
              setIsLoading(false);
            }
            return;
          } catch {
            localStorage.removeItem('dev-auth-user');
            localStorage.removeItem('dev-auth-token');
          }
        }
      }

      // Production: check Azure Easy Auth session
      const result = await fetchEasyAuthUser();
      if (!cancelled) {
        if (result) {
          setCurrentUser(result.authUser);
          setUserInfo(result.userInfo);
          logAuthEvent('login', {
            userId: result.authUser.uid,
            userEmail: result.authUser.email,
            userName: result.authUser.displayName,
          });
        }
        setIsLoading(false);
      }
    }

    init();
    return () => { cancelled = true; };
  }, [fetchEasyAuthUser]);

  const signIn = async (email: string, _password: string): Promise<void> => {
    // Dev bypass for testing
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
        logAuthEvent('login', { userId: devUser.uid, userEmail: email, userName: devUser.displayName });
        return;
      }
      setError('Dev mode: email not in allowed dev users list');
      logAuthEvent('login_failed', { userEmail: email, error: 'Email not in allowed dev users list' });
      throw new Error('Dev mode: email not in allowed dev users list');
    }

    // Production: redirect to Azure Easy Auth login
    window.location.href = '/.auth/login/aad?post_login_redirect_uri=/bdo/projects';
  };

  const signInWithZohoToken = async (_customToken: string): Promise<void> => {
    // No longer supported
    window.location.href = '/.auth/login/aad?post_login_redirect_uri=/bdo/projects';
  };

  const signUp = async (): Promise<void> => {
    // User management handled via Microsoft Entra ID
    setError('User registration is managed through Microsoft Entra ID. Contact your administrator.');
  };

  const logout = async (): Promise<void> => {
    const logoutUserId = currentUser?.uid;
    const logoutEmail = currentUser?.email;
    const logoutName = currentUser?.displayName;

    if (isDevMode()) {
      setCurrentUser(null);
      setUserInfo(null);
      setError(null);
      localStorage.removeItem('dev-auth-token');
      localStorage.removeItem('dev-auth-user');
      logAuthEvent('logout', { userId: logoutUserId, userEmail: logoutEmail, userName: logoutName });
      return;
    }

    // Clear local state and redirect to Easy Auth logout
    logAuthEvent('logout', { userId: logoutUserId, userEmail: logoutEmail, userName: logoutName });
    setCurrentUser(null);
    setUserInfo(null);
    window.location.href = '/.auth/logout?post_logout_redirect_uri=/bdo/login';
  };

  const resetPassword = async (_email: string): Promise<void> => {
    setError('Password reset is managed through Microsoft Entra ID. Use the Microsoft account portal.');
  };

  const refreshUserInfo = async (): Promise<void> => {
    const result = await fetchEasyAuthUser();
    if (result) {
      setCurrentUser(result.authUser);
      setUserInfo(result.userInfo);
    }
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

export { FirebaseAuthProvider as AuthProvider };
