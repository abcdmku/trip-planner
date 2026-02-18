import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { resolveDraggedItemId } from '@/lib/timeline-drop';
import { PX_PER_HR, SNAP } from '../constants';
import { mToY, snapM, toMins } from '../time';
import type { ExternalDragPreview, SingleDayTimelineProps } from '../types';
import { useTimelinePointerInteraction } from '../useTimelinePointerInteraction';
import { useWindowDragCleanup } from '../useWindowDragCleanup';
import { SingleDayItemLayer } from './SingleDayItemLayer';
import { SingleDayTimelineGrid } from './SingleDayTimelineGrid';

export function SingleDayTimeline({
  day,
  items,
  selectedItemId,
  activeDragItemId,
  onUpdateItem,
  onItemClick,
  onItemDoubleClick,
  onCreateAtTime,
  resolveExternalDrop,
  commitExternalDrop,
  externalHeaderPreview = null,
  connectors = [],
  onConnectorClick,
  onConnectorRemove,
  showConnectors = true,
}: SingleDayTimelineProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const didScrollRef = useRef(false);
  const [pointDropPreview, setPointDropPreview] = useState<ExternalDragPreview | null>(null);

  const visible = useMemo(
    () =>
      items
        .filter((item) => item.dayId === day.dayId && Boolean(item.scheduledStart))
        .sort((a, b) => {
          const delta = toMins(a.scheduledStart) - toMins(b.scheduledStart);
          return delta === 0 ? a.sortOrder - b.sortOrder : delta;
        }),
    [day.dayId, items],
  );

  const visibleById = useMemo(() => new Map(visible.map((item) => [item.itemId, item])), [visible]);

  const { startH, endH } = useMemo(() => {
    let minHour = Math.floor(toMins(day.dayStart || '08:00') / 60);
    let maxHour = Math.ceil(toMins(day.dayEnd || '22:00') / 60);

    for (const item of visible) {
      const startMin = toMins(item.scheduledStart);
      const endMin = item.scheduledEnd ? toMins(item.scheduledEnd) : startMin + item.durationMinutes;
      minHour = Math.min(minHour, Math.floor(startMin / 60));
      maxHour = Math.max(maxHour, Math.ceil(endMin / 60));
    }

    return { startH: Math.max(0, minHour - 1), endH: Math.min(24, maxHour + 1) };
  }, [day.dayEnd, day.dayStart, visible]);

  const startHRef = useRef(startH);
  useEffect(() => {
    startHRef.current = startH;
  }, [startH]);

  const totalH = (endH - startH) * PX_PER_HR;
  const hours = useMemo(
    () => Array.from({ length: endH - startH + 1 }, (_, index) => startH + index),
    [endH, startH],
  );

  const now = new Date();
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const nowY = nowMin >= startH * 60 && nowMin <= endH * 60 ? mToY(nowMin, startH, 1.2) : null;

  useEffect(() => {
    didScrollRef.current = false;
  }, [day.dayId]);

  useEffect(() => {
    if (!scrollRef.current || didScrollRef.current) return;

    const target =
      visible.length > 0
        ? Math.max(0, mToY(toMins(visible[0].scheduledStart), startH, 1.2) - 20)
        : nowY !== null
          ? Math.max(0, nowY - 100)
          : 0;

    scrollRef.current.scrollTop = target;
    didScrollRef.current = true;
  }, [nowY, startH, visible]);

  const {
    interaction,
    handleBackgroundPointerDown,
    handleItemPointerDown,
    getItemVisualPosition,
  } = useTimelinePointerInteraction({
    dayDate: day.date,
    contentRef,
    getScrollTop: () => scrollRef.current?.scrollTop ?? 0,
    startHourRef: startHRef,
    itemsById: visibleById,
    onUpdateItem,
    onItemClick,
    onItemDoubleClick,
    onCreateAtTime,
  });

  const clearPointDropPreview = useCallback(() => {
    setPointDropPreview(null);
  }, []);
  useWindowDragCleanup(clearPointDropPreview);

  const dragEventToMinute = useCallback((e: React.DragEvent): number => {
    const rect = contentRef.current?.getBoundingClientRect();
    if (!rect) return startHRef.current * 60;

    const rawY = e.clientY - rect.top + (scrollRef.current?.scrollTop ?? 0);
    return snapM(Math.max(0, Math.min(1440, rawY / 1.2 + startHRef.current * 60)), SNAP);
  }, []);

  const handleExternalPointDragOver = useCallback(
    (e: React.DragEvent) => {
      const itemId = resolveDraggedItemId(e.dataTransfer, activeDragItemId);
      if (!itemId || !resolveExternalDrop) return;

      e.preventDefault();
      const preview = resolveExternalDrop({ itemId, day, mode: 'point', anchorMin: dragEventToMinute(e) });
      setPointDropPreview(preview);
      e.dataTransfer.dropEffect = preview?.valid ? 'move' : 'none';
    },
    [activeDragItemId, day, dragEventToMinute, resolveExternalDrop],
  );

  const handleExternalPointDrop = useCallback(
    (e: React.DragEvent) => {
      const itemId = resolveDraggedItemId(e.dataTransfer, activeDragItemId);
      if (!itemId || !resolveExternalDrop || !commitExternalDrop) return;

      e.preventDefault();
      const preview = resolveExternalDrop({ itemId, day, mode: 'point', anchorMin: dragEventToMinute(e) });
      if (preview?.valid) commitExternalDrop(preview);
      clearPointDropPreview();
    },
    [activeDragItemId, clearPointDropPreview, commitExternalDrop, day, dragEventToMinute, resolveExternalDrop],
  );

  const handleExternalPointDragLeave = useCallback(
    (e: React.DragEvent) => {
      const relatedTarget = e.relatedTarget as Node | null;
      if (relatedTarget && e.currentTarget.contains(relatedTarget)) return;
      clearPointDropPreview();
    },
    [clearPointDropPreview],
  );

  const externalPreview = pointDropPreview ?? externalHeaderPreview;

  return (
    <div ref={scrollRef} className="relative h-full overflow-y-auto overflow-x-hidden">
      <div
        ref={contentRef}
        className="relative select-none"
        style={{ height: totalH, minHeight: '100%' }}
        onPointerDown={handleBackgroundPointerDown}
        onDragOver={handleExternalPointDragOver}
        onDrop={handleExternalPointDrop}
        onDragLeave={handleExternalPointDragLeave}
      >
        <SingleDayTimelineGrid startH={startH} hours={hours} nowY={nowY} />

        <SingleDayItemLayer
          day={day}
          items={visible}
          allItems={items}
          selectedItemId={selectedItemId}
          startH={startH}
          interaction={interaction}
          externalPreview={externalPreview}
          getItemVisualPosition={getItemVisualPosition}
          onItemPointerDown={handleItemPointerDown}
          connectors={connectors.filter((c) => c.dayId === day.dayId)}
          onConnectorClick={onConnectorClick}
          onConnectorRemove={onConnectorRemove}
          showConnectors={showConnectors}
        />
      </div>
    </div>
  );
}
