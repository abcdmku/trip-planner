import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect, useRef, type ReactNode } from 'react';
import { AuthContext, type AuthContextValue } from '@/contexts/AuthContext';
import { RealtimeContext, type RealtimeContextValue } from '@/contexts/RealtimeContext';
import { UIContext, type UIContextValue } from '@/contexts/UIContext';
import { ThemeProvider, useTheme, type Theme } from '@/hooks/useTheme';

export interface StorybookAppContextOverrides {
  auth?: Partial<AuthContextValue>;
  realtime?: Partial<RealtimeContextValue>;
  ui?: Partial<UIContextValue>;
}

export function createStorybookQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        staleTime: Infinity,
      },
      mutations: {
        retry: false,
      },
    },
  });
}

export function createAuthContextValue(
  overrides: Partial<AuthContextValue> = {},
): AuthContextValue {
  return {
    isAuthenticated: true,
    user: {
      id: 'storybook-user',
      name: 'Storybook User',
      email: 'storybook@example.com',
      picture: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=128&q=80',
    },
    isLoading: false,
    login: async () => {},
    logout: async () => {},
    refreshSession: async () => {},
    ...overrides,
  };
}

export function createUIContextValue(overrides: Partial<UIContextValue> = {}): UIContextValue {
  return {
    sidebarOpen: true,
    activeTab: 'map',
    selectedDayIds: [],
    selectedItemId: null,
    activePanelView: 'itinerary',
    toggleSidebar: () => {},
    setSidebarOpen: () => {},
    setActiveTab: () => {},
    setSelectedDays: () => {},
    setSelectedItemId: () => {},
    setActivePanelView: () => {},
    ...overrides,
  };
}

export function createRealtimeContextValue(
  overrides: Partial<RealtimeContextValue> = {},
): RealtimeContextValue {
  return {
    connectionState: 'connected',
    localConnectionId: 'storybook-local',
    subscribeToTrip: () => {},
    unsubscribeFromTrip: () => {},
    sendCursor: () => {},
    clearCursor: () => {},
    sendItemPreview: () => {},
    sendSelection: () => {},
    sendViewport: () => {},
    getTripParticipants: () => [],
    getTripCursors: () => [],
    getTripItemPreviews: () => [],
    getTripSelections: () => [],
    getTripViewports: () => [],
    getRemoteEditNotice: () => null,
    dismissRemoteEditNotice: () => {},
    ...overrides,
  };
}

function ThemeSynchronizer({ theme }: { theme: Theme }) {
  const { setTheme } = useTheme();

  useEffect(() => {
    setTheme(theme);
  }, [setTheme, theme]);

  return null;
}

export function StorybookAppProviders({
  children,
  theme,
  overrides,
}: {
  children: ReactNode;
  theme: Theme;
  overrides?: StorybookAppContextOverrides;
}) {
  const queryClientRef = useRef<QueryClient | null>(null);
  if (!queryClientRef.current) {
    queryClientRef.current = createStorybookQueryClient();
  }

  return (
    <ThemeProvider>
      <ThemeSynchronizer theme={theme} />
      <QueryClientProvider client={queryClientRef.current}>
        <AuthContext.Provider value={createAuthContextValue(overrides?.auth)}>
          <RealtimeContext.Provider value={createRealtimeContextValue(overrides?.realtime)}>
            <UIContext.Provider value={createUIContextValue(overrides?.ui)}>
              {children}
            </UIContext.Provider>
          </RealtimeContext.Provider>
        </AuthContext.Provider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}
