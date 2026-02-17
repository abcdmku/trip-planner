import type { SyncState } from '../types/domain';

interface SyncStatusProps {
  state: SyncState;
  message: string;
  lastSyncedAt?: string;
}

export function SyncStatus({ state, message, lastSyncedAt }: SyncStatusProps) {
  const colorClass =
    state === 'syncing'
      ? 'bg-amber-500/20 text-amber-300'
      : state === 'error'
        ? 'bg-rose-500/20 text-rose-300'
        : 'bg-emerald-500/20 text-emerald-300';

  return (
    <div className={`rounded-lg px-3 py-2 text-xs font-medium ${colorClass}`}>
      <div>{message}</div>
      {lastSyncedAt ? <div className="mt-1 text-[11px] opacity-80">Last sync: {lastSyncedAt}</div> : null}
    </div>
  );
}
