import { Clock } from 'lucide-react';
import type React from 'react';
import type { MutableRefObject } from 'react';
import { TimelineAvailabilityBands } from '@/component-lib/timeline/TimelineAvailabilityBands';
import { TimelineOverlayCard } from '@/component-lib/timeline/TimelineOverlayCard';
import { TimelineConnectorLayer } from '@/component-lib/timeline/TimelineConnectorLayer';
import { TimelineItemBlock } from '@/component-lib/timeline/TimelineItemBlock';
import { getPreviewAvailabilityRangesForDay } from '@/component-lib/timeline/timeline-render-utils';
import type { TimelineConnectorWithTiming } from '@/lib/connectors';
import type { RemoteObjectPresence } from '@/types/collaboration';
import type { Day, Item } from '@/types/trip';
import { MIN_BLOCK_H, TYPE_ICON } from '../constants';
import { displayShort, mToY, toTime } from '../time';
import type { CrossDayDragPreview, ExternalDragPreview, Interaction, ItemVisualPosition } from '../types';

interface MultiDayColumnBodyProps {
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
  interaction: Interaction;
  externalPreview: ExternalDragPreview | null;
  crossDayDragPreview?: CrossDayDragPreview | null;
  contentRef: MutableRefObject<HTMLDivElement | null>;
  onBackgroundPointerDown: (e: React.PointerEvent) => void;
  onPointDragOver: (e: React.DragEvent) => void;
  onPointDrop: (e: React.DragEvent) => void;
  onPointDragLeave: (e: React.DragEvent) => void;
  onItemPointerDown: (e: React.PointerEvent, item: Item) => void;
  getItemVisualPosition: (item: Item, startHour: number) => ItemVisualPosition;
  connectors?: TimelineConnectorWithTiming[];
  onConnectorClick?: (connector: TimelineConnectorWithTiming) => void;
  onConnectorRemove?: (connector: TimelineConnectorWithTiming) => void;
  showConnectors?: boolean;
  remoteObjectPresenceByItemId?: Map<string, RemoteObjectPresence[]>;
}

export function MultiDayColumnBody({
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
  contentRef,
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
}: MultiDayColumnBodyProps) {
  const previewTextColor = externalPreview?.valid ? day.colorHex : '#DC2626';
  const previewItem = externalPreview ? allItems?.find((item) => item.itemId === externalPreview.itemId) : null;
  const previewEmoji = previewItem ? (TYPE_ICON[previewItem.type] || '\u{1F4CD}') : null;
  const previewAvailabilityRanges = getPreviewAvailabilityRangesForDay(previewItem ?? null, day.date);
  const activeExternalDragItem = activeDragItemId
    ? (allItems ?? dayItems).find((item) => item.itemId === activeDragItemId) ?? null
    : null;
  const globalExternalDragAvailabilityRanges = getPreviewAvailabilityRangesForDay(
    activeExternalDragItem,
    day.date,
  );
  const interactionItem =
    interaction.type === 'moving' || interaction.type === 'resizing'
      ? (allItems ?? dayItems).find((item) => item.itemId === interaction.itemId) ?? null
      : null;
  const interactionAvailabilityRanges = getPreviewAvailabilityRangesForDay(interactionItem, day.date);

  const isCrossDayTarget = crossDayDragPreview?.targetDayId === day.dayId;
  const crossDayItem = crossDayDragPreview ? allItems?.find((item) => item.itemId === crossDayDragPreview.itemId) : null;
  const crossDayEmoji = crossDayItem ? (TYPE_ICON[crossDayItem.type] || '\u{1F4CD}') : null;
  const crossDayAvailabilityRanges = getPreviewAvailabilityRangesForDay(crossDayItem ?? null, day.date);
  const shouldShowGlobalExternalRanges =
    activeDragItemId !== null &&
    (!externalPreview || externalPreview.itemId !== activeDragItemId) &&
    globalExternalDragAvailabilityRanges.length > 0;

  return (
    <div
      ref={contentRef}
      data-timeline-body
      className="relative cursor-crosshair select-none bg-theme"
      style={{ height: gTotalH }}
      onPointerDown={onBackgroundPointerDown}
      onDragOver={onPointDragOver}
      onDrop={onPointDrop}
      onDragLeave={onPointDragLeave}
    >
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

      {nowMin >= globalStartH * 60 && nowMin <= globalEndH * 60 && (
        <div
          className="absolute z-30 bg-red-500"
          style={{
            top: mToY(nowMin, globalStartH, pxPerMin) - 0.5,
            left: 0,
            right: 0,
            height: 1.5,
            borderRadius: 1,
          }}
        />
      )}

      {externalPreview && previewAvailabilityRanges.length > 0 && (
        <TimelineAvailabilityBands
          bands={previewAvailabilityRanges}
          dayColor={day.colorHex}
          globalStartH={globalStartH}
          pxPerMin={pxPerMin}
          left={2}
          right={2}
          label
          labelSize="compact"
          backgroundAlpha="12"
          borderAlpha="45"
        />
      )}

      {shouldShowGlobalExternalRanges && (
        <TimelineAvailabilityBands
          bands={globalExternalDragAvailabilityRanges}
          dayColor={day.colorHex}
          globalStartH={globalStartH}
          pxPerMin={pxPerMin}
          left={2}
          right={2}
          backgroundAlpha="10"
          borderAlpha="35"
        />
      )}

      {!externalPreview && interactionAvailabilityRanges.length > 0 && (
        <TimelineAvailabilityBands
          bands={interactionAvailabilityRanges}
          dayColor={day.colorHex}
          globalStartH={globalStartH}
          pxPerMin={pxPerMin}
          left={2}
          right={2}
          backgroundAlpha="10"
          borderAlpha="35"
        />
      )}

      {!externalPreview && isCrossDayTarget && crossDayAvailabilityRanges.length > 0 && (
        <TimelineAvailabilityBands
          bands={crossDayAvailabilityRanges}
          dayColor={day.colorHex}
          globalStartH={globalStartH}
          pxPerMin={pxPerMin}
          left={2}
          right={2}
          backgroundAlpha="10"
          borderAlpha="35"
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
        <TimelineOverlayCard
          top={mToY(interaction.startMin, globalStartH, pxPerMin)}
          height={Math.max(MIN_BLOCK_H, (interaction.endMin - interaction.startMin) * pxPerMin)}
          left={2}
          right={2}
          className="z-40 bg-transparent"
          style={{
            backgroundColor: `${day.colorHex}30`,
            borderColor: `${day.colorHex}90`,
          }}
        >
          <div className="px-1.5 py-0.5">
            <span className="text-[9px] font-semibold" style={{ color: day.colorHex }}>
              {displayShort(toTime(interaction.startMin))} - {displayShort(toTime(interaction.endMin))}
            </span>
          </div>
        </TimelineOverlayCard>
      )}

      {externalPreview && (() => {
        const previewHeight = Math.max(MIN_BLOCK_H, (externalPreview.endMin - externalPreview.startMin) * pxPerMin);
        return (
          <TimelineOverlayCard
            top={mToY(externalPreview.startMin, globalStartH, pxPerMin)}
            height={previewHeight}
            left={2}
            right={2}
            className="z-40"
            style={{
              backgroundColor: externalPreview.valid ? `${day.colorHex}25` : 'rgba(220, 38, 38, 0.12)',
              borderColor: externalPreview.valid ? `${day.colorHex}80` : 'rgba(220, 38, 38, 0.7)',
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
                  {displayShort(toTime(externalPreview.startMin))} - {displayShort(toTime(externalPreview.endMin))}
                  {!externalPreview.valid ? ' \u00B7 Unavailable' : ''}
                </span>
              </div>
            )}
          </TimelineOverlayCard>
        );
      })()}

      {isCrossDayTarget && crossDayDragPreview && (() => {
        const crossDayHeight = Math.max(
          MIN_BLOCK_H,
          (crossDayDragPreview.endMin - crossDayDragPreview.startMin) * pxPerMin,
        );

        return (
          <TimelineOverlayCard
            top={mToY(crossDayDragPreview.startMin, globalStartH, pxPerMin)}
            height={crossDayHeight}
            left={2}
            right={2}
            className="z-50 border-theme bg-theme-elevated shadow-lg ring-2 ring-offset-1 ring-offset-theme"
            style={
              {
                borderLeftWidth: 3,
                borderLeftColor: day.colorHex,
                '--tw-ring-color': `${day.colorHex}99`,
              } as React.CSSProperties
            }
          >
            <div className="flex h-full items-start px-1.5 py-0.5">
              <div className="pointer-events-none flex min-w-0 flex-col">
                <div className="flex items-center gap-0.5">
                  {crossDayEmoji && <span className="flex-shrink-0 text-[9px] leading-none">{crossDayEmoji}</span>}
                  <span className="truncate text-[10px] font-semibold leading-tight text-theme">
                    {crossDayItem?.placeName ?? ''}
                  </span>
                </div>
                {crossDayHeight >= 32 && (
                  <span className="mt-0.5 truncate text-[8px] leading-tight text-theme-secondary">
                    {displayShort(toTime(crossDayDragPreview.startMin))} - {displayShort(toTime(crossDayDragPreview.endMin))}
                  </span>
                )}
              </div>
            </div>
          </TimelineOverlayCard>
        );
      })()}

      {dayItems.length === 0 && interaction.type === 'idle' && !isCrossDayTarget && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <Clock className="h-4 w-4 text-theme-tertiary opacity-20" />
        </div>
      )}
    </div>
  );
}
