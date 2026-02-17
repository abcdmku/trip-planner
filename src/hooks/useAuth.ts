// ---------------------------------------------------------------------------
// useAuth – convenience hook for consuming AuthContext.
// ---------------------------------------------------------------------------

import { useContext } from 'react';
import { AuthContext, type AuthContextValue } from '@/contexts/AuthContext';

/**
 * Returns the current {@link AuthContextValue}.
 *
 * Must be used inside an `<AuthProvider>`.  Throws a descriptive error if
 * the context is missing so that the call-site does not have to handle
 * `null`.
 */
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (ctx === null) {
    throw new Error(
      'useAuth() must be used within an <AuthProvider>. ' +
        'Wrap a parent component with <AuthProvider> from "@/contexts/AuthContext".',
    );
  }
  return ctx;
}
