import { Compass, Loader2 } from 'lucide-react';
import { LoginButton } from './LoginButton';

export interface AuthGuardScreenProps {
  mode: 'loading' | 'signedOut';
  onLogin?: () => Promise<void> | void;
  isLoginLoading?: boolean;
  appName?: string;
  heading?: string;
  description?: string;
  supportNote?: string;
}

export function AuthGuardScreen({
  mode,
  onLogin,
  isLoginLoading = false,
  appName = 'Trip Planner',
  heading = 'Trip Planner',
  description = 'Plan trips with shared editing, live presence, and a real database.',
  supportNote = 'Google sign-in is handled server-side',
}: AuthGuardScreenProps) {
  if (mode === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-theme">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-theme">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-accent/5 blur-3xl" />
        <div className="absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-accent/5 blur-3xl" />
      </div>

      <div className="relative z-10 flex flex-col items-center px-4 text-center">
        <div className="mb-8 flex items-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-accent shadow-lg shadow-accent/20">
            <Compass className="h-7 w-7 text-white dark:text-neutral-900" />
          </div>
          <div className="text-left">
            <h1 className="text-3xl font-semibold tracking-tight text-theme">{appName}</h1>
            <div className="h-0.5 w-12 rounded-full bg-accent" />
          </div>
        </div>

        <p className="mb-10 max-w-sm text-lg leading-relaxed text-theme-secondary">{description}</p>

        <LoginButton
          onClick={() => {
            if (onLogin) {
              return onLogin();
            }
          }}
          isLoading={isLoginLoading}
        />

        <p className="mt-8 text-xs text-theme-tertiary">{supportNote}</p>
        {heading !== appName ? <p className="sr-only">{heading}</p> : null}
      </div>
    </div>
  );
}
