import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getDayTimezoneLabel } from '@/lib/day-time-display';
import { resolveDraggedItemId } from '@/lib/timeline-drop';
import { toLiveItemPreview } from '../live-preview';
import { mToY, snapM, toMins } from '../time';
import type { ExternalDragPreview, SingleDayTimelineProps } from '../types';
import { useTimelinePointerInteraction } from '../useTimelinePointerInteraction';
import { useWindowDragCleanup } from '../useWindowDragCleanup';
import { SingleDayItemLayer } from './SingleDayItemLayer';
import { SingleDayTimelineGrid } from './SingleDayTimelineGrid';

export function SingleDayTimeline({
  day,
  items,
  allItems,
  pxPerMin,
  pxPerHr,
  snapMinutes,
  selectedItemId,
  activeDragItemId,
  onUpdateItem,
  onLiveItemPreviewChange,
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
  remoteObjectPresenceById,
}: SingleDayTimelineProps) {
  const timezoneLabel = getDayTimezoneLabel(day);
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

  const totalH = (endH - startH) * pxPerHr;
  const hours = useMemo(
    () => Array.from({ length: endH - startH + 1 }, (_, index) => startH + index),
    [endH, startH],
  );

  const now = new Date();
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const nowY = nowMin >= startH * 60 && nowMin <= endH * 60 ? mToY(nowMin, startH, pxPerMin) : null;

  useEffect(() => {
    didScrollRef.current = false;
  }, [day.dayId]);

  useEffect(() => {
    if (!scrollRef.current || didScrollRef.current) return;

    const target =
      visible.length > 0
        ? Math.max(0, mToY(toMins(visible[0].scheduledStart), startH, pxPerMin) - 20)
        : nowY !== null
          ? Math.max(0, nowY - 100)
          : 0;

    scrollRef.current.scrollTop = target;
    didScrollRef.current = true;
  }, [nowY, pxPerMin, startH, visible]);

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
    onLiveItemPreviewChange,
    onItemClick,
    onItemDoubleClick,
    onCreateAtTime,
    pxPerMin,
    snapMinutes,
  });

  const clearPointDropPreview = useCallback(() => {
    setPointDropPreview(null);
    onLiveItemPreviewChange?.(null);
  }, [onLiveItemPreviewChange]);
  useWindowDragCleanup(clearPointDropPreview);

  const dragEventToMinute = useCallback((e: React.DragEvent): number => {
    const rect = contentRef.current?.getBoundingClientRect();
    if (!rect) return startHRef.current * 60;

    const rawY = e.clientY - rect.top + (scrollRef.current?.scrollTop ?? 0);
    return snapM(Math.max(0, Math.min(1440, rawY / pxPerMin + startHRef.current * 60)), snapMinutes);
  }, [pxPerMin, snapMinutes]);

  const handleExternalPointDragOver = useCallback(
    (e: React.DragEvent) => {
      const itemId = resolveDraggedItemId(e.dataTransfer, activeDragItemId);
      if (!itemId || !resolveExternalDrop) return;

      e.preventDefault();
      const preview = resolveExternalDrop({ itemId, day, mode: 'point', anchorMin: dragEventToMinute(e) });
      setPointDropPreview(preview);
      onLiveItemPreviewChange?.(toLiveItemPreview(preview));
      e.dataTransfer.dropEffect = preview?.valid ? 'move' : 'none';
    },
    [activeDragItemId, day, dragEventToMinute, onLiveItemPreviewChange, resolveExternalDrop],
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
        <SingleDayTimelineGrid
          startH={startH}
          hours={hours}
          nowY={nowY}
          pxPerHr={pxPerHr}
          timezoneLabel={timezoneLabel}
        />

        <SingleDayItemLayer
          day={day}
          items={visible}
          allItems={allItems ?? items}
          selectedItemId={selectedItemId}
          activeDragItemId={activeDragItemId}
          startH={startH}
          pxPerMin={pxPerMin}
          interaction={interaction}
          externalPreview={externalPreview}
          getItemVisualPosition={getItemVisualPosition}
          onItemPointerDown={handleItemPointerDown}
          connectors={connectors.filter((c) => c.dayId === day.dayId)}
          onConnectorClick={onConnectorClick}
          onConnectorRemove={onConnectorRemove}
          showConnectors={showConnectors}
          remoteObjectPresenceByItemId={remoteObjectPresenceById}
        />
      </div>
    </div>
  );
}
