import type React from 'react';
import type { Day, Item } from '@/types/trip';
import { DAY_VIEW_MAX_W, DAY_VIEW_MIN_W } from '../constants';
import { SingleDayTimeline } from './SingleDayTimeline';
import type { CommitExternalDrop, ExternalDragPreview, ResolveExternalDrop } from '../types';

interface DayViewPanelProps {
  activeDay: Day | null;
  items: Item[];
  selectedItemId: string | null;
  activeDragItemId: string | null;
  onUpdateItem?: (itemId: string, updates: Partial<Item>) => void;
  onItemClick?: (itemId: string) => void;
  onItemDoubleClick?: (itemId: string) => void;
  onCreateAtTime?: (dayId: string, startTime: string, endTime: string) => void;
  resolveExternalDrop: ResolveExternalDrop;
  commitExternalDrop: CommitExternalDrop;
  dayHeaderPreview: ExternalDragPreview | null;
  onDayHeaderDragOver: (e: React.DragEvent, day: Day) => void;
  onDayHeaderDrop: (e: React.DragEvent, day: Day) => void;
  onDayHeaderDragLeave: (e: React.DragEvent) => void;
  onFocusDay: (dayId: string) => void;
}

export function DayViewPanel({
  activeDay,
  items,
  selectedItemId,
  activeDragItemId,
  onUpdateItem,
  onItemClick,
  onItemDoubleClick,
  onCreateAtTime,
  resolveExternalDrop,
  commitExternalDrop,
  dayHeaderPreview,
  onDayHeaderDragOver,
  onDayHeaderDrop,
  onDayHeaderDragLeave,
  onFocusDay,
}: DayViewPanelProps) {
  if (!activeDay) {
    return <div className="flex h-full items-center justify-center text-sm text-theme-tertiary">Select a day</div>;
  }

  return (
    <div
      className="mx-auto flex h-full min-h-0 flex-col overflow-hidden rounded-xl border border-theme bg-theme"
      style={{ minWidth: DAY_VIEW_MIN_W, maxWidth: DAY_VIEW_MAX_W }}
    >
      <div
        className="flex items-center justify-between border-b border-theme px-3 py-2"
        onDragOver={(e) => onDayHeaderDragOver(e, activeDay)}
        onDrop={(e) => onDayHeaderDrop(e, activeDay)}
        onDragLeave={onDayHeaderDragLeave}
      >
        <div className="flex min-w-0 items-center gap-2">
          <span className="h-2.5 w-2.5 flex-shrink-0 rounded-full" style={{ backgroundColor: activeDay.colorHex }} />
          <span className="truncate text-xs font-semibold text-theme">{activeDay.label}</span>
        </div>
        <span className="text-[11px] text-theme-tertiary">{activeDay.date}</span>
      </div>

      <div className="min-h-0 flex-1">
        <SingleDayTimeline
          day={activeDay}
          items={items}
          selectedItemId={selectedItemId}
          activeDragItemId={activeDragItemId}
          onUpdateItem={onUpdateItem}
          onItemClick={(itemId) => {
            onItemClick?.(itemId);
            onFocusDay(activeDay.dayId);
          }}
          onItemDoubleClick={onItemDoubleClick}
          onCreateAtTime={
            onCreateAtTime
              ? (startTime, endTime) => onCreateAtTime(activeDay.dayId, startTime, endTime)
              : undefined
          }
          resolveExternalDrop={resolveExternalDrop}
          commitExternalDrop={commitExternalDrop}
          externalHeaderPreview={dayHeaderPreview}
        />
      </div>
    </div>
  );
}
