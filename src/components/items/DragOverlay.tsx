import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { GripVertical } from 'lucide-react';
import type { Item } from '@/types/trip';

const TYPE_EMOJI: Record<string, string> = {
  attraction: '\u{1F3DB}\uFE0F',
  restaurant: '\u{1F37D}\uFE0F',
  hotel: '\u{1F3E8}',
  transport: '\u{1F68C}',
  activity: '\u{1F3AF}',
  other: '\u{1F4CD}',
};

interface DragOverlayProps {
  item: Item | null;
  dayColor: string;
  isOverTimeline: boolean;
}

export function DragOverlay({ item, dayColor, isOverTimeline }: DragOverlayProps) {
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (!item) {
      setPosition(null);
      return;
    }

    const handler = (e: DragEvent) => {
      // Some browsers fire drag events with 0,0 when leaving the window
      if (e.clientX === 0 && e.clientY === 0) return;
      setPosition({ x: e.clientX, y: e.clientY });
    };

    window.addEventListener('drag', handler);
    window.addEventListener('dragover', handler);
    return () => {
      window.removeEventListener('drag', handler);
      window.removeEventListener('dragover', handler);
    };
  }, [item]);

  if (!item || !position || isOverTimeline) return null;

  const emoji = TYPE_EMOJI[item.type] || '\u{1F4CD}';

  return createPortal(
    <div
      className="pointer-events-none fixed z-[9999]"
      style={{
        left: position.x + 12,
        top: position.y - 16,
      }}
    >
      <div
        className="flex items-center gap-2 rounded-lg border border-white/20 px-3 py-2 shadow-xl backdrop-blur-sm"
        style={{ backgroundColor: `${dayColor}ee` }}
      >
        <GripVertical className="h-3.5 w-3.5 text-white/50" />
        <span className="text-xs">{emoji}</span>
        <span className="max-w-[180px] truncate text-xs font-semibold text-white">
          {item.placeName}
        </span>
        {item.durationMinutes > 0 && (
          <span className="text-[10px] text-white/60">{item.durationMinutes}m</span>
        )}
      </div>
    </div>,
    document.body,
  );
}
