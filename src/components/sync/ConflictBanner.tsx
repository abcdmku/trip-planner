import { AlertTriangle, RefreshCw, X } from 'lucide-react';

interface ConflictBannerProps {
  message: string;
  onReload?: () => void;
  onDismiss?: () => void;
}

export function ConflictBanner({ message, onReload, onDismiss }: ConflictBannerProps) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3" role="alert">
      <AlertTriangle className="h-5 w-5 flex-shrink-0 text-amber-500" />
      <p className="flex-1 text-sm text-amber-800">{message}</p>
      <div className="flex items-center gap-1">
        {onReload && (
          <button
            onClick={onReload}
            className="flex items-center gap-1 rounded-lg bg-amber-500 px-3 py-1 text-xs font-semibold text-white hover:bg-amber-600"
          >
            <RefreshCw className="h-3 w-3" />
            Reload
          </button>
        )}
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="rounded-lg p-1 text-amber-400 hover:bg-amber-100 hover:text-amber-600"
            aria-label="Dismiss"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}
