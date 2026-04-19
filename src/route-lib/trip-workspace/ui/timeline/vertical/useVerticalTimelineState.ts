import { useHotkey } from '@tanstack/react-hotkeys';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type DragEvent } from 'react';
import { deriveTimelineConnectorsWithTiming } from '@/lib/connectors';
import { DEFAULT_TIMELINE_SNAP_MINUTES } from '@/lib/timeline-snap';
import { useCrossDayTimelineDrag } from './useCrossDayTimelineDrag';
import { useExternalTimelineDrop } from './useExternalTimelineDrop';
import { useTimelineViewportSync } from './useTimelineViewportSync';
import { useWindowDragCleanup } from './useWindowDragCleanup';
import { buildTimelineRenderItemsByDay } from './render-segments';
import { PX_PER_MIN, TIME_AXIS_W, TIMELINE_MAX_PX_PER_MIN, TIMELINE_MIN_PX_PER_MIN } from './constants';
import { toMins } from './time';
import type { LiveItemPreview, VerticalTimelineProps, ViewMode } from './types';

function toDayId(value: string | undefined): string | null {
  return value ?? null;
}

export function useVerticalTimelineState({
  items,
  days,
  selectedDayIds = [],
  selectedItemId = null,
  activeDragItemId = null,
  snapMinutes,
  onSnapMinutesChange,
  onDragOverTimeline,
  onUpdateItem,
  onLiveItemPreviewChange,
  suppressedConnectorIds,
  showTimelineConnectors = true,
  onViewportChange,
  followViewport,
  jumpToViewport,
  onJumpApplied,
}: VerticalTimelineProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const dayModeContainerRef = useRef<HTMLDivElement>(null);
  const dayColumnRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const hasAutoRevealedDayRef = useRef(false);

  const [viewMode, setViewMode] = useState<ViewMode>('multi');
  const initialFocusedDayId = toDayId(selectedDayIds[0]) ?? toDayId(days[0]?.dayId) ?? null;
  const [focusedDayId, setFocusedDayId] = useState<string | null>(initialFocusedDayId);
  const [pxPerMin, setPxPerMin] = useState(PX_PER_MIN);
  const [internalSnapMinutes, setInternalSnapMinutes] = useState(DEFAULT_TIMELINE_SNAP_MINUTES);

  const pxPerHr = pxPerMin * 60;
  const effectiveSnapMinutes = snapMinutes ?? internalSnapMinutes;
  const setEffectiveSnapMinutes = onSnapMinutesChange ?? setInternalSnapMinutes;

  const orderedDays = useMemo(() => [...days].sort((a, b) => a.date.localeCompare(b.date)), [days]);
  const timelineItemsByDay = useMemo(() => buildTimelineRenderItemsByDay(orderedDays, items), [items, orderedDays]);
  const timelineRenderItems = useMemo(
    () => orderedDays.flatMap((day) => timelineItemsByDay.get(day.dayId) ?? []),
    [orderedDays, timelineItemsByDay],
  );
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
    snapMinutes: effectiveSnapMinutes,
    onUpdateItem,
    onLiveItemPreviewChange,
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

    for (const item of timelineRenderItems) {
      const startMin = toMins(item.scheduledStart);
      const endMin = item.scheduledEnd ? toMins(item.scheduledEnd) : startMin + item.durationMinutes;
      minHour = Math.min(minHour, Math.floor(startMin / 60));
      maxHour = Math.max(maxHour, Math.ceil(endMin / 60));
    }

    return { startH: Math.max(0, minHour - 1), endH: Math.min(24, maxHour + 1) };
  }, [orderedDays, timelineRenderItems]);

  const gTotalH = (globalRange.endH - globalRange.startH) * pxPerHr;
  const gHours = useMemo(
    () => Array.from({ length: globalRange.endH - globalRange.startH + 1 }, (_, i) => globalRange.startH + i),
    [globalRange.endH, globalRange.startH],
  );
  const timelineConnectors = useMemo(() => {
    if (!showTimelineConnectors) return [];
    return deriveTimelineConnectorsWithTiming(items, suppressedConnectorIds);
  }, [items, showTimelineConnectors, suppressedConnectorIds]);

  const nowMin = new Date().getHours() * 60 + new Date().getMinutes();
  const selectedDayId = selectedDayIds.length === 1 ? toDayId(selectedDayIds[0]) : null;
  const effectiveDayId = selectedDayId ?? focusedDayId ?? orderedDays[0]?.dayId ?? null;
  const effectiveDayIndex = orderedDays.findIndex((day) => day.dayId === effectiveDayId);
  const activeDay = effectiveDayId ? orderedDays.find((day) => day.dayId === effectiveDayId) ?? null : null;

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

  useLayoutEffect(() => {
    if (!selectedDayId || viewMode === 'day') return;
    setViewMode('day');
  }, [selectedDayId, viewMode]);

  const scrollDayIntoView = useCallback((dayId: string, behavior: ScrollBehavior = 'smooth') => {
    const scroller = scrollerRef.current;
    const target = dayColumnRefs.current[dayId];
    if (!scroller || !target) return;

    const scrollerRect = scroller.getBoundingClientRect();
    const targetRect = target.getBoundingClientRect();
    const targetLeft = scroller.scrollLeft + (targetRect.left - scrollerRect.left);
    const maxLeft = Math.max(0, scroller.scrollWidth - scroller.clientWidth);
    const nextLeft = Math.max(0, Math.min(maxLeft, targetLeft - TIME_AXIS_W));
    scroller.scrollTo({ left: nextLeft, behavior });
  }, []);

  useEffect(() => {
    if (viewMode !== 'multi' || !effectiveDayId) return;
    const behavior = hasAutoRevealedDayRef.current ? 'smooth' : 'auto';
    const frame = requestAnimationFrame(() => {
      scrollDayIntoView(effectiveDayId, behavior);
      hasAutoRevealedDayRef.current = true;
    });
    return () => cancelAnimationFrame(frame);
  }, [effectiveDayId, scrollDayIntoView, viewMode]);

  useEffect(() => {
    if (!activeDay || viewMode !== 'day') {
      setDayHeaderPreview(null);
      return;
    }
    setDayHeaderPreview((prev) => (prev?.dayId === activeDay.dayId ? prev : null));
  }, [activeDay, setDayHeaderPreview, viewMode]);

  const showPrev = viewMode === 'day' && !selectedDayId && effectiveDayIndex > 0;
  const showNext = viewMode === 'day' && !selectedDayId && effectiveDayIndex < orderedDays.length - 1;
  const canZoomOut = pxPerMin > TIMELINE_MIN_PX_PER_MIN;
  const canZoomIn = pxPerMin < TIMELINE_MAX_PX_PER_MIN;

  const updateZoom = useCallback((next: number) => {
    const clamped = Math.max(TIMELINE_MIN_PX_PER_MIN, Math.min(TIMELINE_MAX_PX_PER_MIN, next));
    setPxPerMin(Math.round(clamped * 10) / 10);
  }, []);

  useTimelineViewportSync({
    viewMode,
    effectiveDayId,
    pxPerMin,
    onViewportChange,
    followViewport,
    jumpToViewport,
    onJumpApplied,
    scrollerRef,
    dayModeContainerRef,
    setViewMode,
    setFocusedDayId,
    updateZoom,
  });

  const handleTimelineDragOver = useCallback(
    (_event: DragEvent<HTMLDivElement>) => {
      if (activeDragItemId) onDragOverTimeline?.(true);
    },
    [activeDragItemId, onDragOverTimeline],
  );

  const handleTimelineDragLeave = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      const relatedTarget = event.relatedTarget as Node | null;
      if (relatedTarget && event.currentTarget.contains(relatedTarget)) return;
      onDragOverTimeline?.(false);
    },
    [onDragOverTimeline],
  );

  const handleTimelineDrop = useCallback(() => {
    onDragOverTimeline?.(false);
  }, [onDragOverTimeline]);

  const emitLiveItemPreview = useCallback(
    (preview: LiveItemPreview | null) => {
      onLiveItemPreviewChange?.(preview);
    },
    [onLiveItemPreviewChange],
  );

  const { crossDayDrag, handleCrossDayMove } = useCrossDayTimelineDrag({
    itemsById,
    orderedDays,
    dayColumnRefs,
    globalStartH: globalRange.startH,
    pxPerMin,
    snapMinutes: effectiveSnapMinutes,
    onUpdateItem,
    onLiveItemPreviewChange: emitLiveItemPreview,
    onFocusDay: setFocusedDayId,
  });

  return {
    rootRef,
    scrollerRef,
    dayModeContainerRef,
    dayColumnRefs,
    viewMode,
    setViewMode,
    focusedDayId,
    setFocusedDayId,
    pxPerMin,
    setPxPerMin,
    effectiveSnapMinutes,
    setEffectiveSnapMinutes,
    orderedDays,
    timelineItemsByDay,
    timelineRenderItems,
    selectedTimelineItem,
    itemsById,
    globalRange,
    gTotalH,
    gHours,
    timelineConnectors,
    nowMin,
    selectedDayId,
    effectiveDayId,
    effectiveDayIndex,
    activeDay,
    showPrev,
    showNext,
    canZoomOut,
    canZoomIn,
    updateZoom,
    handleTimelineDragOver,
    handleTimelineDragLeave,
    handleTimelineDrop,
    emitLiveItemPreview,
    dayHeaderPreview,
    resolveExternalDrop,
    commitExternalDrop,
    clearDayHeaderPreview,
    handleDayHeaderDragOver,
    handleDayHeaderDrop,
    handleDayHeaderDragLeave,
    scrollDayIntoView,
    crossDayDrag,
    handleCrossDayMove,
  };
}
