import { forwardRef, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { resolveDraggedItemId } from '@/lib/timeline-drop';
import { MULTI_COL_MAX_W, MULTI_COL_MIN_W, SNAP } from '../constants';
import { snapM } from '../time';
import type { ExternalDragPreview, MultiDayColumnProps } from '../types';
import { useTimelinePointerInteraction } from '../useTimelinePointerInteraction';
import { useWindowDragCleanup } from '../useWindowDragCleanup';
import { MultiDayColumnBody } from './MultiDayColumnBody';
import { MultiDayColumnHeader } from './MultiDayColumnHeader';

export const MultiDayColumn = forwardRef<HTMLDivElement, MultiDayColumnProps>(function MultiDayColumn(
  {
    day,
    dayItems,
    pxPerMin,
    pxPerHr,
    globalStartH,
    globalEndH,
    gTotalH,
    gHours,
    nowMin,
    selectedItemId,
    activeDragItemId,
    isActive,
    scrollerRef,
    onUpdateItem,
    onItemClick,
    onItemDoubleClick,
    onCreateAtTime,
    onFocusDay,
    resolveExternalDrop,
    commitExternalDrop,
    onMoveOutOfBounds,
    allItems,
    crossDayDragPreview,
    connectors = [],
    onConnectorClick,
    onConnectorRemove,
    showConnectors = true,
  },
  ref,
) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [externalPreview, setExternalPreview] = useState<ExternalDragPreview | null>(null);
  const dayItemsById = useMemo(() => new Map(dayItems.map((item) => [item.itemId, item])), [dayItems]);

  const startHRef = useRef(globalStartH);
  useEffect(() => {
    startHRef.current = globalStartH;
  }, [globalStartH]);

  const {
    interaction,
    handleBackgroundPointerDown,
    handleItemPointerDown,
    getItemVisualPosition,
  } = useTimelinePointerInteraction({
    dayDate: day.date,
    contentRef,
    getScrollTop: () => scrollerRef.current?.scrollTop ?? 0,
    startHourRef: startHRef,
    itemsById: dayItemsById,
    onUpdateItem,
    onItemClick,
    onItemDoubleClick,
    onCreateAtTime: onCreateAtTime ? (start, end) => onCreateAtTime(day.dayId, start, end) : undefined,
    onMoveOutOfBounds,
    pxPerMin,
  });

  const clearExternalPreview = useCallback(() => {
    setExternalPreview(null);
  }, []);
  useWindowDragCleanup(clearExternalPreview);

  const dragEventToMinute = useCallback(
    (e: React.DragEvent): number => {
      const rect = contentRef.current?.getBoundingClientRect();
      if (!rect) return globalStartH * 60;

      const rawY = e.clientY - rect.top + (scrollerRef.current?.scrollTop ?? 0);
      return snapM(Math.max(0, Math.min(1440, rawY / pxPerMin + startHRef.current * 60)), SNAP);
    },
    [globalStartH, pxPerMin, scrollerRef],
  );

  const handlePointDragOver = useCallback(
    (e: React.DragEvent) => {
      const itemId = resolveDraggedItemId(e.dataTransfer, activeDragItemId);
      if (!itemId || !resolveExternalDrop) return;

      e.preventDefault();
      const preview = resolveExternalDrop({ itemId, day, mode: 'point', anchorMin: dragEventToMinute(e) });
      setExternalPreview(preview);
      e.dataTransfer.dropEffect = preview?.valid ? 'move' : 'none';
    },
    [activeDragItemId, day, dragEventToMinute, resolveExternalDrop],
  );

  const handlePointDrop = useCallback(
    (e: React.DragEvent) => {
      const itemId = resolveDraggedItemId(e.dataTransfer, activeDragItemId);
      if (!itemId || !resolveExternalDrop || !commitExternalDrop) return;

      e.preventDefault();
      const preview = resolveExternalDrop({ itemId, day, mode: 'point', anchorMin: dragEventToMinute(e) });
      if (preview?.valid) commitExternalDrop(preview);
      clearExternalPreview();
    },
    [activeDragItemId, clearExternalPreview, commitExternalDrop, day, dragEventToMinute, resolveExternalDrop],
  );

  const handlePointDragLeave = useCallback(
    (e: React.DragEvent) => {
      const relatedTarget = e.relatedTarget as Node | null;
      if (relatedTarget && e.currentTarget.contains(relatedTarget)) return;
      clearExternalPreview();
    },
    [clearExternalPreview],
  );

  const handleAppendDragOver = useCallback(
    (e: React.DragEvent) => {
      const itemId = resolveDraggedItemId(e.dataTransfer, activeDragItemId);
      if (!itemId || !resolveExternalDrop) return;

      e.preventDefault();
      const preview = resolveExternalDrop({ itemId, day, mode: 'append' });
      setExternalPreview(preview);
      e.dataTransfer.dropEffect = preview?.valid ? 'move' : 'none';
    },
    [activeDragItemId, day, resolveExternalDrop],
  );

  const handleAppendDrop = useCallback(
    (e: React.DragEvent) => {
      const itemId = resolveDraggedItemId(e.dataTransfer, activeDragItemId);
      if (!itemId || !resolveExternalDrop || !commitExternalDrop) return;

      e.preventDefault();
      const preview = resolveExternalDrop({ itemId, day, mode: 'append' });
      if (preview?.valid) commitExternalDrop(preview);
      clearExternalPreview();
    },
    [activeDragItemId, clearExternalPreview, commitExternalDrop, day, resolveExternalDrop],
  );

  const handleAppendDragLeave = useCallback(
    (e: React.DragEvent) => {
      const relatedTarget = e.relatedTarget as Node | null;
      if (relatedTarget && e.currentTarget.contains(relatedTarget)) return;
      clearExternalPreview();
    },
    [clearExternalPreview],
  );

  const hasDropPreview = externalPreview !== null;
  const isCrossDayTarget = crossDayDragPreview?.targetDayId === day.dayId;
  const isCrossDaySource = crossDayDragPreview !== null && crossDayDragPreview !== undefined && crossDayDragPreview.targetDayId !== day.dayId;

  return (
    <div
      ref={ref}
      className={`flex-shrink-0 overflow-hidden rounded-lg border transition-all duration-150 ${
        isCrossDayTarget
          ? 'border-accent/70 shadow-lg shadow-accent/15'
          : hasDropPreview
            ? 'border-accent/60 shadow-lg shadow-accent/10'
            : isCrossDaySource
              ? 'border-theme/50 opacity-80'
              : isActive ? 'border-accent/50 shadow-theme-md' : 'border-theme'
      }`}
      style={{ width: `clamp(${MULTI_COL_MIN_W}px, 20vw, ${MULTI_COL_MAX_W}px)` }}
    >
      <MultiDayColumnHeader
        day={day}
        isActive={isActive}
        onClick={onFocusDay}
        onDragOver={handleAppendDragOver}
        onDrop={handleAppendDrop}
        onDragLeave={handleAppendDragLeave}
      />

      <MultiDayColumnBody
        day={day}
        dayItems={dayItems}
        allItems={allItems}
        pxPerMin={pxPerMin}
        pxPerHr={pxPerHr}
        globalStartH={globalStartH}
        globalEndH={globalEndH}
        gTotalH={gTotalH}
        gHours={gHours}
        nowMin={nowMin}
        selectedItemId={selectedItemId}
        activeDragItemId={activeDragItemId}
        interaction={interaction}
        externalPreview={externalPreview}
        crossDayDragPreview={crossDayDragPreview}
        contentRef={contentRef}
        onBackgroundPointerDown={handleBackgroundPointerDown}
        onPointDragOver={handlePointDragOver}
        onPointDrop={handlePointDrop}
        onPointDragLeave={handlePointDragLeave}
        onItemPointerDown={handleItemPointerDown}
        getItemVisualPosition={getItemVisualPosition}
        connectors={connectors.filter((c) => c.dayId === day.dayId)}
        onConnectorClick={onConnectorClick}
        onConnectorRemove={onConnectorRemove}
        showConnectors={showConnectors}
      />
    </div>
  );
});
