import { useCallback, useState } from 'react';
import { minutesToTime, resolveAppendDropAfterLast, resolveDraggedItemId, resolvePointDropNearest } from '@/lib/timeline-drop';
import type { Day, Item } from '@/types/trip';
import { toMins } from './time';
import type { CommitExternalDrop, ExternalDragPreview, ResolveExternalDrop } from './types';

interface UseExternalTimelineDropOptions {
  items: Item[];
  itemsById: Map<string, Item>;
  activeDragItemId: string | null;
  onUpdateItem?: (itemId: string, updates: Partial<Item>) => void;
  getScheduledItemsForDay: (dayId: string, excludeItemId: string) => Item[];
}

export function useExternalTimelineDrop({
  items,
  itemsById,
  activeDragItemId,
  onUpdateItem,
  getScheduledItemsForDay,
}: UseExternalTimelineDropOptions) {
  const [dayHeaderPreview, setDayHeaderPreview] = useState<ExternalDragPreview | null>(null);

  const resolveExternalDrop = useCallback<ResolveExternalDrop>(
    ({ itemId, day, mode, anchorMin }) => {
      const item = itemsById.get(itemId);
      if (!item) return null;

      // Locked items cannot be dropped onto the timeline
      if (item.timelineLocked) {
        return {
          itemId,
          dayId: day.dayId,
          mode,
          valid: false,
          startMin: anchorMin ?? 0,
          endMin: (anchorMin ?? 0) + (item.durationMinutes || 60),
          durationMinutes: item.durationMinutes || 60,
        };
      }

      const scheduledItems = getScheduledItemsForDay(day.dayId, itemId);
      const resolution =
        mode === 'append'
          ? resolveAppendDropAfterLast({ item, day, scheduledItems })
          : resolvePointDropNearest({ item, day, anchorMin: anchorMin ?? toMins(day.dayStart || '08:00') });

      return {
        itemId,
        dayId: day.dayId,
        mode,
        valid: resolution.valid,
        startMin: resolution.startMin,
        endMin: resolution.endMin,
        durationMinutes: resolution.durationMinutes,
      };
    },
    [getScheduledItemsForDay, itemsById],
  );

  const commitExternalDrop = useCallback<CommitExternalDrop>(
    (preview) => {
      if (!preview.valid || !onUpdateItem) return;

      const sourceItem = itemsById.get(preview.itemId);
      if (!sourceItem) return;

      const targetDayItemCount = items.filter(
        (item) => item.dayId === preview.dayId && item.itemId !== preview.itemId,
      ).length;
      const shouldMoveToEnd = preview.mode === 'append' || sourceItem.dayId !== preview.dayId;

      onUpdateItem(preview.itemId, {
        dayId: preview.dayId,
        scheduledStart: minutesToTime(preview.startMin),
        scheduledEnd: minutesToTime(preview.endMin),
        durationMinutes: preview.durationMinutes,
        ...(shouldMoveToEnd ? { sortOrder: targetDayItemCount } : {}),
      });

      setDayHeaderPreview(null);
    },
    [items, itemsById, onUpdateItem],
  );

  const clearDayHeaderPreview = useCallback(() => {
    setDayHeaderPreview(null);
  }, []);

  const handleDayHeaderDragOver = useCallback(
    (e: React.DragEvent, day: Day) => {
      const itemId = resolveDraggedItemId(e.dataTransfer, activeDragItemId);
      if (!itemId) return;

      const preview = resolveExternalDrop({ itemId, day, mode: 'append' });
      if (!preview) return;

      e.preventDefault();
      setDayHeaderPreview(preview);
      e.dataTransfer.dropEffect = preview.valid ? 'move' : 'none';
    },
    [activeDragItemId, resolveExternalDrop],
  );

  const handleDayHeaderDrop = useCallback(
    (e: React.DragEvent, day: Day) => {
      const itemId = resolveDraggedItemId(e.dataTransfer, activeDragItemId);
      if (!itemId) return;

      e.preventDefault();
      const preview = resolveExternalDrop({ itemId, day, mode: 'append' });
      if (preview?.valid) {
        commitExternalDrop(preview);
      } else {
        clearDayHeaderPreview();
      }
    },
    [activeDragItemId, clearDayHeaderPreview, commitExternalDrop, resolveExternalDrop],
  );

  const handleDayHeaderDragLeave = useCallback(
    (e: React.DragEvent) => {
      const relatedTarget = e.relatedTarget as Node | null;
      if (relatedTarget && e.currentTarget.contains(relatedTarget)) return;
      clearDayHeaderPreview();
    },
    [clearDayHeaderPreview],
  );

  return {
    dayHeaderPreview,
    setDayHeaderPreview,
    resolveExternalDrop,
    commitExternalDrop,
    clearDayHeaderPreview,
    handleDayHeaderDragOver,
    handleDayHeaderDrop,
    handleDayHeaderDragLeave,
  };
}
