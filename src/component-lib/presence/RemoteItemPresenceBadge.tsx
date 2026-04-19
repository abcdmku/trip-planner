import type { RemoteObjectPresence } from '@/types/collaboration';

export interface RemoteItemPresenceBadgeProps {
  presence: RemoteObjectPresence[];
}

function formatPresenceLabel(entry: RemoteObjectPresence): string {
  return entry.kind === 'selection' ? 'selecting' : entry.label.toLowerCase();
}

export function RemoteItemPresenceBadge({ presence }: RemoteItemPresenceBadgeProps) {
  if (presence.length === 0) {
    return null;
  }

  const visible = presence.slice(0, 2);
  const overflow = presence.length - visible.length;

  return (
    <div className="pointer-events-none absolute right-1.5 top-1.5 z-30 flex flex-wrap justify-end gap-1">
      {visible.map((entry) => (
        <div
          key={`${entry.connectionId}:${entry.kind}`}
          className="rounded-full px-2 py-0.5 text-[9px] font-semibold text-white shadow-md"
          style={{ backgroundColor: entry.color }}
          title={`${entry.name}: ${entry.label}`}
        >
          {entry.name.split(' ')[0]} {formatPresenceLabel(entry)}
        </div>
      ))}
      {overflow > 0 ? (
        <div className="rounded-full bg-theme-secondary px-2 py-0.5 text-[9px] font-semibold text-white shadow-md">
          +{overflow}
        </div>
      ) : null}
    </div>
  );
}
