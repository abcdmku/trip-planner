import type React from 'react';
import { Clock, Lock, Navigation } from 'lucide-react';
import type { MutableRefObject } from 'react';
import type { Day, Item } from '@/types/trip';
import type { TimelineConnectorWithTiming } from '@/lib/connectors';
import { MIN_BLOCK_H, PX_PER_HR, PX_PER_MIN, TYPE_ICON } from '../constants';
import { displayShort, mToY, toTime } from '../time';
import type { CrossDayDragPreview, ExternalDragPreview, Interaction, ItemVisualPosition } from '../types';
import { TimelineConnectorLine, type TimelineConnectorData } from '../TimelineConnectorLine';

function formatTravelDuration(minutes: number): string {
  if (minutes <= 0) return '';
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}

interface MultiDayColumnBodyProps {
  day: Day;
  dayItems: Item[];
  allItems?: Item[];
  globalStartH: number;
  globalEndH: number;
  gTotalH: number;
  gHours: number[];
  nowMin: number;
  selectedItemId: string | null;
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
  /** Timeline connectors for this day */
  connectors?: TimelineConnectorWithTiming[];
  /** Called when a connector line is clicked */
  onConnectorClick?: (connector: TimelineConnectorWithTiming) => void;
  /** Called when remove button on a connector is clicked */
  onConnectorRemove?: (connector: TimelineConnectorWithTiming) => void;
  /** Whether to show auto-connect lines */
  showConnectors?: boolean;
}

export function MultiDayColumnBody({
  day,
  dayItems,
  allItems,
  globalStartH,
  globalEndH,
  gTotalH,
  gHours,
  nowMin,
  selectedItemId,
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
}: MultiDayColumnBodyProps) {
  const previewTextColor = externalPreview?.valid ? day.colorHex : '#DC2626';
  const previewItem = externalPreview ? allItems?.find((i) => i.itemId === externalPreview.itemId) : null;
  const previewEmoji = previewItem ? (TYPE_ICON[previewItem.type] || '\u{1F4CD}') : null;

  const isCrossDayTarget = crossDayDragPreview?.targetDayId === day.dayId;
  const crossDayItem = crossDayDragPreview ? allItems?.find((i) => i.itemId === crossDayDragPreview.itemId) : null;
  const crossDayEmoji = crossDayItem ? (TYPE_ICON[crossDayItem.type] || '\u{1F4CD}') : null;

  // Convert TimelineConnectorWithTiming to TimelineConnectorData with Y positions
  const connectorLineData: TimelineConnectorData[] = showConnectors
    ? connectors.map((c) => ({
        id: c.id,
        fromItemId: c.fromItemId,
        toItemId: c.toItemId,
        startY: mToY(c.fromEndMin, globalStartH, PX_PER_MIN),
        endY: mToY(c.toStartMin, globalStartH, PX_PER_MIN),
        gapMinutes: c.gapMinutes,
        dayColor: day.colorHex,
      }))
    : [];

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
            top: (hour - globalStartH) * PX_PER_HR,
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
              top: (hour - globalStartH) * PX_PER_HR + (quarter * PX_PER_HR) / 4,
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
            top: mToY(nowMin, globalStartH, PX_PER_MIN) - 0.5,
            left: 0,
            right: 0,
            height: 1.5,
            borderRadius: 1,
          }}
        />
      )}

      {/* Connector lines between items */}
      {connectorLineData.map((connectorData) => {
        const originalConnector = connectors.find((c) => c.id === connectorData.id);
        return (
          <TimelineConnectorLine
            key={connectorData.id}
            connector={connectorData}
            left={2}
            width={40}
            onClick={originalConnector && onConnectorClick ? () => onConnectorClick(originalConnector) : undefined}
            onRemove={originalConnector && onConnectorRemove ? () => onConnectorRemove(originalConnector) : undefined}
            showRemoveButton={Boolean(onConnectorRemove)}
          />
        );
      })}

      {dayItems.map((item) => {
        const position = getItemVisualPosition(item, globalStartH);
        const isSelected = selectedItemId === item.itemId;
        const isCrossDayDragging = crossDayDragPreview?.itemId === item.itemId;
        const emoji = TYPE_ICON[item.type] || '\\u{1F4CD}';
        const isTransport = item.type === 'transport';
        const travelDuration = isTransport && item.itemRouteDurationMinutes > 0
          ? formatTravelDuration(item.itemRouteDurationMinutes)
          : null;

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
            onPointerDown={(e) => onItemPointerDown(e, item)}
          >
            <div
              className={`group relative h-full overflow-hidden rounded-md border border-theme bg-theme-elevated transition-shadow duration-100 ${
                position.active
                  ? 'shadow-lg ring-2 ring-offset-1 ring-offset-theme'
                  : isSelected
                    ? 'shadow-md ring-2 ring-offset-1 ring-offset-theme'
                    : 'shadow-sm hover:shadow-md'
              }`}
              style={{
                borderLeftWidth: 3,
                borderLeftColor: day.colorHex,
                ...(position.active || isSelected ? { '--tw-ring-color': `${day.colorHex}99` } as React.CSSProperties : {}),
              }}
            >
              <div className="absolute inset-x-0 top-0 z-10 h-[7px] cursor-n-resize" />

              <div className={`flex h-full items-start px-1.5 py-0.5 ${item.timelineLocked ? 'cursor-default' : 'cursor-grab active:cursor-grabbing'}`}>
                <div className="pointer-events-none flex min-w-0 flex-col">
                  <div className="flex items-center gap-0.5">
                    <span className="flex-shrink-0 text-[9px] leading-none">{emoji}</span>
                    <span className="truncate text-[10px] font-semibold leading-tight text-theme">
                      {item.placeName}
                    </span>
                    {item.timelineLocked && (
                      <Lock className="h-2 w-2 flex-shrink-0 text-theme-tertiary" />
                    )}
                  </div>
                  {position.height >= 32 && (
                    <span className="mt-0.5 truncate text-[8px] leading-tight text-theme-secondary">
                      {displayShort(toTime(position.startMin))} - {displayShort(toTime(position.endMin))}
                    </span>
                  )}
                  {isTransport && travelDuration && position.height >= 44 && (
                    <span className="mt-0.5 flex items-center gap-0.5 text-[8px] leading-tight text-theme-tertiary">
                      <Navigation className="h-2 w-2" />
                      {travelDuration}
                    </span>
                  )}
                </div>
              </div>

              <div className="absolute inset-x-0 bottom-0 z-10 h-[7px] cursor-s-resize" />

              <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex justify-center pt-[2px] opacity-0 transition-opacity group-hover:opacity-100">
                <div className="h-[2.5px] w-5 rounded-full bg-theme-tertiary/30" />
              </div>
              <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 flex justify-center pb-[2px] opacity-0 transition-opacity group-hover:opacity-100">
                <div className="h-[2.5px] w-5 rounded-full bg-theme-tertiary/30" />
              </div>
            </div>
          </div>
        );
      })}

      {interaction.type === 'creating' && (
        <div
          className="absolute z-40 rounded-md border-2 border-dashed"
          style={{
            top: mToY(interaction.startMin, globalStartH, PX_PER_MIN),
            left: 2,
            right: 2,
            height: Math.max(MIN_BLOCK_H, (interaction.endMin - interaction.startMin) * PX_PER_MIN),
            backgroundColor: `${day.colorHex}30`,
            borderColor: `${day.colorHex}90`,
          }}
        >
          <div className="px-1.5 py-0.5">
            <span className="text-[9px] font-semibold" style={{ color: day.colorHex }}>
              {displayShort(toTime(interaction.startMin))} - {displayShort(toTime(interaction.endMin))}
            </span>
          </div>
        </div>
      )}

      {externalPreview && (() => {
        const previewH = Math.max(MIN_BLOCK_H, (externalPreview.endMin - externalPreview.startMin) * PX_PER_MIN);
        return (
          <div
            className="absolute z-40 rounded-md border-2 border-dashed transition-[top] duration-75"
            style={{
              top: mToY(externalPreview.startMin, globalStartH, PX_PER_MIN),
              left: 2,
              right: 2,
              height: previewH,
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
            {previewH >= 28 && (
              <div className="px-1.5">
                <span className="text-[8px]" style={{ color: `${previewTextColor}99` }}>
                  {displayShort(toTime(externalPreview.startMin))} - {displayShort(toTime(externalPreview.endMin))}
                </span>
              </div>
            )}
          </div>
        );
      })()}

      {isCrossDayTarget && crossDayDragPreview && (() => {
        const cdH = Math.max(MIN_BLOCK_H, (crossDayDragPreview.endMin - crossDayDragPreview.startMin) * PX_PER_MIN);
        return (
          <div
            className="absolute z-50 rounded-md border border-theme bg-theme-elevated shadow-lg ring-2 ring-offset-1 ring-offset-theme"
            style={{
              top: mToY(crossDayDragPreview.startMin, globalStartH, PX_PER_MIN),
              left: 2,
              right: 2,
              height: cdH,
              borderLeftWidth: 3,
              borderLeftColor: day.colorHex,
              '--tw-ring-color': `${day.colorHex}99`,
            } as React.CSSProperties}
          >
            <div className="flex h-full items-start px-1.5 py-0.5">
              <div className="pointer-events-none flex min-w-0 flex-col">
                <div className="flex items-center gap-0.5">
                  {crossDayEmoji && <span className="flex-shrink-0 text-[9px] leading-none">{crossDayEmoji}</span>}
                  <span className="truncate text-[10px] font-semibold leading-tight text-theme">
                    {crossDayItem?.placeName ?? ''}
                  </span>
                </div>
                {cdH >= 32 && (
                  <span className="mt-0.5 truncate text-[8px] leading-tight text-theme-secondary">
                    {displayShort(toTime(crossDayDragPreview.startMin))} - {displayShort(toTime(crossDayDragPreview.endMin))}
                  </span>
                )}
              </div>
            </div>
          </div>
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
