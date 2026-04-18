import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { beginGoogleAuth, getSession, logoutSession } from '@/services/api-client';
import type { SessionUser } from '@/types/api';

export interface AuthContextValue {
  isAuthenticated: boolean;
  user: SessionUser | null;
  login: (nextPath?: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<void>;
  isLoading: boolean;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshSession = useCallback(async () => {
    setIsLoading(true);
    try {
      const nextUser = await getSession();
      setUser(nextUser);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshSession();
  }, [refreshSession]);

  const login = useCallback(async (nextPath = window.location.pathname + window.location.search) => {
    const url = await beginGoogleAuth(nextPath);
    window.location.assign(url);
  }, []);

  const logout = useCallback(async () => {
    await logoutSession();
    setUser(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      isAuthenticated: Boolean(user),
      user,
      login,
      logout,
      refreshSession,
      isLoading,
    }),
    [isLoading, login, logout, refreshSession, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
