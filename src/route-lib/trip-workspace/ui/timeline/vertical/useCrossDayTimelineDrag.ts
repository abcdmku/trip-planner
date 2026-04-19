import { useCallback, useEffect, useRef, useState } from 'react';
import { resolvePointDropNearest } from '@/lib/timeline-drop';
import type { Day, Item } from '@/types/trip';
import { snapM, toTime } from './time';
import type { CrossDayDragPreview, CrossDayMoveInfo, LiveItemPreview } from './types';

export function useCrossDayTimelineDrag({
  itemsById,
  orderedDays,
  dayColumnRefs,
  globalStartH,
  pxPerMin,
  snapMinutes,
  onUpdateItem,
  onLiveItemPreviewChange,
  onFocusDay,
}: {
  itemsById: Map<string, Item>;
  orderedDays: Day[];
  dayColumnRefs: React.MutableRefObject<Record<string, HTMLDivElement | null>>;
  globalStartH: number;
  pxPerMin: number;
  snapMinutes: number;
  onUpdateItem?: (itemId: string, updates: Partial<Item>) => void;
  onLiveItemPreviewChange?: (preview: LiveItemPreview | null) => void;
  onFocusDay: (dayId: string) => void;
}) {
  const [crossDayDrag, setCrossDayDrag] = useState<CrossDayDragPreview | null>(null);
  const crossDayDragRef = useRef<CrossDayDragPreview | null>(null);
  const cleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    return () => {
      cleanupRef.current?.();
    };
  }, []);

  const emitLiveItemPreview = useCallback(
    (preview: LiveItemPreview | null) => {
      onLiveItemPreviewChange?.(preview);
    },
    [onLiveItemPreviewChange],
  );

  const handleCrossDayMove = useCallback(
    (info: CrossDayMoveInfo) => {
      if (!onUpdateItem) return;

      const duration = info.origEndMin - info.origStartMin;

      const findTarget = (clientX: number, clientY: number): CrossDayDragPreview | null => {
        const sourceItem = itemsById.get(info.itemId);
        if (!sourceItem) return null;

        for (const day of orderedDays) {
          const column = dayColumnRefs.current[day.dayId];
          if (!column) continue;

          const rect = column.getBoundingClientRect();
          if (clientX < rect.left || clientX > rect.right) continue;

          const body = column.querySelector('[data-timeline-body]') as HTMLElement | null;
          if (!body) return null;

          const bodyRect = body.getBoundingClientRect();
          const rawY = clientY - bodyRect.top;
          const anchorMin = snapM(
            Math.max(0, Math.min(1440 - duration, rawY / pxPerMin + globalStartH * 60)),
            snapMinutes,
          );
          const resolution = resolvePointDropNearest({
            item: sourceItem,
            day,
            anchorMin,
            snapMinutes,
          });

          if (!resolution.valid) return null;

          return {
            itemId: info.itemId,
            targetDayId: day.dayId,
            startMin: resolution.startMin,
            endMin: resolution.endMin,
          };
        }

        return null;
      };

      const publishPreview = (preview: CrossDayDragPreview | null) => {
        crossDayDragRef.current = preview;
        setCrossDayDrag(preview);
        emitLiveItemPreview(
          preview
            ? {
                itemId: preview.itemId,
                dayId: preview.targetDayId,
                scheduledStart: toTime(preview.startMin),
                scheduledEnd: toTime(preview.endMin),
                durationMinutes: preview.endMin - preview.startMin,
                mode: 'move',
              }
            : null,
        );
      };

      publishPreview(findTarget(info.clientX, info.clientY));

      document.body.style.cursor = 'grabbing';
      document.body.style.userSelect = 'none';

      const handleMove = (event: PointerEvent) => {
        publishPreview(findTarget(event.clientX, event.clientY));
      };

      const handleUp = () => {
        const finalPreview = crossDayDragRef.current;
        cleanup();
        publishPreview(null);

        if (finalPreview) {
          onUpdateItem(finalPreview.itemId, {
            dayId: finalPreview.targetDayId,
            scheduledStart: toTime(finalPreview.startMin),
            scheduledEnd: toTime(finalPreview.endMin),
          });
          onFocusDay(finalPreview.targetDayId);
        }
      };

      const cleanup = () => {
        document.removeEventListener('pointermove', handleMove);
        document.removeEventListener('pointerup', handleUp);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
        cleanupRef.current = null;
      };

      cleanupRef.current?.();
      cleanupRef.current = cleanup;
      document.addEventListener('pointermove', handleMove);
      document.addEventListener('pointerup', handleUp);
    },
    [
      dayColumnRefs,
      emitLiveItemPreview,
      globalStartH,
      itemsById,
      onFocusDay,
      onUpdateItem,
      orderedDays,
      pxPerMin,
      snapMinutes,
    ],
  );

  return {
    crossDayDrag,
    handleCrossDayMove,
  };
}
