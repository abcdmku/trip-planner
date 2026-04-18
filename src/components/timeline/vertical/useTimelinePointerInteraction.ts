import { useCallback, useEffect, useRef, useState } from 'react';
import type React from 'react';
import { getAvailabilityRangesForDate } from '@/lib/availability';
import { toMinutesOfDay } from '@/lib/date-time';
import type { Item } from '@/types/trip';
import {
  DEFAULT_DUR,
  DRAG_THRESH,
  MIN_BLOCK_H,
  RESIZE_EDGE,
  SNAP,
} from './constants';
import { mToY, snapM, toMins, toTime } from './time';
import { handlePointerRelease } from './pointerRelease';
import type {
  Interaction,
  ItemVisualPosition,
  PtrTrack,
  UseTimelinePointerInteractionOptions,
} from './types';

interface UseTimelinePointerInteractionResult {
  interaction: Interaction;
  handleBackgroundPointerDown: (e: React.PointerEvent) => void;
  handleItemPointerDown: (e: React.PointerEvent, item: Item) => void;
  getItemVisualPosition: (item: Item, startHour: number) => ItemVisualPosition;
}

interface AvailabilityMinuteRange {
  startMin: number;
  endMin: number;
}

function getAvailabilityMinuteRanges(availabilityJson: string, dayDate: string): AvailabilityMinuteRange[] {
  if (!availabilityJson) return [];

  return getAvailabilityRangesForDate(availabilityJson, dayDate)
    .map((range) => ({
      startMin: toMinutesOfDay(range.startTime),
      endMin: toMinutesOfDay(range.endTime),
    }))
    .filter(
      (range): range is AvailabilityMinuteRange =>
        range.startMin !== null &&
        range.endMin !== null &&
        range.endMin > range.startMin,
    );
}

function isRangeWithinAvailabilityRanges(
  ranges: AvailabilityMinuteRange[],
  startMin: number,
  endMin: number,
): boolean {
  if (ranges.length === 0) return true; // Mirrors isRangeAllowedForDate semantics.
  return ranges.some((range) => startMin >= range.startMin && endMin <= range.endMin);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function findNearestSnappedValue({
  desired,
  min,
  max,
  isValid,
}: {
  desired: number;
  min: number;
  max: number;
  isValid: (value: number) => boolean;
}): number {
  const snapped = clamp(snapM(desired, SNAP), min, max);
  if (isValid(snapped)) return snapped;

  for (let offset = SNAP; offset <= 24 * 60; offset += SNAP) {
    const forward = snapped + offset;
    const backward = snapped - offset;
    const forwardInBounds = forward <= max;
    const backwardInBounds = backward >= min;

    if (forwardInBounds && isValid(forward)) return forward;
    if (backwardInBounds && isValid(backward)) return backward;
    if (!forwardInBounds && !backwardInBounds) break;
  }

  return snapped;
}

export function useTimelinePointerInteraction(
  opts: UseTimelinePointerInteractionOptions,
): UseTimelinePointerInteractionResult {
  const ptrRef = useRef<PtrTrack | null>(null);
  const rafRef = useRef(0);
  const lastClickRef = useRef<{ itemId: string; time: number } | null>(null);
  const lastBgClickRef = useRef<{ anchorMin: number; time: number } | null>(null);
  const [interaction, setInteraction] = useState<Interaction>({ type: 'idle' });

  // ── Keep a ref to the latest options so stable handlers always read fresh values ──
  const optsRef = useRef(opts);
  optsRef.current = opts;

  // ── Stable document-level handlers (never recreated) ──

  const stableDocMove = useCallback((e: PointerEvent) => {
    const pointer = ptrRef.current;
    if (!pointer) return;

    const deltaY = e.clientY - pointer.anchorClientY;
    if (!pointer.activated && Math.abs(deltaY) < DRAG_THRESH) return;
    pointer.activated = true;

    const { contentRef, onMoveOutOfBounds, startHourRef, pxPerMin } = optsRef.current;

    // Cross-day detection: if moving an item and pointer leaves column bounds
    if (pointer.action === 'move' && pointer.itemId && onMoveOutOfBounds) {
      const el = contentRef.current;
      if (el) {
        const rect = el.getBoundingClientRect();
        if (e.clientX < rect.left || e.clientX > rect.right) {
          optsRef.current.onLiveItemPreviewChange?.(null);
          // Cancel the local drag
          document.removeEventListener('pointermove', stableDocMove);
          document.removeEventListener('pointerup', stableDocUp);
          document.body.style.cursor = '';
          document.body.style.userSelect = '';
          const info = {
            itemId: pointer.itemId,
            clientX: e.clientX,
            clientY: e.clientY,
            origStartMin: pointer.origStartMin ?? 0,
            origEndMin: pointer.origEndMin ?? 0,
          };
          ptrRef.current = null;
          setInteraction({ type: 'idle' });
          onMoveOutOfBounds(info);
          return;
        }
      }
    }

    const scrollTop = optsRef.current.getScrollTop();
    const rawY = e.clientY - pointer.containerTop + scrollTop;
    const currentMin = snapM(
      Math.max(0, Math.min(1440, rawY / pxPerMin + startHourRef.current * 60)),
      SNAP,
    );

    switch (pointer.action) {
      case 'create': {
        const low = Math.min(pointer.anchorMin, currentMin);
        const high = Math.max(pointer.anchorMin, currentMin);
        pointer.curStartMin = low;
        pointer.curEndMin = Math.max(low + SNAP, high);
        setInteraction({ type: 'creating', startMin: pointer.curStartMin, endMin: pointer.curEndMin });
        break;
      }
      case 'move': {
        const origStart = pointer.origStartMin ?? 0;
        const origEnd = pointer.origEndMin ?? origStart + DEFAULT_DUR;
        const duration = Math.max(SNAP, origEnd - origStart);
        const desiredStart = origStart + (currentMin - pointer.anchorMin);

        const sourceItem = pointer.itemId ? optsRef.current.itemsById.get(pointer.itemId) : undefined;
        const ranges = sourceItem
          ? getAvailabilityMinuteRanges(sourceItem.availabilityWindows, optsRef.current.dayDate)
          : [];

        const snappedStart = findNearestSnappedValue({
          desired: desiredStart,
          min: 0,
          max: Math.max(0, 1440 - duration),
          isValid: (candidateStart) =>
            isRangeWithinAvailabilityRanges(ranges, candidateStart, candidateStart + duration),
        });

        pointer.curDelta = snappedStart - origStart;
        setInteraction({ type: 'moving', itemId: pointer.itemId ?? '', deltaMin: pointer.curDelta });
        if (pointer.itemId && sourceItem) {
          optsRef.current.onLiveItemPreviewChange?.({
            itemId: pointer.itemId,
            dayId: sourceItem.dayId,
            scheduledStart: toTime(snappedStart),
            scheduledEnd: toTime(snappedStart + duration),
            durationMinutes: duration,
          });
        }
        break;
      }
      case 'resize-top': {
        const delta = currentMin - pointer.anchorMin;
        const desiredStart = Math.max(
          0,
          Math.min((pointer.origStartMin ?? 0) + delta, (pointer.origEndMin ?? 0) - SNAP),
        );
        const endMin = pointer.origEndMin ?? pointer.curEndMin;
        const sourceItem = pointer.itemId ? optsRef.current.itemsById.get(pointer.itemId) : undefined;
        const ranges = sourceItem
          ? getAvailabilityMinuteRanges(sourceItem.availabilityWindows, optsRef.current.dayDate)
          : [];

        pointer.curStartMin = findNearestSnappedValue({
          desired: desiredStart,
          min: 0,
          max: Math.max(0, endMin - SNAP),
          isValid: (candidateStart) =>
            isRangeWithinAvailabilityRanges(ranges, candidateStart, endMin),
        });
        if (pointer.itemId && sourceItem) {
          optsRef.current.onLiveItemPreviewChange?.({
            itemId: pointer.itemId,
            dayId: sourceItem.dayId,
            scheduledStart: toTime(pointer.curStartMin),
            scheduledEnd: toTime(endMin),
            durationMinutes: endMin - pointer.curStartMin,
          });
        }
        setInteraction({
          type: 'resizing',
          itemId: pointer.itemId ?? '',
          startMin: pointer.curStartMin,
          endMin: pointer.origEndMin ?? pointer.curEndMin,
        });
        break;
      }
      case 'resize-bottom': {
        const delta = currentMin - pointer.anchorMin;
        const desiredEnd = Math.min(
          1440,
          Math.max((pointer.origEndMin ?? 0) + delta, (pointer.origStartMin ?? 0) + SNAP),
        );
        const startMin = pointer.origStartMin ?? pointer.curStartMin;
        const sourceItem = pointer.itemId ? optsRef.current.itemsById.get(pointer.itemId) : undefined;
        const ranges = sourceItem
          ? getAvailabilityMinuteRanges(sourceItem.availabilityWindows, optsRef.current.dayDate)
          : [];

        pointer.curEndMin = findNearestSnappedValue({
          desired: desiredEnd,
          min: Math.min(1440, startMin + SNAP),
          max: 1440,
          isValid: (candidateEnd) =>
            isRangeWithinAvailabilityRanges(ranges, startMin, candidateEnd),
        });
        if (pointer.itemId && sourceItem) {
          optsRef.current.onLiveItemPreviewChange?.({
            itemId: pointer.itemId,
            dayId: sourceItem.dayId,
            scheduledStart: toTime(startMin),
            scheduledEnd: toTime(pointer.curEndMin),
            durationMinutes: pointer.curEndMin - startMin,
          });
        }
        setInteraction({
          type: 'resizing',
          itemId: pointer.itemId ?? '',
          startMin: pointer.origStartMin ?? pointer.curStartMin,
          endMin: pointer.curEndMin,
        });
        break;
      }
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps -- reads from optsRef

  const stableDocUp = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    document.removeEventListener('pointermove', stableDocMove);
    document.removeEventListener('pointerup', stableDocUp);
    document.body.style.cursor = '';
    document.body.style.userSelect = '';

    const pointer = ptrRef.current;
    ptrRef.current = null;
    optsRef.current.onLiveItemPreviewChange?.(null);

    if (!pointer) {
      setInteraction({ type: 'idle' });
      return;
    }

    const { dayDate, itemsById, onCreateAtTime, onUpdateItem, onItemClick, onItemDoubleClick } =
      optsRef.current;

    const { didCommit } = handlePointerRelease({
      pointer,
      dayDate,
      itemsById,
      callbacks: {
        onCreateAtTime,
        onUpdateItem,
        onItemClick,
        onItemDoubleClick,
      },
      lastClickRef,
      lastBgClickRef,
    });

    if (didCommit) {
      requestAnimationFrame(() => setInteraction({ type: 'idle' }));
      return;
    }

    setInteraction({ type: 'idle' });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps -- reads from optsRef

  // Cleanup only on unmount (stable handlers never change)
  useEffect(() => {
    return () => {
      optsRef.current.onLiveItemPreviewChange?.(null);
      document.removeEventListener('pointermove', stableDocMove);
      document.removeEventListener('pointerup', stableDocUp);
      cancelAnimationFrame(rafRef.current);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [stableDocMove, stableDocUp]);

  const beginTrack = useCallback(
    (
      action: PtrTrack['action'],
      e: React.PointerEvent,
      itemId?: string,
      origStart?: number,
      origEnd?: number,
    ) => {
      const { contentRef, getScrollTop, startHourRef, pxPerMin } = optsRef.current;
      const contentElement = contentRef.current;
      if (!contentElement) return;

      e.preventDefault();
      const rect = contentElement.getBoundingClientRect();
      const rawY = e.clientY - rect.top + getScrollTop();
      const anchorMin = snapM(
        Math.max(0, Math.min(1440, rawY / pxPerMin + startHourRef.current * 60)),
        SNAP,
      );

      document.body.style.cursor =
        action === 'create' ? 'crosshair' : action === 'move' ? 'grabbing' : 'ns-resize';
      document.body.style.userSelect = 'none';

      ptrRef.current = {
        action,
        anchorClientY: e.clientY,
        anchorMin,
        containerTop: rect.top,
        activated: false,
        itemId,
        origStartMin: origStart,
        origEndMin: origEnd,
        curStartMin: origStart ?? anchorMin,
        curEndMin: origEnd ?? anchorMin + DEFAULT_DUR,
        curDelta: 0,
      };

      document.addEventListener('pointermove', stableDocMove);
      document.addEventListener('pointerup', stableDocUp);
    },
    [stableDocMove, stableDocUp],
  );

  const handleBackgroundPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (e.button !== 0) return;
      beginTrack('create', e);
    },
    [beginTrack],
  );

  const handleItemPointerDown = useCallback(
    (e: React.PointerEvent, item: Item) => {
      if (e.button !== 0 || !item.scheduledStart) return;
      e.stopPropagation();

      if (item.timelineLocked) {
        optsRef.current.onItemClick?.(item.itemId);
        return;
      }

      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      const relativeY = e.clientY - rect.top;
      const blockHeight = rect.height;
      const startMin = toMins(item.scheduledStart);
      const endMin = item.scheduledEnd ? toMins(item.scheduledEnd) : startMin + item.durationMinutes;

      if (relativeY < RESIZE_EDGE && blockHeight > 30) {
        beginTrack('resize-top', e, item.itemId, startMin, endMin);
      } else if (blockHeight - relativeY < RESIZE_EDGE && blockHeight > 30) {
        beginTrack('resize-bottom', e, item.itemId, startMin, endMin);
      } else {
        beginTrack('move', e, item.itemId, startMin, endMin);
      }
    },
    [beginTrack],
  );

  const getItemVisualPosition = useCallback(
    (item: Item, startHour: number): ItemVisualPosition => {
      const startMin = toMins(item.scheduledStart);
      const endMin = item.scheduledEnd ? toMins(item.scheduledEnd) : startMin + item.durationMinutes;

      let visualStart = startMin;
      let visualEnd = endMin;
      let active = false;

      if (interaction.type === 'moving' && interaction.itemId === item.itemId) {
        visualStart = startMin + interaction.deltaMin;
        visualEnd = endMin + interaction.deltaMin;
        active = true;
      } else if (interaction.type === 'resizing' && interaction.itemId === item.itemId) {
        visualStart = interaction.startMin;
        visualEnd = interaction.endMin;
        active = true;
      }

      return {
        top: mToY(visualStart, startHour, optsRef.current.pxPerMin),
        height: Math.max(MIN_BLOCK_H, (visualEnd - visualStart) * optsRef.current.pxPerMin),
        startMin: visualStart,
        endMin: visualEnd,
        active,
      };
    },
    [interaction],
  );

  return {
    interaction,
    handleBackgroundPointerDown,
    handleItemPointerDown,
    getItemVisualPosition,
  };
}
