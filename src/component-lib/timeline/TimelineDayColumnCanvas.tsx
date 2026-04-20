import { forwardRef, type DragEvent, type PointerEvent } from 'react';
import { Clock } from 'lucide-react';
import { TimelineConnectorLayer } from '@/component-lib/timeline/TimelineConnectorLayer';
import { TimelineItemBlock } from '@/component-lib/timeline/TimelineItemBlock';
import { getPreviewAvailabilityRangesForDay } from '@/component-lib/timeline/timeline-render-utils';
import type { TimelineConnectorWithTiming } from '@/lib/connectors';
import { buildTimeRangeLabel, getDayTimezoneLabel } from '@/lib/day-time-display';
import type { RemoteObjectPresence } from '@/types/collaboration';
import type { Day, Item } from '@/types/trip';

export type TimelineCanvasInteraction =
  | { type: 'idle' }
  | { type: 'creating'; startMin: number; endMin: number }
  | { type: 'moving'; itemId: string; deltaMin: number }
  | { type: 'resizing'; itemId: string; startMin: number; endMin: number };

export interface TimelineCanvasExternalPreview {
  itemId: string;
  dayId: string;
  valid: boolean;
  startMin: number;
  endMin: number;
}

export interface TimelineCanvasCrossDayPreview {
  itemId: string;
  targetDayId: string;
  startMin: number;
  endMin: number;
}

export interface TimelineCanvasItemVisualPosition {
  top: number;
  height: number;
  startMin: number;
  endMin: number;
  active: boolean;
}

export interface TimelineDayColumnCanvasProps {
  day: Day;
  dayItems: Item[];
  allItems?: Item[];
  pxPerMin: number;
  pxPerHr: number;
  globalStartH: number;
  globalEndH: number;
  gTotalH: number;
  gHours: number[];
  nowMin: number;
  selectedItemId: string | null;
  activeDragItemId?: string | null;
  interaction: TimelineCanvasInteraction;
  externalPreview: TimelineCanvasExternalPreview | null;
  crossDayDragPreview?: TimelineCanvasCrossDayPreview | null;
  onBackgroundPointerDown: (event: PointerEvent<HTMLDivElement>) => void;
  onPointDragOver: (event: DragEvent<HTMLDivElement>) => void;
  onPointDrop: (event: DragEvent<HTMLDivElement>) => void;
  onPointDragLeave: (event: DragEvent<HTMLDivElement>) => void;
  onItemPointerDown: (event: PointerEvent<HTMLDivElement>, item: Item) => void;
  getItemVisualPosition: (item: Item, startHour: number) => TimelineCanvasItemVisualPosition;
  connectors?: TimelineConnectorWithTiming[];
  onConnectorClick?: (connector: TimelineConnectorWithTiming) => void;
  onConnectorRemove?: (connector: TimelineConnectorWithTiming) => void;
  showConnectors?: boolean;
  remoteObjectPresenceByItemId?: Map<string, RemoteObjectPresence[]>;
}

const MIN_BLOCK_H = 22;
const DEFAULT_TYPE_ICON = '\u{1F4CD}';

export const TimelineDayColumnCanvas = forwardRef<HTMLDivElement, TimelineDayColumnCanvasProps>(
  function TimelineDayColumnCanvas(
    {
      day,
      dayItems,
      allItems,
      pxPerMin,
      pxPerHr,
      globalStartH,
      globalEndH,
      gTotalH,
      gHours,
      nowMin,
      selectedItemId,
      activeDragItemId = null,
      interaction,
      externalPreview,
      crossDayDragPreview,
      onBackgroundPointerDown,
      onPointDragOver,
      onPointDrop,
      onPointDragLeave,
      onItemPointerDown,
      getItemVisualPosition,
      connectors = [],
      onConnectorClick,
      onConnectorRemove,
      showConnectors = true,
      remoteObjectPresenceByItemId,
    },
    ref,
  ) {
    const timezoneLabel = getDayTimezoneLabel(day);
    const previewItem = externalPreview
      ? allItems?.find((item) => item.itemId === externalPreview.itemId) ?? null
      : null;
    const activeExternalDragItem = activeDragItemId
      ? (allItems ?? dayItems).find((item) => item.itemId === activeDragItemId) ?? null
      : null;
    const interactionItem =
      interaction.type === 'moving' || interaction.type === 'resizing'
        ? (allItems ?? dayItems).find((item) => item.itemId === interaction.itemId) ?? null
        : null;
    const isCrossDayTarget = crossDayDragPreview?.targetDayId === day.dayId;
    const crossDayItem = crossDayDragPreview
      ? allItems?.find((item) => item.itemId === crossDayDragPreview.itemId) ?? null
      : null;

    const previewAvailabilityRanges = getPreviewAvailabilityRangesForDay(previewItem, day.date);
    const globalExternalDragAvailabilityRanges = getPreviewAvailabilityRangesForDay(
      activeExternalDragItem,
      day.date,
    );
    const interactionAvailabilityRanges = getPreviewAvailabilityRangesForDay(interactionItem, day.date);
    const crossDayAvailabilityRanges = getPreviewAvailabilityRangesForDay(crossDayItem, day.date);
    const shouldShowGlobalExternalRanges =
      activeDragItemId !== null &&
      (!externalPreview || externalPreview.itemId !== activeDragItemId) &&
      globalExternalDragAvailabilityRanges.length > 0;

    return (
      <div
        ref={ref}
        data-timeline-body
        className="relative cursor-crosshair select-none bg-theme"
        style={{ height: gTotalH }}
        onPointerDown={onBackgroundPointerDown}
        onDragOver={onPointDragOver}
        onDrop={onPointDrop}
        onDragLeave={onPointDragLeave}
      >
        <TimelineGridLines gHours={gHours} globalStartH={globalStartH} pxPerHr={pxPerHr} />

        {nowMin >= globalStartH * 60 && nowMin <= globalEndH * 60 && (
          <div
            className="absolute z-30 bg-red-500"
            style={{
              top: minuteToY(nowMin, globalStartH, pxPerMin) - 0.5,
              left: 0,
              right: 0,
              height: 1.5,
              borderRadius: 1,
            }}
          />
        )}

        {externalPreview && previewAvailabilityRanges.length > 0 && (
          <AvailabilityRanges
            ranges={previewAvailabilityRanges}
            dayColor={day.colorHex}
            globalStartH={globalStartH}
            pxPerMin={pxPerMin}
            timezoneLabel={timezoneLabel}
            labelled
          />
        )}

        {shouldShowGlobalExternalRanges && (
          <AvailabilityRanges
            ranges={globalExternalDragAvailabilityRanges}
            dayColor={day.colorHex}
            globalStartH={globalStartH}
            pxPerMin={pxPerMin}
            timezoneLabel={timezoneLabel}
          />
        )}

        {!externalPreview && interactionAvailabilityRanges.length > 0 && (
          <AvailabilityRanges
            ranges={interactionAvailabilityRanges}
            dayColor={day.colorHex}
            globalStartH={globalStartH}
            pxPerMin={pxPerMin}
            timezoneLabel={timezoneLabel}
          />
        )}

        {!externalPreview && isCrossDayTarget && crossDayAvailabilityRanges.length > 0 && (
          <AvailabilityRanges
            ranges={crossDayAvailabilityRanges}
            dayColor={day.colorHex}
            globalStartH={globalStartH}
            pxPerMin={pxPerMin}
            timezoneLabel={timezoneLabel}
          />
        )}

        {showConnectors && (
          <TimelineConnectorLayer
            connectors={connectors}
            dayColor={day.colorHex}
            startHour={globalStartH}
            pxPerMin={pxPerMin}
            left={2}
            width={40}
            onConnectorClick={onConnectorClick}
            onConnectorRemove={onConnectorRemove}
            showRemoveButton={Boolean(onConnectorRemove)}
          />
        )}

        {dayItems.map((item) => {
          const position = getItemVisualPosition(item, globalStartH);
          const isSelected = selectedItemId === item.itemId;
          const isCrossDayDragging = crossDayDragPreview?.itemId === item.itemId;

          return (
            <div
              key={item.itemId}
              className="absolute transition-opacity duration-100"
              style={{
                top: position.top,
                left: 2,
                right: 2,
                height: position.height,
                zIndex: position.active ? 50 : isSelected ? 10 : 1,
                opacity: isCrossDayDragging ? 0.15 : 1,
              }}
            >
              <TimelineItemBlock
                item={item}
                dayColor={day.colorHex}
                startMin={position.startMin}
                endMin={position.endMin}
                height={position.height}
                timezoneLabel={timezoneLabel}
                density="multi"
                isSelected={isSelected}
                isActive={position.active}
                presence={remoteObjectPresenceByItemId?.get(item.itemId) ?? []}
                onPointerDown={(event) => onItemPointerDown(event, item)}
              />
            </div>
          );
        })}

        {interaction.type === 'creating' && (
          <CreatingPreview
            startMin={interaction.startMin}
            endMin={interaction.endMin}
            globalStartH={globalStartH}
            pxPerMin={pxPerMin}
            dayColor={day.colorHex}
            timezoneLabel={timezoneLabel}
          />
        )}

        {externalPreview && (
          <ExternalPreviewBlock
            preview={externalPreview}
            previewItem={previewItem}
            dayColor={day.colorHex}
            globalStartH={globalStartH}
            pxPerMin={pxPerMin}
            timezoneLabel={timezoneLabel}
          />
        )}

        {isCrossDayTarget && crossDayDragPreview && (
          <CrossDayPreviewBlock
            preview={crossDayDragPreview}
            previewItem={crossDayItem}
            dayColor={day.colorHex}
            globalStartH={globalStartH}
            pxPerMin={pxPerMin}
            timezoneLabel={timezoneLabel}
          />
        )}

        {dayItems.length === 0 && interaction.type === 'idle' && !isCrossDayTarget && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <Clock className="h-4 w-4 text-theme-tertiary opacity-20" />
          </div>
        )}
      </div>
    );
  },
);

function TimelineGridLines({
  gHours,
  globalStartH,
  pxPerHr,
}: {
  gHours: number[];
  globalStartH: number;
  pxPerHr: number;
}) {
  return (
    <>
      {gHours.map((hour) => (
        <div
          key={hour}
          className="absolute h-px"
          style={{
            top: (hour - globalStartH) * pxPerHr,
            left: 0,
            right: 0,
            backgroundColor: 'rgb(var(--color-border) / 0.06)',
          }}
        />
      ))}

      {gHours.slice(0, -1).flatMap((hour) =>
        [1, 2, 3].map((quarter) => (
          <div
            key={`q-${hour}-${quarter}`}
            className="absolute h-px"
            style={{
              top: (hour - globalStartH) * pxPerHr + (quarter * pxPerHr) / 4,
              left: 0,
              right: 0,
              backgroundColor:
                quarter === 2
                  ? 'rgb(var(--color-border) / 0.04)'
                  : 'rgb(var(--color-border) / 0.025)',
            }}
          />
        )),
      )}
    </>
  );
}

function AvailabilityRanges({
  ranges,
  dayColor,
  globalStartH,
  pxPerMin,
  timezoneLabel,
  labelled = false,
}: {
  ranges: { startMin: number; endMin: number }[];
  dayColor: string;
  globalStartH: number;
  pxPerMin: number;
  timezoneLabel?: string | null;
  labelled?: boolean;
}) {
  return (
    <>
      {ranges.map((range, index) => {
        const top = minuteToY(range.startMin, globalStartH, pxPerMin);
        const height = Math.max(2, (range.endMin - range.startMin) * pxPerMin);

        return (
          <div
            key={`${range.startMin}-${range.endMin}-${index}`}
            className="pointer-events-none absolute overflow-hidden rounded-sm border border-dashed"
            style={{
              top,
              left: 2,
              right: 2,
              height,
              backgroundColor: `${dayColor}${labelled ? '12' : '10'}`,
              borderColor: `${dayColor}${labelled ? '45' : '35'}`,
            }}
          >
            {labelled && height >= 18 && (
              <div className="px-1 pt-0.5">
                <span
                  className="rounded bg-theme/80 px-1 py-[1px] text-[7px] font-medium"
                  style={{ color: `${dayColor}CC` }}
                >
                  {buildTimeRangeLabel({
                    start: toTime(range.startMin),
                    end: toTime(range.endMin),
                    timezoneLabel,
                  }) ?? `${displayShort(range.startMin)} - ${displayShort(range.endMin)}`}
                </span>
              </div>
            )}
          </div>
        );
      })}
    </>
  );
}

function CreatingPreview({
  startMin,
  endMin,
  globalStartH,
  pxPerMin,
  dayColor,
  timezoneLabel,
}: {
  startMin: number;
  endMin: number;
  globalStartH: number;
  pxPerMin: number;
  dayColor: string;
  timezoneLabel?: string | null;
}) {
  return (
    <div
      className="absolute z-40 rounded-md border-2 border-dashed"
      style={{
        top: minuteToY(startMin, globalStartH, pxPerMin),
        left: 2,
        right: 2,
        height: Math.max(MIN_BLOCK_H, (endMin - startMin) * pxPerMin),
        backgroundColor: `${dayColor}30`,
        borderColor: `${dayColor}90`,
      }}
    >
      <div className="px-1.5 py-0.5">
        <span className="text-[9px] font-semibold" style={{ color: dayColor }}>
          {buildTimeRangeLabel({
            start: toTime(startMin),
            end: toTime(endMin),
            timezoneLabel,
          }) ?? `${displayShort(startMin)} - ${displayShort(endMin)}`}
        </span>
      </div>
    </div>
  );
}

function ExternalPreviewBlock({
  preview,
  previewItem,
  dayColor,
  globalStartH,
  pxPerMin,
  timezoneLabel,
}: {
  preview: TimelineCanvasExternalPreview;
  previewItem: Item | null;
  dayColor: string;
  globalStartH: number;
  pxPerMin: number;
  timezoneLabel?: string | null;
}) {
  const previewHeight = Math.max(MIN_BLOCK_H, (preview.endMin - preview.startMin) * pxPerMin);
  const previewTextColor = preview.valid ? dayColor : '#DC2626';
  const previewEmoji = getItemEmoji(previewItem);

  return (
    <div
      className="absolute z-40 rounded-md border-2 border-dashed transition-[top] duration-75"
      style={{
        top: minuteToY(preview.startMin, globalStartH, pxPerMin),
        left: 2,
        right: 2,
        height: previewHeight,
        backgroundColor: preview.valid ? `${dayColor}25` : 'rgba(220, 38, 38, 0.12)',
        borderColor: preview.valid ? `${dayColor}80` : 'rgba(220, 38, 38, 0.7)',
      }}
    >
      <div className="flex items-center gap-0.5 px-1.5 py-0.5">
        {previewEmoji && <span className="flex-shrink-0 text-[9px] leading-none opacity-70">{previewEmoji}</span>}
        <span className="truncate text-[9px] font-semibold" style={{ color: previewTextColor }}>
          {previewItem?.placeName ?? ''}
        </span>
      </div>
      {previewHeight >= 28 && (
        <div className="px-1.5">
          <span className="text-[8px]" style={{ color: `${previewTextColor}99` }}>
            {buildTimeRangeLabel({
              start: toTime(preview.startMin),
              end: toTime(preview.endMin),
              timezoneLabel,
            }) ?? `${displayShort(preview.startMin)} - ${displayShort(preview.endMin)}`}
            {!preview.valid ? ' · Unavailable' : ''}
          </span>
        </div>
      )}
    </div>
  );
}

function CrossDayPreviewBlock({
  preview,
  previewItem,
  dayColor,
  globalStartH,
  pxPerMin,
  timezoneLabel,
}: {
  preview: TimelineCanvasCrossDayPreview;
  previewItem: Item | null;
  dayColor: string;
  globalStartH: number;
  pxPerMin: number;
  timezoneLabel?: string | null;
}) {
  const previewHeight = Math.max(MIN_BLOCK_H, (preview.endMin - preview.startMin) * pxPerMin);
  const previewEmoji = getItemEmoji(previewItem);

  return (
    <div
      className="absolute z-50 rounded-md border border-theme bg-theme-elevated shadow-lg ring-2 ring-offset-1 ring-offset-theme"
      style={{
        top: minuteToY(preview.startMin, globalStartH, pxPerMin),
        left: 2,
        right: 2,
        height: previewHeight,
        borderLeftWidth: 3,
        borderLeftColor: dayColor,
        '--tw-ring-color': `${dayColor}99`,
      } as React.CSSProperties}
    >
      <div className="flex h-full items-start px-1.5 py-0.5">
        <div className="pointer-events-none flex min-w-0 flex-col">
          <div className="flex items-center gap-0.5">
            {previewEmoji && <span className="flex-shrink-0 text-[9px] leading-none">{previewEmoji}</span>}
            <span className="truncate text-[10px] font-semibold leading-tight text-theme">
              {previewItem?.placeName ?? ''}
            </span>
          </div>
          {previewHeight >= 32 && (
            <span className="mt-0.5 truncate text-[8px] leading-tight text-theme-secondary">
              {buildTimeRangeLabel({
                start: toTime(preview.startMin),
                end: toTime(preview.endMin),
                timezoneLabel,
              }) ?? `${displayShort(preview.startMin)} - ${displayShort(preview.endMin)}`}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function getItemEmoji(item: Item | null | undefined): string | null {
  if (!item) return null;

  switch (item.type) {
    case 'attraction':
      return '\u{1F3DB}\uFE0F';
    case 'restaurant':
      return '\u{1F37D}\uFE0F';
    case 'hotel':
      return '\u{1F3E8}';
    case 'transport':
      return '\u{1F68C}';
    case 'activity':
      return '\u{1F3AF}';
    case 'other':
    default:
      return DEFAULT_TYPE_ICON;
  }
}

function minuteToY(minutes: number, startHour: number, pxPerMin: number): number {
  return (minutes - startHour * 60) * pxPerMin;
}

function displayShort(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  const suffix = hours >= 12 ? 'p' : 'a';
  const hour12 = hours % 12 || 12;
  return mins ? `${hour12}:${String(mins).padStart(2, '0')}${suffix}` : `${hour12}${suffix}`;
}

function toTime(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
}
