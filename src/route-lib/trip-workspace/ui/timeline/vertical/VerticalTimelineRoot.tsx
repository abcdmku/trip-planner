import { useCallback } from 'react';
import { useVerticalTimelineState } from './useVerticalTimelineState';
import { TimelineViewControls } from './TimelineViewControls';
import { DayViewPanel } from './day/DayViewPanel';
import { MultiDayColumn } from './multi/MultiDayColumn';
import { MultiViewTimeAxis } from './multi/MultiViewTimeAxis';
import { PX_PER_MIN } from './constants';
import type { VerticalTimelineProps } from './types';

export function VerticalTimeline(props: VerticalTimelineProps) {
  const timeline = useVerticalTimelineState(props);

  const handleResetZoom = useCallback(() => {
    timeline.updateZoom(PX_PER_MIN);
  }, [timeline]);

  if (!timeline.orderedDays.length) {
    return <div className="flex h-full items-center justify-center text-sm text-theme-tertiary">Add a day to start planning</div>;
  }

  return (
    <div
      ref={timeline.rootRef}
      tabIndex={0}
      onPointerDownCapture={() => timeline.rootRef.current?.focus()}
      onDragOver={timeline.handleTimelineDragOver}
      onDragLeave={timeline.handleTimelineDragLeave}
      onDrop={timeline.handleTimelineDrop}
      className="flex h-full min-h-0 flex-col overflow-hidden focus:outline-none"
    >
      <TimelineViewControls
        viewMode={timeline.viewMode}
        showPrev={timeline.showPrev}
        showNext={timeline.showNext}
        canZoomOut={timeline.canZoomOut}
        canZoomIn={timeline.canZoomIn}
        zoomPercent={Math.round((timeline.pxPerMin / PX_PER_MIN) * 100)}
        snapMinutes={timeline.effectiveSnapMinutes}
        onPrev={() => {
          if (!timeline.showPrev) return;
          const prev = timeline.orderedDays[timeline.effectiveDayIndex - 1];
          if (prev) timeline.setFocusedDayId(prev.dayId);
        }}
        onNext={() => {
          if (!timeline.showNext) return;
          const next = timeline.orderedDays[timeline.effectiveDayIndex + 1];
          if (next) timeline.setFocusedDayId(next.dayId);
        }}
        onZoomOut={() => timeline.updateZoom(timeline.pxPerMin - 0.1)}
        onZoomIn={() => timeline.updateZoom(timeline.pxPerMin + 0.1)}
        onResetZoom={handleResetZoom}
        onSnapMinutesChange={timeline.setEffectiveSnapMinutes}
        onModeChange={timeline.setViewMode}
        showConnectors={props.showTimelineConnectors}
        onToggleConnectors={props.onToggleTimelineConnectors}
      />

      {timeline.viewMode === 'day' ? (
        <div ref={timeline.dayModeContainerRef} className="min-h-0 flex-1 overflow-auto bg-theme p-2">
          <DayViewPanel
            activeDay={timeline.activeDay}
            items={props.items}
            dayItems={timeline.activeDay ? (timeline.timelineItemsByDay.get(timeline.activeDay.dayId) ?? []) : []}
            selectedItemId={props.selectedItemId ?? null}
            activeDragItemId={props.activeDragItemId ?? null}
            onUpdateItem={props.onUpdateItem}
            onLiveItemPreviewChange={timeline.emitLiveItemPreview}
            onItemClick={props.onItemClick}
            onItemDoubleClick={props.onItemDoubleClick}
            onCreateAtTime={props.onCreateAtTime}
            resolveExternalDrop={timeline.resolveExternalDrop}
            commitExternalDrop={timeline.commitExternalDrop}
            dayHeaderPreview={timeline.dayHeaderPreview}
            onDayHeaderDragOver={timeline.handleDayHeaderDragOver}
            onDayHeaderDrop={timeline.handleDayHeaderDrop}
            onDayHeaderDragLeave={timeline.handleDayHeaderDragLeave}
            onFocusDay={timeline.setFocusedDayId}
            connectors={timeline.timelineConnectors}
            onConnectorClick={props.onTimelineConnectorClick}
            onConnectorRemove={props.onTimelineConnectorRemove}
            showConnectors={props.showTimelineConnectors}
            pxPerMin={timeline.pxPerMin}
            pxPerHr={timeline.pxPerMin * 60}
            snapMinutes={timeline.effectiveSnapMinutes}
            remoteObjectPresenceById={props.remoteObjectPresenceById}
          />
        </div>
      ) : (
        <div ref={timeline.scrollerRef} className="min-h-0 flex-1 overflow-auto bg-theme">
          <div className="inline-flex min-h-full min-w-full">
            <MultiViewTimeAxis
              globalStartH={timeline.globalRange.startH}
              gHours={timeline.gHours}
              gTotalH={timeline.gTotalH}
              pxPerHr={timeline.pxPerMin * 60}
            />

            <div className="flex gap-2 px-2 py-2">
              {timeline.orderedDays.map((day) => {
                const dayItems = timeline.timelineItemsByDay.get(day.dayId) ?? [];

                return (
                  <MultiDayColumn
                    key={day.dayId}
                    ref={(node) => {
                      timeline.dayColumnRefs.current[day.dayId] = node;
                    }}
                    day={day}
                    dayItems={dayItems}
                    allItems={props.items}
                    pxPerMin={timeline.pxPerMin}
                    pxPerHr={timeline.pxPerMin * 60}
                    snapMinutes={timeline.effectiveSnapMinutes}
                    globalStartH={timeline.globalRange.startH}
                    globalEndH={timeline.globalRange.endH}
                    gTotalH={timeline.gTotalH}
                    gHours={timeline.gHours}
                    nowMin={timeline.nowMin}
                    selectedItemId={props.selectedItemId ?? null}
                    activeDragItemId={props.activeDragItemId ?? null}
                    isActive={timeline.effectiveDayId === day.dayId}
                    scrollerRef={timeline.scrollerRef}
                    onUpdateItem={props.onUpdateItem}
                    onLiveItemPreviewChange={timeline.emitLiveItemPreview}
                    onItemClick={(itemId) => {
                      props.onItemClick?.(itemId);
                      timeline.setFocusedDayId(day.dayId);
                    }}
                    onItemDoubleClick={props.onItemDoubleClick}
                    onCreateAtTime={props.onCreateAtTime}
                    onFocusDay={() => {
                      timeline.setFocusedDayId(day.dayId);
                      timeline.scrollDayIntoView(day.dayId);
                    }}
                    resolveExternalDrop={timeline.resolveExternalDrop}
                    commitExternalDrop={timeline.commitExternalDrop}
                    onMoveOutOfBounds={timeline.handleCrossDayMove}
                    crossDayDragPreview={timeline.crossDayDrag}
                    connectors={timeline.timelineConnectors}
                    onConnectorClick={props.onTimelineConnectorClick}
                    onConnectorRemove={props.onTimelineConnectorRemove}
                    showConnectors={props.showTimelineConnectors}
                    remoteObjectPresenceById={props.remoteObjectPresenceById}
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
