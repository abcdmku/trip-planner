import type React from 'react';
import { Clock, Lock, Navigation } from 'lucide-react';
import type { Day, Item } from '@/types/trip';
import type { TimelineConnectorWithTiming } from '@/lib/connectors';
import { GUTTER, MIN_BLOCK_H, PX_PER_MIN, TYPE_ICON } from '../constants';
import { displayShort, mToY, toTime } from '../time';
import type { ExternalDragPreview, Interaction, ItemVisualPosition } from '../types';
import { TimelineConnectorLine, type TimelineConnectorData } from '../TimelineConnectorLine';

function formatTravelDuration(minutes: number): string {
  if (minutes <= 0) return '';
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}

interface SingleDayItemLayerProps {
  day: Day;
  items: Item[];
  allItems?: Item[];
  selectedItemId?: string | null;
  startH: number;
  interaction: Interaction;
  externalPreview: ExternalDragPreview | null;
  getItemVisualPosition: (item: Item, startHour: number) => ItemVisualPosition;
  onItemPointerDown: (e: React.PointerEvent, item: Item) => void;
  /** Timeline connectors for this day */
  connectors?: TimelineConnectorWithTiming[];
  /** Called when a connector line is clicked */
  onConnectorClick?: (connector: TimelineConnectorWithTiming) => void;
  /** Called when remove button on a connector is clicked */
  onConnectorRemove?: (connector: TimelineConnectorWithTiming) => void;
  /** Whether to show auto-connect lines */
  showConnectors?: boolean;
}

export function SingleDayItemLayer({
  day,
  items,
  allItems,
  selectedItemId,
  startH,
  interaction,
  externalPreview,
  getItemVisualPosition,
  onItemPointerDown,
  connectors = [],
  onConnectorClick,
  onConnectorRemove,
  showConnectors = true,
}: SingleDayItemLayerProps) {
  const previewTextColor = externalPreview?.valid ? day.colorHex : '#DC2626';
  const previewItem = externalPreview ? allItems?.find((i) => i.itemId === externalPreview.itemId) : null;
  const previewEmoji = previewItem ? (TYPE_ICON[previewItem.type] || '\u{1F4CD}') : null;

  // Convert TimelineConnectorWithTiming to TimelineConnectorData with Y positions
  const connectorLineData: TimelineConnectorData[] = showConnectors
    ? connectors.map((c) => ({
        id: c.id,
        fromItemId: c.fromItemId,
        toItemId: c.toItemId,
        startY: mToY(c.fromEndMin, startH, PX_PER_MIN),
        endY: mToY(c.toStartMin, startH, PX_PER_MIN),
        gapMinutes: c.gapMinutes,
        dayColor: day.colorHex,
      }))
    : [];

  return (
    <>
      {/* Connector lines between items */}
      {connectorLineData.map((connectorData) => {
        const originalConnector = connectors.find((c) => c.id === connectorData.id);
        return (
          <TimelineConnectorLine
            key={connectorData.id}
            connector={connectorData}
            left={GUTTER + 2}
            width={60}
            onClick={originalConnector && onConnectorClick ? () => onConnectorClick(originalConnector) : undefined}
            onRemove={originalConnector && onConnectorRemove ? () => onConnectorRemove(originalConnector) : undefined}
            showRemoveButton={Boolean(onConnectorRemove)}
          />
        );
      })}

      {items.map((item) => {
        const position = getItemVisualPosition(item, startH);
        const isSelected = selectedItemId === item.itemId;
        const emoji = TYPE_ICON[item.type] || '\\u{1F4CD}';
        const isTransport = item.type === 'transport';
        const travelDuration = isTransport && item.itemRouteDurationMinutes > 0
          ? formatTravelDuration(item.itemRouteDurationMinutes)
          : null;

        return (
          <div
            key={item.itemId}
            className="absolute"
            style={{
              top: position.top,
              left: GUTTER + 2,
              right: 4,
              height: position.height,
              zIndex: position.active ? 50 : isSelected ? 10 : 1,
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

              <div className={`flex h-full items-start px-2 py-1 ${item.timelineLocked ? 'cursor-default' : 'cursor-grab active:cursor-grabbing'}`}>
                <div className="pointer-events-none flex min-w-0 flex-col">
                  <div className="flex items-center gap-1">
                    <span className="flex-shrink-0 text-[10px] leading-none">{emoji}</span>
                    <span className="truncate text-[11px] font-semibold leading-tight text-theme">
                      {item.placeName}
                    </span>
                    {item.timelineLocked && (
                      <Lock className="h-2.5 w-2.5 flex-shrink-0 text-theme-tertiary" />
                    )}
                  </div>
                  {position.height >= 36 && (
                    <span className="mt-0.5 truncate text-[9px] leading-tight text-theme-secondary">
                      {displayShort(toTime(position.startMin))} - {displayShort(toTime(position.endMin))}
                    </span>
                  )}
                  {isTransport && travelDuration && position.height >= 50 && (
                    <span className="mt-0.5 flex items-center gap-0.5 text-[9px] leading-tight text-theme-tertiary">
                      <Navigation className="h-2.5 w-2.5" />
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
            top: mToY(interaction.startMin, startH, PX_PER_MIN),
            left: GUTTER + 2,
            right: 4,
            height: Math.max(MIN_BLOCK_H, (interaction.endMin - interaction.startMin) * PX_PER_MIN),
            backgroundColor: `${day.colorHex}30`,
            borderColor: `${day.colorHex}90`,
          }}
        >
          <div className="px-2 py-1">
            <span className="text-[10px] font-semibold" style={{ color: day.colorHex }}>
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
              top: mToY(externalPreview.startMin, startH, PX_PER_MIN),
              left: GUTTER + 2,
              right: 4,
              height: previewH,
              backgroundColor: externalPreview.valid ? `${day.colorHex}25` : 'rgba(220, 38, 38, 0.12)',
              borderColor: externalPreview.valid ? `${day.colorHex}80` : 'rgba(220, 38, 38, 0.7)',
            }}
          >
            <div className="flex items-center gap-1 px-2 py-1">
              {previewEmoji && <span className="flex-shrink-0 text-[10px] leading-none opacity-70">{previewEmoji}</span>}
              <span className="truncate text-[10px] font-semibold" style={{ color: previewTextColor }}>
                {previewItem?.placeName ?? ''}
              </span>
            </div>
            {previewH >= 32 && (
              <div className="px-2">
                <span className="text-[9px]" style={{ color: `${previewTextColor}99` }}>
                  {displayShort(toTime(externalPreview.startMin))} - {displayShort(toTime(externalPreview.endMin))}
                  {!externalPreview.valid ? ' \u00B7 Unavailable' : ''}
                </span>
              </div>
            )}
          </div>
        );
      })()}

      {items.length === 0 && interaction.type === 'idle' && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="flex flex-col items-center gap-1.5 opacity-30">
            <Clock className="h-6 w-6 text-theme-tertiary" />
            <p className="text-[11px] text-theme-tertiary">Click to add an item</p>
          </div>
        </div>
      )}
    </>
  );
}
