import type { CSSProperties, ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
import { TripPlannerLogo } from '@component-lib/shared/TripPlannerLogo';
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

const glowStyle: CSSProperties = {
  background:
    'radial-gradient(circle at 50% 42%, rgb(var(--color-accent) / 0.18) 0%, rgb(var(--color-accent) / 0.08) 20%, transparent 60%)',
};

const ambientLightStyle: CSSProperties = {
  background:
    'linear-gradient(180deg, rgb(var(--color-bg-elevated) / 0.48) 0%, transparent 100%)',
};

function AuthScene({
  children,
  footer,
}: {
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="relative isolate flex min-h-screen flex-col overflow-hidden bg-theme text-theme">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0" style={glowStyle} />
        <div className="absolute inset-x-0 top-0 h-64" style={ambientLightStyle} />
      </div>

      {children}

      {footer ? (
        <div className="relative z-10 px-6 pb-8 sm:pb-10">{footer}</div>
      ) : null}
    </div>
  );
}

function BrandLockup({
  appName,
  heading,
}: {
  appName: string;
  heading: string;
}) {
  const showsSeparateHeading = heading !== appName;

  return (
    <div className="flex flex-col items-center gap-4 text-center sm:gap-5">
      <TripPlannerLogo
        variant="mark"
        decorative
        className="h-16 w-12 sm:h-20 sm:w-16"
      />
      <div className="space-y-4">
        {showsSeparateHeading ? (
          <p className="text-[0.72rem] font-semibold uppercase tracking-[0.32em] text-theme-secondary">
            {appName}
          </p>
        ) : null}

        <div className="space-y-2">
          <h1 className="max-w-[12ch] text-balance text-4xl font-light tracking-tight text-theme sm:text-5xl">
            {heading}
          </h1>
        </div>
      </div>
    </div>
  );
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
      <AuthScene
        footer={
          <p className="mx-auto max-w-sm text-center text-xs leading-5 text-theme-secondary">
            Preparing your shared workspace
          </p>
        }
      >
        <div className="relative z-10 flex flex-1 items-center justify-center px-6 py-16 sm:px-10">
          <div className="flex flex-col items-center gap-8 text-center">
            <div className="animate-fade-up">
              <BrandLockup appName={appName} heading={appName} />
            </div>

            <div
              className="animate-fade-up inline-flex items-center gap-3 text-[0.72rem] font-semibold uppercase tracking-[0.32em] text-theme-secondary"
              style={{ animationDelay: '120ms' }}
            >
              <Loader2 className="h-4 w-4 animate-spin text-accent" />
              Checking your session
            </div>
          </div>
        </div>
      </AuthScene>
    );
  }

  return (
    <AuthScene
      footer={
        <p className="mx-auto max-w-sm text-center text-xs leading-5 text-theme-secondary">
          {supportNote}
        </p>
      }
    >
      <div className="relative z-10 flex flex-1 items-center justify-center px-6 pb-10 pt-16 sm:px-10">
        <div className="w-full max-w-xl">
          <div className="flex flex-col items-center text-center">
            <div className="animate-fade-up">
              <BrandLockup appName={appName} heading={heading} />
            </div>

            <p
              className="mt-8 max-w-md animate-fade-up text-balance text-base leading-7 text-theme-secondary sm:text-lg"
              style={{
                animationDelay: '120ms',
              }}
            >
              {description}
            </p>

            <div
              className="mt-10 animate-fade-up"
              style={{ animationDelay: '240ms' }}
            >
              <LoginButton
                onClick={() => {
                  if (onLogin) {
                    return onLogin();
                  }
                }}
                isLoading={isLoginLoading}
              />
            </div>
          </div>
        </div>
      </div>
    </AuthScene>
  );
}
