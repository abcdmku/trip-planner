import React from 'react';
import ReactDOM from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './contexts/AuthContext';
import { UIProvider } from './contexts/UIContext';
import { ThemeProvider } from './hooks/useTheme';
import { SkipLink } from './components/shared/SkipLink';
import { router } from './App';
import './index.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      retry: 2,
    },
  },
});

const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID?.trim() ?? '';

function MissingGoogleOAuthConfig() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-theme px-6">
      <div className="max-w-lg rounded-3xl border border-red-200 bg-white p-8 shadow-lg shadow-red-100/60">
        <h1 className="text-2xl font-semibold tracking-tight text-stone-900">
          Google OAuth is not configured
        </h1>
        <p className="mt-4 text-sm leading-6 text-stone-600">
          Missing <code>VITE_GOOGLE_CLIENT_ID</code>. Add it to your
          <code> .env </code>
          file and restart the Vite dev server.
        </p>
        <p className="mt-3 text-sm leading-6 text-stone-500">
          This repository currently only includes <code>.env.example</code>, so
          the Google SDK is starting with an empty client ID and crashing during
          auth initialization.
        </p>
      </div>
    </div>
  );
}

if (!clientId) {
  console.error(
    'Missing VITE_GOOGLE_CLIENT_ID. Create a .env file from .env.example and restart the dev server.',
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider>
      {clientId ? (
        <GoogleOAuthProvider clientId={clientId}>
          <QueryClientProvider client={queryClient}>
            <AuthProvider>
              <UIProvider>
                <SkipLink />
                <RouterProvider router={router} />
              </UIProvider>
            </AuthProvider>
          </QueryClientProvider>
        </GoogleOAuthProvider>
      ) : (
        <MissingGoogleOAuthConfig />
      )}
    </ThemeProvider>
  </React.StrictMode>,
);
