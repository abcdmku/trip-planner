import type { PresenceCursor } from '@/types/api';

interface CursorPresenceOverlayProps {
  cursors: PresenceCursor[];
  currentUserId?: string;
}

export function CursorPresenceOverlay({
  cursors,
  currentUserId,
}: CursorPresenceOverlayProps) {
  return (
    <div className="pointer-events-none absolute inset-0 z-40 hidden md:block">
      {cursors
        .filter((cursor) => cursor.userId !== currentUserId)
        .map((cursor) => (
          <div
            key={cursor.connectionId}
            className="absolute transition-transform duration-75 ease-out"
            style={{
              transform: `translate(${cursor.x}px, ${cursor.y}px)`,
            }}
          >
            <div className="relative">
              <div
                className="h-4 w-4 rounded-full border-2 border-white shadow-lg"
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
