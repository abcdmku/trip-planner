import { AlertTriangle, Check, RefreshCw, Wifi, WifiOff } from 'lucide-react';
import { StatusMessage } from './StatusMessage';

export interface SyncIndicatorProps {
  status: 'idle' | 'syncing' | 'synced' | 'error' | 'offline';
  lastSyncedAt?: Date;
  onRetry?: () => void;
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function SyncIndicator({ status, lastSyncedAt, onRetry }: SyncIndicatorProps) {
  return (
    <div className="flex items-center gap-2">
      {status === 'syncing' ? (
        <StatusMessage
          label="Syncing"
          tone="info"
          variant="inline"
          icon={<RefreshCw className="h-3.5 w-3.5 animate-spin" />}
        />
      ) : null}
      {status === 'synced' ? (
        <StatusMessage
          label="Saved"
          detail={lastSyncedAt ? formatTime(lastSyncedAt) : undefined}
          tone="success"
          variant="inline"
          icon={<Check className="h-3.5 w-3.5" />}
        />
      ) : null}
      {status === 'error' ? (
        <StatusMessage
          label="Sync failed"
          tone="danger"
          variant="inline"
          icon={<AlertTriangle className="h-3.5 w-3.5" />}
          actions={
            onRetry ? (
              <button
                type="button"
                onClick={onRetry}
                className="inline-flex items-center rounded-full border border-current/25 px-2 py-0.5 text-[10px] font-semibold transition-colors hover:bg-current/10"
              >
                Retry
              </button>
            ) : null
          }
        />
      ) : null}
      {status === 'offline' ? (
        <StatusMessage
          label="Offline"
          tone="warning"
          variant="inline"
          icon={<WifiOff className="h-3.5 w-3.5" />}
        />
      ) : null}
      {status === 'idle' ? (
        <StatusMessage
          label="Connected"
          tone="neutral"
          variant="inline"
          icon={<Wifi className="h-3.5 w-3.5" />}
        />
      ) : null}
    </div>
  );
}
