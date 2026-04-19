import type { ReactNode } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { AuthGuardScreen } from '@component-lib/auth/AuthGuardScreen';

interface AuthGuardProps {
  children: ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps) {
  const { isAuthenticated, isLoading, login } = useAuth();

  if (isLoading) {
    return <AuthGuardScreen mode="loading" />;
  }

  if (isAuthenticated) {
    return <>{children}</>;
  }

  return (
    <AuthGuardScreen mode="signedOut" onLogin={() => login()} />
  );
}
