import type { PresenceCursor } from '@/types/api';

interface CursorPresenceOverlayProps {
  cursors: PresenceCursor[];
  currentConnectionId?: string | null;
}

export function CursorPresenceOverlay({
  cursors,
  currentConnectionId,
}: CursorPresenceOverlayProps) {
  return (
    <div className="pointer-events-none absolute inset-0 z-40 hidden md:block">
      {cursors
        .filter((cursor) => cursor.connectionId !== currentConnectionId)
        .map((cursor) => (
          <div
            key={cursor.connectionId}
            className="absolute transition-[left,top] duration-75 ease-out"
            style={{
              left: `${Math.min(1, Math.max(0, cursor.x)) * 100}%`,
              top: `${Math.min(1, Math.max(0, cursor.y)) * 100}%`,
            }}
          >
            <div className="relative -translate-x-0.5 -translate-y-0.5">
              <div
                className="h-3 w-3 rotate-45 rounded-[2px] border border-white/80 shadow-lg"
                style={{ backgroundColor: cursor.color }}
              />
              <div
                className="mt-1 rounded-full px-2 py-0.5 text-[10px] font-semibold text-white shadow-md"
                style={{ backgroundColor: cursor.color }}
              >
                {cursor.name}
              </div>
            </div>
          </div>
        ))}
    </div>
  );
}
