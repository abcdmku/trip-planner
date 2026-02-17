// ---------------------------------------------------------------------------
// AuthContext – Google OAuth authentication state for the Trip Planner.
//
// Wraps @react-oauth/google's implicit-flow login and exposes the access
// token, user profile, and login / logout helpers via React context.
// ---------------------------------------------------------------------------

import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useGoogleLogin, googleLogout } from '@react-oauth/google';
import { initGapiClient } from '@/lib/google-api';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface UserProfile {
  name: string;
  email: string;
  picture: string;
}

export interface AuthContextValue {
  /** Whether the user has a valid (non-expired) access token. */
  isAuthenticated: boolean;
  /** Current user profile, or `null` if unauthenticated. */
  user: UserProfile | null;
  /** Raw OAuth2 access token. */
  accessToken: string | null;
  /**
   * Log in the user.
   *
   * - Called **without** arguments: kicks off the Google OAuth implicit flow.
   * - Called **with** an `accessToken` string: directly stores the token
   *   (used when the `LoginButton` has already obtained a token externally).
   */
  login: (accessToken?: string) => void;
  /** Clear local auth state and revoke the Google session. */
  logout: () => void;
  /** True while we are fetching the user profile after token acquisition. */
  isLoading: boolean;
  /** True when the Google API client is ready to use. */
  isGapiReady: boolean;
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

export const AuthContext = createContext<AuthContextValue | null>(null);

// ---------------------------------------------------------------------------
// Storage keys
// ---------------------------------------------------------------------------

const STORAGE_KEY_TOKEN = 'tp_access_token';
const STORAGE_KEY_EXPIRY = 'tp_token_expiry';
const STORAGE_KEY_USER = 'tp_user_profile';

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function AuthProvider({ children }: { children: ReactNode }) {
  // -- State ---------------------------------------------------------------

  const [accessToken, setAccessToken] = useState<string | null>(() =>
    sessionStorage.getItem(STORAGE_KEY_TOKEN),
  );

  const [expiresAt, setExpiresAt] = useState<number>(() => {
    const stored = sessionStorage.getItem(STORAGE_KEY_EXPIRY);
    return stored ? Number(stored) : 0;
  });

  const [user, setUser] = useState<UserProfile | null>(() => {
    try {
      const stored = sessionStorage.getItem(STORAGE_KEY_USER);
      return stored ? (JSON.parse(stored) as UserProfile) : null;
    } catch {
      return null;
    }
  });

  const [isLoading, setIsLoading] = useState(false);
  const [isGapiReady, setIsGapiReady] = useState(false);

  // Track whether gapi has been initialised for the *current* token.
  const gapiInitRef = useRef(false);

  // -- Derived -------------------------------------------------------------

  const isAuthenticated = useMemo(
    () => !!accessToken && Date.now() < expiresAt,
    [accessToken, expiresAt],
  );

  // -- Side-effects --------------------------------------------------------

  // Initialise gapi whenever a valid token is available.
  useEffect(() => {
    if (!accessToken || !isAuthenticated) return;
    if (gapiInitRef.current) return;

    let cancelled = false;
    void (async () => {
      try {
        await initGapiClient(accessToken);
        if (!cancelled) {
          gapiInitRef.current = true;
          setIsGapiReady(true);
        }
      } catch (err) {
        console.error('[AuthContext] Failed to init gapi client:', err);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [accessToken, isAuthenticated]);

  // Periodically check for token expiry and clear auth state.
  useEffect(() => {
    if (!accessToken) return;

    const intervalId = window.setInterval(() => {
      if (Date.now() >= expiresAt) {
        clearAuthState();
      }
    }, 30_000); // check every 30 s

    return () => window.clearInterval(intervalId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken, expiresAt]);

  // -- Helpers -------------------------------------------------------------

  /** Persist token + expiry to sessionStorage. */
  const persistToken = useCallback(
    (token: string, expiresInSeconds: number) => {
      const expiry = Date.now() + expiresInSeconds * 1000;
      sessionStorage.setItem(STORAGE_KEY_TOKEN, token);
      sessionStorage.setItem(STORAGE_KEY_EXPIRY, String(expiry));
      setAccessToken(token);
      setExpiresAt(expiry);
      gapiInitRef.current = false; // force re-init with new token
    },
    [],
  );

  /** Clear all auth state from memory and sessionStorage. */
  const clearAuthState = useCallback(() => {
    sessionStorage.removeItem(STORAGE_KEY_TOKEN);
    sessionStorage.removeItem(STORAGE_KEY_EXPIRY);
    sessionStorage.removeItem(STORAGE_KEY_USER);
    setAccessToken(null);
    setExpiresAt(0);
    setUser(null);
    gapiInitRef.current = false;
    setIsGapiReady(false);
  }, []);

  /** Fetch the Google userinfo endpoint to populate the profile. */
  const fetchUserProfile = useCallback(
    async (token: string) => {
      setIsLoading(true);
      try {
        const res = await fetch(
          'https://www.googleapis.com/oauth2/v3/userinfo',
          { headers: { Authorization: `Bearer ${token}` } },
        );
        if (!res.ok) throw new Error(`userinfo responded ${res.status}`);
        const data = (await res.json()) as {
          name?: string;
          email?: string;
          picture?: string;
        };
        const profile: UserProfile = {
          name: data.name ?? '',
          email: data.email ?? '',
          picture: data.picture ?? '',
        };
        setUser(profile);
        sessionStorage.setItem(STORAGE_KEY_USER, JSON.stringify(profile));
      } catch (err) {
        console.error('[AuthContext] Failed to fetch user profile:', err);
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  // -- Login / Logout ------------------------------------------------------

  const googleLogin = useGoogleLogin({
    onSuccess: (tokenResponse) => {
      const token = tokenResponse.access_token;
      const expiresIn = tokenResponse.expires_in ?? 3600;
      persistToken(token, expiresIn);
      void fetchUserProfile(token);
    },
    onError: (err) => {
      console.error('[AuthContext] Google login error:', err);
    },
    scope: 'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email',
  });

  const login = useCallback(
    (tokenFromExternal?: string) => {
      if (tokenFromExternal) {
        // Token was already obtained externally (e.g. by <LoginButton>).
        // Default to 1 hour expiry since we don't have the exact value.
        persistToken(tokenFromExternal, 3600);
        void fetchUserProfile(tokenFromExternal);
      } else {
        googleLogin();
      }
    },
    [googleLogin, persistToken, fetchUserProfile],
  );

  const logout = useCallback(() => {
    googleLogout();
    clearAuthState();
  }, [clearAuthState]);

  // -- Context value -------------------------------------------------------

  const value = useMemo<AuthContextValue>(
    () => ({
      isAuthenticated,
      user,
      accessToken,
      login,
      logout,
      isLoading,
      isGapiReady,
    }),
    [isAuthenticated, user, accessToken, login, logout, isLoading, isGapiReady],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
