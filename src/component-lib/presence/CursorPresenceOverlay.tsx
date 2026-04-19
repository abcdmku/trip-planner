export interface RenderedPresenceCursor {
  connectionId: string;
  name: string;
  color: string;
  renderedX: number;
  renderedY: number;
  isFading: boolean;
}

export interface CursorPresenceOverlayProps {
  cursors: RenderedPresenceCursor[];
}

function CursorPresenceMarker({ cursor }: { cursor: RenderedPresenceCursor }) {
  return (
    <div
      className={`absolute transition-opacity duration-200 ease-out ${
        cursor.isFading ? 'opacity-35' : 'opacity-100'
      }`}
      style={{
        left: `${Math.min(1, Math.max(0, cursor.renderedX)) * 100}%`,
        top: `${Math.min(1, Math.max(0, cursor.renderedY)) * 100}%`,
        transform: 'translate3d(0, 0, 0)',
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
  );
}

export function CursorPresenceOverlay({ cursors }: CursorPresenceOverlayProps) {
  return (
    <div className="pointer-events-none absolute inset-0 z-40" aria-hidden="true">
      {cursors.map((cursor) => (
        <CursorPresenceMarker key={cursor.connectionId} cursor={cursor} />
      ))}
    </div>
  );
}
