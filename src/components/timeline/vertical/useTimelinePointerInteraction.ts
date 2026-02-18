import { useCallback, useEffect, useRef, useState } from 'react';
import type React from 'react';
import type { Item } from '@/types/trip';
import {
  DEFAULT_DUR,
  DRAG_THRESH,
  MIN_BLOCK_H,
  PX_PER_MIN,
  RESIZE_EDGE,
  SNAP,
} from './constants';
import { mToY, snapM, toMins } from './time';
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

export function useTimelinePointerInteraction({
  dayDate,
  contentRef,
  getScrollTop,
  startHourRef,
  itemsById,
  onUpdateItem,
  onItemClick,
  onItemDoubleClick,
  onCreateAtTime,
}: UseTimelinePointerInteractionOptions): UseTimelinePointerInteractionResult {
  const ptrRef = useRef<PtrTrack | null>(null);
  const rafRef = useRef(0);
  const lastClickRef = useRef<{ itemId: string; time: number } | null>(null);
  const [interaction, setInteraction] = useState<Interaction>({ type: 'idle' });

  const docMove = useCallback((e: PointerEvent) => {
    const pointer = ptrRef.current;
    if (!pointer) return;

    const deltaY = e.clientY - pointer.anchorClientY;
    if (!pointer.activated && Math.abs(deltaY) < DRAG_THRESH) return;
    pointer.activated = true;

    const rawY = e.clientY - pointer.containerTop + getScrollTop();
    const currentMin = snapM(
      Math.max(0, Math.min(1440, rawY / PX_PER_MIN + startHourRef.current * 60)),
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
        pointer.curDelta = currentMin - pointer.anchorMin;
        setInteraction({ type: 'moving', itemId: pointer.itemId ?? '', deltaMin: pointer.curDelta });
        break;
      }
      case 'resize-top': {
        const delta = currentMin - pointer.anchorMin;
        pointer.curStartMin = Math.max(
          0,
          Math.min((pointer.origStartMin ?? 0) + delta, (pointer.origEndMin ?? 0) - SNAP),
        );
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
        pointer.curEndMin = Math.min(
          1440,
          Math.max((pointer.origEndMin ?? 0) + delta, (pointer.origStartMin ?? 0) + SNAP),
        );
        setInteraction({
          type: 'resizing',
          itemId: pointer.itemId ?? '',
          startMin: pointer.origStartMin ?? pointer.curStartMin,
          endMin: pointer.curEndMin,
        });
        break;
      }
    }
  }, [getScrollTop, startHourRef]);

  const docUp = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    document.removeEventListener('pointermove', docMove);
    document.removeEventListener('pointerup', docUp);
    document.body.style.cursor = '';
    document.body.style.userSelect = '';

    const pointer = ptrRef.current;
    ptrRef.current = null;

    if (!pointer) {
      setInteraction({ type: 'idle' });
      return;
    }

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
    });

    if (didCommit) {
      requestAnimationFrame(() => setInteraction({ type: 'idle' }));
      return;
    }

    setInteraction({ type: 'idle' });
  }, [dayDate, docMove, itemsById, onCreateAtTime, onItemClick, onItemDoubleClick, onUpdateItem]);

  useEffect(() => {
    return () => {
      document.removeEventListener('pointermove', docMove);
      document.removeEventListener('pointerup', docUp);
      cancelAnimationFrame(rafRef.current);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [docMove, docUp]);

  const beginTrack = useCallback(
    (
      action: PtrTrack['action'],
      e: React.PointerEvent,
      itemId?: string,
      origStart?: number,
      origEnd?: number,
    ) => {
      const contentElement = contentRef.current;
      if (!contentElement) return;

      e.preventDefault();
      const rect = contentElement.getBoundingClientRect();
      const rawY = e.clientY - rect.top + getScrollTop();
      const anchorMin = snapM(
        Math.max(0, Math.min(1440, rawY / PX_PER_MIN + startHourRef.current * 60)),
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

      document.addEventListener('pointermove', docMove);
      document.addEventListener('pointerup', docUp);
    },
    [contentRef, docMove, docUp, getScrollTop, startHourRef],
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
        onItemClick?.(item.itemId);
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
    [beginTrack, onItemClick],
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
        top: mToY(visualStart, startHour, PX_PER_MIN),
        height: Math.max(MIN_BLOCK_H, (visualEnd - visualStart) * PX_PER_MIN),
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
