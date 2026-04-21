import { LogOut, RefreshCw } from 'lucide-react';
import { StatusMessage } from './StatusMessage';

export interface ErrorRecoveryProps {
  error: Error;
  onRetry?: () => void;
  onLogout?: () => void;
  onDismiss?: () => void;
}

function isAuthenticationError(error: Error): boolean {
  const message = error.message.toLowerCase();
  return message.includes('401') || message.includes('token') || message.includes('auth');
}

export function ErrorRecovery({ error, onRetry, onLogout, onDismiss }: ErrorRecoveryProps) {
  const authError = isAuthenticationError(error);

  return (
    <StatusMessage
      label={authError ? 'Session expired' : 'Something went wrong'}
      detail={
        authError ? 'Your Google session has expired. Please sign in again.' : error.message
      }
      tone="danger"
      variant="banner"
      actions={
        <>
          {authError && onLogout ? (
            <button
              type="button"
              onClick={onLogout}
              className="inline-flex items-center gap-1 rounded-full border border-current/30 px-3 py-1.5 text-xs font-semibold transition-colors hover:bg-current/10"
            >
              <LogOut className="h-3 w-3" />
              Sign In Again
            </button>
          ) : null}
          {!authError && onRetry ? (
            <button
              type="button"
              onClick={onRetry}
              className="inline-flex items-center gap-1 rounded-full border border-current/30 px-3 py-1.5 text-xs font-semibold transition-colors hover:bg-current/10"
            >
              <RefreshCw className="h-3 w-3" />
              Retry
            </button>
          ) : null}
          {onDismiss ? (
            <button
              type="button"
              onClick={onDismiss}
              className="rounded-full border border-current/30 px-3 py-1.5 text-xs font-semibold transition-colors hover:bg-current/10"
            >
              Dismiss
            </button>
          ) : null}
        </>
      }
    />
  );
}
