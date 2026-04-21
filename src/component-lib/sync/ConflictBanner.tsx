import { RefreshCw, X } from 'lucide-react';
import { StatusMessage } from './StatusMessage';

export interface ConflictBannerProps {
  message: string;
  onReload?: () => void;
  onDismiss?: () => void;
}

export function ConflictBanner({ message, onReload, onDismiss }: ConflictBannerProps) {
  return (
    <StatusMessage
      label="Remote edits were detected"
      detail={message}
      tone="warning"
      variant="banner"
      actions={
        <>
          {onReload ? (
            <button
              type="button"
              onClick={onReload}
              className="inline-flex items-center gap-1 rounded-full border border-current/30 px-3 py-1.5 text-xs font-semibold transition-colors hover:bg-current/10"
            >
              <RefreshCw className="h-3 w-3" />
              Reload
            </button>
          ) : null}
          {onDismiss ? (
            <button
              type="button"
              onClick={onDismiss}
              className="rounded-full border border-current/30 px-2 py-1.5 text-xs font-semibold transition-colors hover:bg-current/10"
              aria-label="Dismiss"
            >
              <X className="h-4 w-4" />
            </button>
          ) : null}
        </>
      }
    />
  );
}
