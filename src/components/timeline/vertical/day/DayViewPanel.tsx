import type React from 'react';
import type { Day, Item } from '@/types/trip';
import type { TimelineConnectorWithTiming } from '@/lib/connectors';
import { getDayDisplayLabel } from '@/lib/day-labels';
import { DAY_VIEW_MAX_W, DAY_VIEW_MIN_W } from '../constants';
import { SingleDayTimeline } from './SingleDayTimeline';
import type {
  CommitExternalDrop,
  ExternalDragPreview,
  LiveItemPreview,
  MultiDayColumnProps,
  ResolveExternalDrop,
} from '../types';

interface DayViewPanelProps {
  activeDay: Day | null;
  items: Item[];
  dayItems: Item[];
  pxPerMin: number;
  pxPerHr: number;
  snapMinutes: number;
  selectedItemId: string | null;
  activeDragItemId: string | null;
  onUpdateItem?: (itemId: string, updates: Partial<Item>) => void;
  onLiveItemPreviewChange?: (preview: LiveItemPreview | null) => void;
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
  /** Timeline connectors for all days */
  connectors?: TimelineConnectorWithTiming[];
  /** Called when a connector line is clicked */
  onConnectorClick?: (connector: TimelineConnectorWithTiming) => void;
  /** Called when remove button on a connector is clicked */
  onConnectorRemove?: (connector: TimelineConnectorWithTiming) => void;
  /** Whether to show auto-connect lines */
  showConnectors?: boolean;
  remoteObjectPresenceById?: MultiDayColumnProps['remoteObjectPresenceById'];
}

export function DayViewPanel({
  activeDay,
  items,
  dayItems,
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
  dayHeaderPreview,
  onDayHeaderDragOver,
  onDayHeaderDrop,
  onDayHeaderDragLeave,
  onFocusDay,
  connectors = [],
  onConnectorClick,
  onConnectorRemove,
  showConnectors = true,
  remoteObjectPresenceById,
}: DayViewPanelProps) {
  if (!activeDay) {
    return <div className="flex h-full items-center justify-center text-sm text-theme-tertiary">Select a day</div>;
  }

  const displayLabel = getDayDisplayLabel(activeDay);

  return (
    <div
      className="mx-auto flex h-full min-h-0 flex-col overflow-hidden rounded-xl border border-theme bg-theme"
      style={{ minWidth: DAY_VIEW_MIN_W, maxWidth: DAY_VIEW_MAX_W }}
    >
      <div
        className={`flex items-center justify-between border-b px-3 py-2 transition-colors duration-150 ${
          dayHeaderPreview ? 'border-accent/50 bg-accent/10' : 'border-theme'
        }`}
        onDragOver={(e) => onDayHeaderDragOver(e, activeDay)}
        onDrop={(e) => onDayHeaderDrop(e, activeDay)}
        onDragLeave={onDayHeaderDragLeave}
      >
        <div className="flex min-w-0 items-center gap-2">
          <span className="h-2.5 w-2.5 flex-shrink-0 rounded-full" style={{ backgroundColor: activeDay.colorHex }} />
          <span className="truncate text-xs font-semibold text-theme">{displayLabel}</span>
        </div>
        <span className="text-[11px] text-theme-tertiary">{activeDay.date}</span>
      </div>

      <div className="min-h-0 flex-1">
        <SingleDayTimeline
          day={activeDay}
          items={dayItems}
          allItems={items}
          pxPerMin={pxPerMin}
          pxPerHr={pxPerHr}
          snapMinutes={snapMinutes}
          selectedItemId={selectedItemId}
          activeDragItemId={activeDragItemId}
          onUpdateItem={onUpdateItem}
          onLiveItemPreviewChange={onLiveItemPreviewChange}
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
          connectors={connectors}
          onConnectorClick={onConnectorClick}
          onConnectorRemove={onConnectorRemove}
          showConnectors={showConnectors}
          remoteObjectPresenceById={remoteObjectPresenceById}
        />
      </div>
    </div>
  );
}
