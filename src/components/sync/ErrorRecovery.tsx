import { AlertTriangle, RefreshCw, LogOut } from 'lucide-react';

interface ErrorRecoveryProps {
  error: Error;
  onRetry?: () => void;
  onLogout?: () => void;
  onDismiss?: () => void;
}

export function ErrorRecovery({ error, onRetry, onLogout, onDismiss }: ErrorRecoveryProps) {
  const isAuthError =
    error.message.includes('401') ||
    error.message.includes('token') ||
    error.message.includes('auth');

  return (
    <div className="rounded-xl border border-red-200 bg-red-50 p-4" role="alert">
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-500" />
        <div className="flex-1">
          <h4 className="text-sm font-semibold text-red-800">
            {isAuthError ? 'Session Expired' : 'Something Went Wrong'}
          </h4>
          <p className="mt-1 text-xs text-red-600">
            {isAuthError
              ? 'Your Google session has expired. Please sign in again.'
              : error.message}
          </p>
          <div className="mt-3 flex gap-2">
            {isAuthError && onLogout ? (
              <button
                onClick={onLogout}
                className="flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700"
              >
                <LogOut className="h-3 w-3" />
                Sign In Again
              </button>
            ) : onRetry ? (
              <button
                onClick={onRetry}
                className="flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700"
              >
                <RefreshCw className="h-3 w-3" />
                Retry
              </button>
            ) : null}
            {onDismiss && (
              <button
                onClick={onDismiss}
                className="rounded-lg px-3 py-1.5 text-xs text-red-600 hover:bg-red-100"
              >
                Dismiss
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
