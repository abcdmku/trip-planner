import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useHotkey } from '@tanstack/react-hotkeys';
import { deriveTimelineConnectorsWithTiming } from '@/lib/connectors';
import { resolvePointDropNearest } from '@/lib/timeline-drop';
import { DEFAULT_TIMELINE_SNAP_MINUTES } from '@/lib/timeline-snap';
import {
  PX_PER_MIN,
  TIME_AXIS_W,
  TIMELINE_MAX_PX_PER_MIN,
  TIMELINE_MIN_PX_PER_MIN,
  TIMELINE_ZOOM_STEP_PX_PER_MIN,
} from './constants';
import { snapM, toMins, toTime } from './time';
import type {
  CrossDayDragPreview,
  CrossDayMoveInfo,
  LiveItemPreview,
  VerticalTimelineProps,
  ViewMode,
} from './types';
import { useExternalTimelineDrop } from './useExternalTimelineDrop';
import { useWindowDragCleanup } from './useWindowDragCleanup';
import { TimelineViewControls } from './TimelineViewControls';
import { buildTimelineRenderItemsByDay } from './render-segments';
import { DayViewPanel } from './day/DayViewPanel';
import { MultiDayColumn } from './multi/MultiDayColumn';
import { MultiViewTimeAxis } from './multi/MultiViewTimeAxis';

export function VerticalTimeline({
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
  onItemClick,
  onItemDoubleClick,
  onCreateAtTime,
  onTimelineConnectorClick,
  onTimelineConnectorRemove,
  suppressedConnectorIds,
  showTimelineConnectors = true,
  onToggleTimelineConnectors,
  remoteObjectPresenceById,
  onViewportChange,
  followViewport,
  jumpToViewport,
  onJumpApplied,
}: VerticalTimelineProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const dayModeContainerRef = useRef<HTMLDivElement>(null);
  const dayColumnRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const applyingRemoteViewportRef = useRef(false);
  const lastAppliedFollowViewportSignatureRef = useRef<string | null>(null);

  const [viewMode, setViewMode] = useState<ViewMode>('multi');
  const [focusedDayId, setFocusedDayId] = useState<string | null>(selectedDayIds[0] ?? days[0]?.dayId ?? null);
  const [pxPerMin, setPxPerMin] = useState(PX_PER_MIN);
  const [internalSnapMinutes, setInternalSnapMinutes] = useState(DEFAULT_TIMELINE_SNAP_MINUTES);
  const hasAutoRevealedDayRef = useRef(false);
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

  // Compute timeline connectors for all items
  const timelineConnectors = useMemo(() => {
    if (!showTimelineConnectors) return [];
    return deriveTimelineConnectorsWithTiming(items, suppressedConnectorIds);
  }, [items, showTimelineConnectors, suppressedConnectorIds]);

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
  const canZoomOut = pxPerMin > TIMELINE_MIN_PX_PER_MIN;
  const canZoomIn = pxPerMin < TIMELINE_MAX_PX_PER_MIN;

  const updateZoom = useCallback((next: number) => {
    const clamped = Math.max(TIMELINE_MIN_PX_PER_MIN, Math.min(TIMELINE_MAX_PX_PER_MIN, next));
    setPxPerMin(Math.round(clamped * 10) / 10);
  }, []);

  const publishViewport = useCallback(() => {
    if (!onViewportChange || applyingRemoteViewportRef.current) return;
    const container = viewMode === 'multi' ? scrollerRef.current : dayModeContainerRef.current;
    onViewportChange({
      viewMode,
      focusedDayId: effectiveDayId,
      scrollLeft: container?.scrollLeft ?? 0,
      scrollTop: container?.scrollTop ?? 0,
      zoom: pxPerMin / PX_PER_MIN,
    });
  }, [effectiveDayId, onViewportChange, pxPerMin, viewMode]);

  useEffect(() => {
    publishViewport();
  }, [publishViewport]);

  useEffect(() => {
    const container = viewMode === 'multi' ? scrollerRef.current : dayModeContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      publishViewport();
    };
    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, [publishViewport, viewMode]);

  const applyViewport = useCallback(
    (viewport: typeof followViewport, behavior: ScrollBehavior = 'auto') => {
      if (!viewport) return;
      const targetMode = viewport.viewMode === 'day' || viewport.viewMode === 'multi' ? viewport.viewMode : 'multi';
      applyingRemoteViewportRef.current = true;
      setViewMode(targetMode);
      if (viewport.focusedDayId) {
        setFocusedDayId(viewport.focusedDayId);
      }
      updateZoom(viewport.zoom * PX_PER_MIN);

      requestAnimationFrame(() => {
        const container = targetMode === 'multi' ? scrollerRef.current : dayModeContainerRef.current;
        container?.scrollTo({
          left: viewport.scrollLeft,
          top: viewport.scrollTop,
          behavior,
        });
        window.setTimeout(() => {
          applyingRemoteViewportRef.current = false;
        }, 220);
      });
    },
    [updateZoom],
  );

  useEffect(() => {
    if (!followViewport) {
      lastAppliedFollowViewportSignatureRef.current = null;
      return;
    }

    const signature = [
      followViewport.connectionId,
      followViewport.updatedAt,
      followViewport.viewMode,
      followViewport.focusedDayId ?? '',
      followViewport.scrollLeft,
      followViewport.scrollTop,
      followViewport.zoom,
    ].join('|');
    if (lastAppliedFollowViewportSignatureRef.current === signature) return;

    lastAppliedFollowViewportSignatureRef.current = signature;
    applyViewport(followViewport, 'auto');
  }, [
    applyViewport,
    followViewport,
    followViewport?.connectionId,
    followViewport?.focusedDayId,
    followViewport?.scrollLeft,
    followViewport?.scrollTop,
    followViewport?.updatedAt,
    followViewport?.viewMode,
    followViewport?.zoom,
  ]);

  useEffect(() => {
    if (!jumpToViewport) return;
    applyViewport(jumpToViewport.viewport, 'smooth');
    onJumpApplied?.(jumpToViewport.key);
  }, [applyViewport, jumpToViewport, onJumpApplied]);

  const handleTimelineDragOver = useCallback(
    (_e: React.DragEvent) => {
      if (activeDragItemId) onDragOverTimeline?.(true);
    },
    [activeDragItemId, onDragOverTimeline],
  );

  const handleTimelineDragLeave = useCallback(
    (e: React.DragEvent) => {
      const relatedTarget = e.relatedTarget as Node | null;
      if (relatedTarget && e.currentTarget.contains(relatedTarget)) return;
      onDragOverTimeline?.(false);
    },
    [onDragOverTimeline],
  );

  const handleTimelineDrop = useCallback(() => {
    onDragOverTimeline?.(false);
  }, [onDragOverTimeline]);

  // ── Cross-day drag: continuous tracking at root level ──

  const [crossDayDrag, setCrossDayDrag] = useState<CrossDayDragPreview | null>(null);
  const crossDayDragRef = useRef<CrossDayDragPreview | null>(null);

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
        const refs = dayColumnRefs.current;
        const sourceItem = itemsById.get(info.itemId);
        if (!sourceItem) return null;

        for (const day of orderedDays) {
          const el = refs[day.dayId];
          if (!el) continue;
          const rect = el.getBoundingClientRect();
          if (clientX >= rect.left && clientX <= rect.right) {
            const bodyEl = el.querySelector('[data-timeline-body]') as HTMLElement | null;
            if (!bodyEl) return null;
            const bodyRect = bodyEl.getBoundingClientRect();
            const rawY = clientY - bodyRect.top;
            const anchorMin = snapM(
              Math.max(0, Math.min(1440 - duration, rawY / pxPerMin + globalRange.startH * 60)),
              effectiveSnapMinutes,
            );
            const resolution = resolvePointDropNearest({
              item: sourceItem,
              day,
              anchorMin,
              snapMinutes: effectiveSnapMinutes,
            });
            if (!resolution.valid) return null;
            return {
              itemId: info.itemId,
              targetDayId: day.dayId,
              startMin: resolution.startMin,
              endMin: resolution.endMin,
            };
          }
        }
        return null;
      };

      // Set initial preview
      const initial = findTarget(info.clientX, info.clientY);
      crossDayDragRef.current = initial;
      setCrossDayDrag(initial);
      if (initial) {
        emitLiveItemPreview({
          itemId: initial.itemId,
          dayId: initial.targetDayId,
          scheduledStart: toTime(initial.startMin),
          scheduledEnd: toTime(initial.endMin),
          durationMinutes: initial.endMin - initial.startMin,
          mode: 'move',
        });
      } else {
        emitLiveItemPreview(null);
      }

      document.body.style.cursor = 'grabbing';
      document.body.style.userSelect = 'none';

      const handleMove = (e: PointerEvent) => {
        const target = findTarget(e.clientX, e.clientY);
        if (target) {
          crossDayDragRef.current = target;
          setCrossDayDrag(target);
          emitLiveItemPreview({
            itemId: target.itemId,
            dayId: target.targetDayId,
            scheduledStart: toTime(target.startMin),
            scheduledEnd: toTime(target.endMin),
            durationMinutes: target.endMin - target.startMin,
            mode: 'move',
          });
        } else {
          emitLiveItemPreview(null);
        }
      };

      const handleUp = () => {
        document.removeEventListener('pointermove', handleMove);
        document.removeEventListener('pointerup', handleUp);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';

        const final = crossDayDragRef.current;
        crossDayDragRef.current = null;
        setCrossDayDrag(null);
        emitLiveItemPreview(null);

        if (final) {
          onUpdateItem(final.itemId, {
            dayId: final.targetDayId,
            scheduledStart: toTime(final.startMin),
            scheduledEnd: toTime(final.endMin),
          });
          setFocusedDayId(final.targetDayId);
        }
      };

      document.addEventListener('pointermove', handleMove);
      document.addEventListener('pointerup', handleUp);
    },
    [effectiveSnapMinutes, emitLiveItemPreview, globalRange.startH, itemsById, onUpdateItem, orderedDays, pxPerMin],
  );

  if (!orderedDays.length) {
    return <div className="flex h-full items-center justify-center text-sm text-theme-tertiary">Add a day to start planning</div>;
  }

  return (
    <div
      ref={rootRef}
      tabIndex={0}
      onPointerDownCapture={() => rootRef.current?.focus()}
      onDragOver={handleTimelineDragOver}
      onDragLeave={handleTimelineDragLeave}
      onDrop={handleTimelineDrop}
      className="flex h-full min-h-0 flex-col overflow-hidden focus:outline-none"
    >
      <TimelineViewControls
        viewMode={viewMode}
        showPrev={showPrev}
        showNext={showNext}
        canZoomOut={canZoomOut}
        canZoomIn={canZoomIn}
        zoomPercent={Math.round((pxPerMin / PX_PER_MIN) * 100)}
        snapMinutes={effectiveSnapMinutes}
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
        onZoomOut={() => updateZoom(pxPerMin - TIMELINE_ZOOM_STEP_PX_PER_MIN)}
        onZoomIn={() => updateZoom(pxPerMin + TIMELINE_ZOOM_STEP_PX_PER_MIN)}
        onResetZoom={() => updateZoom(PX_PER_MIN)}
        onSnapMinutesChange={setEffectiveSnapMinutes}
        onModeChange={setViewMode}
        showConnectors={showTimelineConnectors}
        onToggleConnectors={onToggleTimelineConnectors}
      />

      {viewMode === 'day' ? (
        <div ref={dayModeContainerRef} className="min-h-0 flex-1 overflow-auto bg-theme p-2">
          <DayViewPanel
            activeDay={activeDay}
            items={items}
            dayItems={activeDay ? (timelineItemsByDay.get(activeDay.dayId) ?? []) : []}
            selectedItemId={selectedItemId}
            activeDragItemId={activeDragItemId}
            onUpdateItem={onUpdateItem}
            onLiveItemPreviewChange={emitLiveItemPreview}
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
            connectors={timelineConnectors}
            onConnectorClick={onTimelineConnectorClick}
            onConnectorRemove={onTimelineConnectorRemove}
            showConnectors={showTimelineConnectors}
            pxPerMin={pxPerMin}
            pxPerHr={pxPerHr}
            snapMinutes={effectiveSnapMinutes}
            remoteObjectPresenceById={remoteObjectPresenceById}
          />
        </div>
      ) : (
        <div ref={scrollerRef} className="min-h-0 flex-1 overflow-auto bg-theme">
          <div className="inline-flex min-h-full min-w-full">
            <MultiViewTimeAxis
              globalStartH={globalRange.startH}
              gHours={gHours}
              gTotalH={gTotalH}
              pxPerHr={pxPerHr}
            />

            <div className="flex gap-2 px-2 py-2">
              {orderedDays.map((day) => {
                const dayItems = timelineItemsByDay.get(day.dayId) ?? [];

                return (
                  <MultiDayColumn
                    key={day.dayId}
                    ref={(node) => {
                      dayColumnRefs.current[day.dayId] = node;
                    }}
                    day={day}
                    dayItems={dayItems}
                    allItems={items}
                    pxPerMin={pxPerMin}
                    pxPerHr={pxPerHr}
                    snapMinutes={effectiveSnapMinutes}
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
                    onLiveItemPreviewChange={emitLiveItemPreview}
                    onItemClick={(itemId) => {
                      onItemClick?.(itemId);
                      setFocusedDayId(day.dayId);
                    }}
                    onItemDoubleClick={onItemDoubleClick}
                    onCreateAtTime={onCreateAtTime}
                    onFocusDay={() => {
                      setFocusedDayId(day.dayId);
                      scrollDayIntoView(day.dayId);
                    }}
                    resolveExternalDrop={resolveExternalDrop}
                    commitExternalDrop={commitExternalDrop}
                    onMoveOutOfBounds={handleCrossDayMove}
                    crossDayDragPreview={crossDayDrag}
                    connectors={timelineConnectors}
                    onConnectorClick={onTimelineConnectorClick}
                    onConnectorRemove={onTimelineConnectorRemove}
                    showConnectors={showTimelineConnectors}
                    remoteObjectPresenceById={remoteObjectPresenceById}
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
