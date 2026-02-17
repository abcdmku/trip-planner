import { RefreshCw, Check, AlertTriangle, Wifi, WifiOff } from 'lucide-react';

interface SyncIndicatorProps {
  status: 'idle' | 'syncing' | 'synced' | 'error' | 'offline';
  lastSyncedAt?: Date;
  onRetry?: () => void;
}

export function SyncIndicator({ status, lastSyncedAt, onRetry }: SyncIndicatorProps) {
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="flex items-center gap-2">
      {status === 'syncing' && (
        <span className="flex items-center gap-1.5 text-xs text-amber-600">
          <RefreshCw className="h-3.5 w-3.5 animate-spin" />
          Syncing...
        </span>
      )}
      {status === 'synced' && (
        <span className="flex items-center gap-1.5 text-xs text-emerald-600">
          <Check className="h-3.5 w-3.5" />
          Saved
          {lastSyncedAt && (
            <span className="text-stone-400">{formatTime(lastSyncedAt)}</span>
          )}
        </span>
      )}
      {status === 'error' && (
        <button
          onClick={onRetry}
          className="flex items-center gap-1.5 text-xs text-red-500 transition-colors hover:text-red-600"
        >
          <AlertTriangle className="h-3.5 w-3.5" />
          Sync failed
          {onRetry && <span className="underline">Retry</span>}
        </button>
      )}
      {status === 'offline' && (
        <span className="flex items-center gap-1.5 text-xs text-stone-400">
          <WifiOff className="h-3.5 w-3.5" />
          Offline
        </span>
      )}
      {status === 'idle' && (
        <span className="flex items-center gap-1.5 text-xs text-stone-400">
          <Wifi className="h-3.5 w-3.5" />
          Connected
        </span>
      )}
    </div>
  );
}
