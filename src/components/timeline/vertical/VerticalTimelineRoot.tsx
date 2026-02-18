import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useHotkey } from '@tanstack/react-hotkeys';
import { PX_PER_HR } from './constants';
import { toMins } from './time';
import type { VerticalTimelineProps, ViewMode } from './types';
import { useExternalTimelineDrop } from './useExternalTimelineDrop';
import { useWindowDragCleanup } from './useWindowDragCleanup';
import { TimelineViewControls } from './TimelineViewControls';
import { DayViewPanel } from './day/DayViewPanel';
import { MultiDayColumn } from './multi/MultiDayColumn';
import { MultiViewTimeAxis } from './multi/MultiViewTimeAxis';

export function VerticalTimeline({
  items,
  days,
  selectedDayIds = [],
  selectedItemId = null,
  activeDragItemId = null,
  onUpdateItem,
  onItemClick,
  onItemDoubleClick,
  onCreateAtTime,
}: VerticalTimelineProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const dayColumnRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const [viewMode, setViewMode] = useState<ViewMode>('multi');
  const [focusedDayId, setFocusedDayId] = useState<string | null>(selectedDayIds[0] ?? days[0]?.dayId ?? null);

  const orderedDays = useMemo(() => [...days].sort((a, b) => a.date.localeCompare(b.date)), [days]);

  const selectedTimelineItem = useMemo(
    () =>
      selectedItemId
        ? items.find((item) => item.itemId === selectedItemId && Boolean(item.scheduledStart)) ?? null
        : null,
    [items, selectedItemId],
  );

  const itemsById = useMemo(() => new Map(items.map((item) => [item.itemId, item])), [items]);

  const getScheduledItemsForDay = useCallback(
    (dayId: string, excludeItemId: string) =>
      items
        .filter((item) => item.dayId === dayId && item.itemId !== excludeItemId && Boolean(item.scheduledStart))
        .sort((a, b) => {
          const startDelta = toMins(a.scheduledStart) - toMins(b.scheduledStart);
          return startDelta === 0 ? a.sortOrder - b.sortOrder : startDelta;
        }),
    [items],
  );

  const {
    dayHeaderPreview,
    setDayHeaderPreview,
    resolveExternalDrop,
    commitExternalDrop,
    clearDayHeaderPreview,
    handleDayHeaderDragOver,
    handleDayHeaderDrop,
    handleDayHeaderDragLeave,
  } = useExternalTimelineDrop({
    items,
    itemsById,
    activeDragItemId,
    onUpdateItem,
    getScheduledItemsForDay,
  });

  useWindowDragCleanup(clearDayHeaderPreview);

  const handleRemoveFromTimeline = useCallback(() => {
    if (!selectedTimelineItem || !onUpdateItem) return;
    if (selectedTimelineItem.timelineLocked) return;

    onUpdateItem(selectedTimelineItem.itemId, {
      scheduledStart: '',
      scheduledEnd: '',
    });
  }, [onUpdateItem, selectedTimelineItem]);

  useHotkey('Delete', handleRemoveFromTimeline, {
    target: rootRef,
    enabled: Boolean(selectedTimelineItem) && Boolean(onUpdateItem),
    conflictBehavior: 'allow',
  });

  useHotkey('Backspace', handleRemoveFromTimeline, {
    target: rootRef,
    enabled: Boolean(selectedTimelineItem) && Boolean(onUpdateItem),
    conflictBehavior: 'allow',
  });

  const globalRange = useMemo(() => {
    let minHour = 24;
    let maxHour = 0;

    for (const day of orderedDays) {
      minHour = Math.min(minHour, Math.floor(toMins(day.dayStart || '08:00') / 60));
      maxHour = Math.max(maxHour, Math.ceil(toMins(day.dayEnd || '22:00') / 60));
    }

    for (const item of items) {
      if (!item.scheduledStart || !orderedDays.some((day) => day.dayId === item.dayId)) continue;
      const startMin = toMins(item.scheduledStart);
      const endMin = item.scheduledEnd ? toMins(item.scheduledEnd) : startMin + item.durationMinutes;
      minHour = Math.min(minHour, Math.floor(startMin / 60));
      maxHour = Math.max(maxHour, Math.ceil(endMin / 60));
    }

    return { startH: Math.max(0, minHour - 1), endH: Math.min(24, maxHour + 1) };
  }, [items, orderedDays]);

  const gTotalH = (globalRange.endH - globalRange.startH) * PX_PER_HR;
  const gHours = useMemo(
    () => Array.from({ length: globalRange.endH - globalRange.startH + 1 }, (_, i) => globalRange.startH + i),
    [globalRange.endH, globalRange.startH],
  );

  const nowMin = new Date().getHours() * 60 + new Date().getMinutes();
  const selectedDayId = selectedDayIds.length === 1 ? selectedDayIds[0] : null;
  const effectiveDayId = selectedDayId ?? focusedDayId ?? orderedDays[0]?.dayId ?? null;
  const effectiveDayIndex = orderedDays.findIndex((day) => day.dayId === effectiveDayId);

  useEffect(() => {
    if (!orderedDays.length) {
      if (focusedDayId !== null) setFocusedDayId(null);
      return;
    }

    if (selectedDayId) {
      if (focusedDayId !== selectedDayId) setFocusedDayId(selectedDayId);
      return;
    }

    const hasFocusedDay = focusedDayId ? orderedDays.some((day) => day.dayId === focusedDayId) : false;
    if (!hasFocusedDay) setFocusedDayId(orderedDays[0].dayId);
  }, [focusedDayId, orderedDays, selectedDayId]);

  const centerDay = useCallback((dayId: string, behavior: ScrollBehavior = 'smooth') => {
    const scroller = scrollerRef.current;
    const target = dayColumnRefs.current[dayId];
    if (!scroller || !target) return;

    const nextLeft = target.offsetLeft - (scroller.clientWidth - target.clientWidth) / 2;
    scroller.scrollTo({ left: Math.max(0, nextLeft), behavior });
  }, []);

  useEffect(() => {
    if (viewMode !== 'multi' || !effectiveDayId) return;
    const frame = requestAnimationFrame(() => centerDay(effectiveDayId));
    return () => cancelAnimationFrame(frame);
  }, [centerDay, effectiveDayId, viewMode]);

  const activeDay = effectiveDayId ? orderedDays.find((day) => day.dayId === effectiveDayId) ?? null : null;

  useEffect(() => {
    if (!activeDay || viewMode !== 'day') {
      setDayHeaderPreview(null);
      return;
    }
    setDayHeaderPreview((prev) => (prev?.dayId === activeDay.dayId ? prev : null));
  }, [activeDay, setDayHeaderPreview, viewMode]);

  const showPrev = viewMode === 'day' && !selectedDayId && effectiveDayIndex > 0;
  const showNext = viewMode === 'day' && !selectedDayId && effectiveDayIndex < orderedDays.length - 1;

  if (!orderedDays.length) {
    return <div className="flex h-full items-center justify-center text-sm text-theme-tertiary">Add a day to start planning</div>;
  }

  return (
    <div
      ref={rootRef}
      tabIndex={0}
      onPointerDownCapture={() => rootRef.current?.focus()}
      className="flex h-full min-h-0 flex-col overflow-hidden focus:outline-none"
    >
      <TimelineViewControls
        viewMode={viewMode}
        showPrev={showPrev}
        showNext={showNext}
        onPrev={() => {
          if (!showPrev) return;
          const prev = orderedDays[effectiveDayIndex - 1];
          if (prev) setFocusedDayId(prev.dayId);
        }}
        onNext={() => {
          if (!showNext) return;
          const next = orderedDays[effectiveDayIndex + 1];
          if (next) setFocusedDayId(next.dayId);
        }}
        onModeChange={setViewMode}
      />

      {viewMode === 'day' ? (
        <div className="min-h-0 flex-1 overflow-auto bg-theme p-2">
          <DayViewPanel
            activeDay={activeDay}
            items={items}
            selectedItemId={selectedItemId}
            activeDragItemId={activeDragItemId}
            onUpdateItem={onUpdateItem}
            onItemClick={onItemClick}
            onItemDoubleClick={onItemDoubleClick}
            onCreateAtTime={onCreateAtTime}
            resolveExternalDrop={resolveExternalDrop}
            commitExternalDrop={commitExternalDrop}
            dayHeaderPreview={dayHeaderPreview}
            onDayHeaderDragOver={handleDayHeaderDragOver}
            onDayHeaderDrop={handleDayHeaderDrop}
            onDayHeaderDragLeave={handleDayHeaderDragLeave}
            onFocusDay={setFocusedDayId}
          />
        </div>
      ) : (
        <div ref={scrollerRef} className="min-h-0 flex-1 overflow-auto bg-theme">
          <div className="inline-flex min-h-full min-w-full">
            <MultiViewTimeAxis globalStartH={globalRange.startH} gHours={gHours} gTotalH={gTotalH} />

            <div className="flex gap-2 px-2 py-2">
              {orderedDays.map((day) => {
                const dayItems = items
                  .filter((item) => item.dayId === day.dayId && Boolean(item.scheduledStart))
                  .sort((a, b) => {
                    const delta = toMins(a.scheduledStart) - toMins(b.scheduledStart);
                    return delta === 0 ? a.sortOrder - b.sortOrder : delta;
                  });

                return (
                  <MultiDayColumn
                    key={day.dayId}
                    ref={(node) => {
                      dayColumnRefs.current[day.dayId] = node;
                    }}
                    day={day}
                    dayItems={dayItems}
                    globalStartH={globalRange.startH}
                    globalEndH={globalRange.endH}
                    gTotalH={gTotalH}
                    gHours={gHours}
                    nowMin={nowMin}
                    selectedItemId={selectedItemId}
                    activeDragItemId={activeDragItemId}
                    isActive={effectiveDayId === day.dayId}
                    scrollerRef={scrollerRef}
                    onUpdateItem={onUpdateItem}
                    onItemClick={(itemId) => {
                      onItemClick?.(itemId);
                      setFocusedDayId(day.dayId);
                    }}
                    onItemDoubleClick={onItemDoubleClick}
                    onCreateAtTime={onCreateAtTime}
                    onFocusDay={() => {
                      setFocusedDayId(day.dayId);
                      centerDay(day.dayId);
                    }}
                    resolveExternalDrop={resolveExternalDrop}
                    commitExternalDrop={commitExternalDrop}
                  />
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
