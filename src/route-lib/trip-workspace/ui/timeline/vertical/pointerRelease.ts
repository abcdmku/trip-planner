import type { MutableRefObject } from 'react';
import { isRangeAllowedForDate } from '@/lib/availability';
import type { Item } from '@/types/trip';
import { DEFAULT_DUR } from './constants';
import { toTime } from './time';
import type { PtrTrack } from './types';

interface PointerCallbacks {
  onCreateAtTime?: (startTime: string, endTime: string) => void;
  onUpdateItem?: (itemId: string, updates: Partial<Item>) => void;
  onItemClick?: (itemId: string) => void;
  onItemDoubleClick?: (itemId: string) => void;
}

interface HandlePointerReleaseParams {
  pointer: PtrTrack;
  dayDate: string;
  itemsById: Map<string, Item>;
  callbacks: PointerCallbacks;
  lastClickRef: MutableRefObject<{ itemId: string; time: number } | null>;
  lastBgClickRef: MutableRefObject<{ anchorMin: number; time: number } | null>;
}

export function handlePointerRelease({
  pointer,
  dayDate,
  itemsById,
  callbacks,
  lastClickRef,
  lastBgClickRef,
}: HandlePointerReleaseParams): { didCommit: boolean } {
  const { onCreateAtTime, onUpdateItem, onItemClick, onItemDoubleClick } = callbacks;

  if (!pointer.activated) {
    if (pointer.action === 'create') {
      const now = Date.now();
      const lastBg = lastBgClickRef.current;
      if (lastBg && Math.abs(lastBg.anchorMin - pointer.anchorMin) < 30 && now - lastBg.time < 400) {
        lastBgClickRef.current = null;
        onCreateAtTime?.(toTime(pointer.anchorMin), toTime(pointer.anchorMin + DEFAULT_DUR));
      } else {
        lastBgClickRef.current = { anchorMin: pointer.anchorMin, time: now };
      }
      return { didCommit: false };
    }

    if (pointer.itemId) {
      const now = Date.now();
      const last = lastClickRef.current;
      if (last && last.itemId === pointer.itemId && now - last.time < 400) {
        lastClickRef.current = null;
        onItemDoubleClick?.(pointer.itemId);
      } else {
        lastClickRef.current = { itemId: pointer.itemId, time: now };
        onItemClick?.(pointer.itemId);
      }
    }

    return { didCommit: false };
  }

  switch (pointer.action) {
    case 'create': {
      onCreateAtTime?.(toTime(pointer.curStartMin), toTime(pointer.curEndMin));
      return { didCommit: false };
    }

    case 'move': {
      if (!pointer.itemId || pointer.curDelta === 0) return { didCommit: false };

      const sourceItem = itemsById.get(pointer.itemId);
      const startMin = (pointer.origStartMin ?? 0) + pointer.curDelta;
      const duration = (pointer.origEndMin ?? 0) - (pointer.origStartMin ?? 0);

      if (sourceItem?.timelineLocked) return { didCommit: false };
      if (
        sourceItem &&
        !isRangeAllowedForDate(
          sourceItem.availabilityWindows,
          dayDate,
          toTime(startMin),
          toTime(startMin + duration),
        )
      ) {
        return { didCommit: false };
      }

      onUpdateItem?.(pointer.itemId, {
        scheduledStart: toTime(startMin),
        scheduledEnd: toTime(startMin + duration),
      });
      return { didCommit: true };
    }

    case 'resize-top': {
      if (!pointer.itemId) return { didCommit: false };

      const sourceItem = itemsById.get(pointer.itemId);
      const endMin = pointer.origEndMin ?? pointer.curEndMin;

      if (sourceItem?.timelineLocked) return { didCommit: false };
      if (
        sourceItem &&
        !isRangeAllowedForDate(
          sourceItem.availabilityWindows,
          dayDate,
          toTime(pointer.curStartMin),
          toTime(endMin),
        )
      ) {
        return { didCommit: false };
      }

      onUpdateItem?.(pointer.itemId, {
        scheduledStart: toTime(pointer.curStartMin),
        scheduledEnd: toTime(endMin),
        durationMinutes: endMin - pointer.curStartMin,
      });
      return { didCommit: true };
    }

    case 'resize-bottom': {
      if (!pointer.itemId) return { didCommit: false };

      const sourceItem = itemsById.get(pointer.itemId);
      const startMin = pointer.origStartMin ?? pointer.curStartMin;

      if (sourceItem?.timelineLocked) return { didCommit: false };
      if (
        sourceItem &&
        !isRangeAllowedForDate(
          sourceItem.availabilityWindows,
          dayDate,
          toTime(startMin),
          toTime(pointer.curEndMin),
        )
      ) {
        return { didCommit: false };
      }

      onUpdateItem?.(pointer.itemId, {
        scheduledStart: toTime(startMin),
        scheduledEnd: toTime(pointer.curEndMin),
        durationMinutes: pointer.curEndMin - startMin,
      });
      return { didCommit: true };
    }
  }
}
