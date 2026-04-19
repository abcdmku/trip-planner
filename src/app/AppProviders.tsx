import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useRef, type ReactNode } from 'react';
import { AuthProvider } from '@/contexts/AuthContext';
import { RealtimeProvider } from '@/contexts/RealtimeContext';
import { UIProvider } from '@/contexts/UIContext';
import { ThemeProvider } from '@/hooks/useTheme';
import { SkipLink } from '@component-lib/shared/SkipLink';

function createAppQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 1000 * 60 * 5,
        retry: 2,
      },
    },
  });
}

export function AppProviders({ children }: { children: ReactNode }) {
  const queryClientRef = useRef<QueryClient | null>(null);
  if (!queryClientRef.current) {
    queryClientRef.current = createAppQueryClient();
  }

  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClientRef.current}>
        <AuthProvider>
          <RealtimeProvider>
            <UIProvider>
              <SkipLink />
              {children}
            </UIProvider>
          </RealtimeProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}
