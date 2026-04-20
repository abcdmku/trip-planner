import { Clock } from 'lucide-react';
import type React from 'react';
import { TimelineAvailabilityBands } from '@/component-lib/timeline/TimelineAvailabilityBands';
import { TimelineOverlayCard } from '@/component-lib/timeline/TimelineOverlayCard';
import { TimelineConnectorLayer } from '@/component-lib/timeline/TimelineConnectorLayer';
import { TimelineItemBlock } from '@/component-lib/timeline/TimelineItemBlock';
import { getPreviewAvailabilityRangesForDay } from '@/component-lib/timeline/timeline-render-utils';
import type { RemoteObjectPresence } from '@/types/collaboration';
import type { Day, Item } from '@/types/trip';
import type { TimelineConnectorWithTiming } from '@/lib/connectors';
import { GUTTER, MIN_BLOCK_H, TYPE_ICON } from '../constants';
import { displayShort, mToY, toTime } from '../time';
import type { ExternalDragPreview, Interaction, ItemVisualPosition } from '../types';

interface SingleDayItemLayerProps {
  day: Day;
  items: Item[];
  allItems?: Item[];
  selectedItemId?: string | null;
  activeDragItemId?: string | null;
  startH: number;
  pxPerMin: number;
  interaction: Interaction;
  externalPreview: ExternalDragPreview | null;
  getItemVisualPosition: (item: Item, startHour: number) => ItemVisualPosition;
  onItemPointerDown: (e: React.PointerEvent, item: Item) => void;
  connectors?: TimelineConnectorWithTiming[];
  onConnectorClick?: (connector: TimelineConnectorWithTiming) => void;
  onConnectorRemove?: (connector: TimelineConnectorWithTiming) => void;
  showConnectors?: boolean;
  remoteObjectPresenceByItemId?: Map<string, RemoteObjectPresence[]>;
}

export function SingleDayItemLayer({
  day,
  items,
  allItems,
  selectedItemId,
  activeDragItemId = null,
  startH,
  pxPerMin,
  interaction,
  externalPreview,
  getItemVisualPosition,
  onItemPointerDown,
  connectors = [],
  onConnectorClick,
  onConnectorRemove,
  showConnectors = true,
  remoteObjectPresenceByItemId,
}: SingleDayItemLayerProps) {
  const previewTextColor = externalPreview?.valid ? day.colorHex : '#DC2626';
  const previewItem = externalPreview ? allItems?.find((item) => item.itemId === externalPreview.itemId) : null;
  const previewEmoji = previewItem ? (TYPE_ICON[previewItem.type] || '\u{1F4CD}') : null;
  const previewAvailabilityRanges = getPreviewAvailabilityRangesForDay(previewItem ?? null, day.date);
  const activeExternalDragItem = activeDragItemId
    ? (allItems ?? items).find((item) => item.itemId === activeDragItemId) ?? null
    : null;
  const globalExternalDragAvailabilityRanges = getPreviewAvailabilityRangesForDay(
    activeExternalDragItem,
    day.date,
  );
  const interactionItem =
    interaction.type === 'moving' || interaction.type === 'resizing'
      ? (allItems ?? items).find((item) => item.itemId === interaction.itemId) ?? null
      : null;
  const interactionAvailabilityRanges = getPreviewAvailabilityRangesForDay(interactionItem, day.date);

  return (
    <>
      {showConnectors && (
        <TimelineConnectorLayer
          connectors={connectors}
          dayColor={day.colorHex}
          startHour={startH}
          pxPerMin={pxPerMin}
          left={GUTTER + 2}
          width={60}
          onConnectorClick={onConnectorClick}
          onConnectorRemove={onConnectorRemove}
          showRemoveButton={Boolean(onConnectorRemove)}
        />
      )}

      {externalPreview && previewAvailabilityRanges.length > 0 && (
        <TimelineAvailabilityBands
          bands={previewAvailabilityRanges}
          dayColor={day.colorHex}
          globalStartH={startH}
          pxPerMin={pxPerMin}
          left={GUTTER + 2}
          right={4}
          label
          labelSize="compact"
          backgroundAlpha="12"
          borderAlpha="45"
        />
      )}

      {activeDragItemId !== null &&
        (!externalPreview || externalPreview.itemId !== activeDragItemId) &&
        globalExternalDragAvailabilityRanges.length > 0 && (
          <TimelineAvailabilityBands
            bands={globalExternalDragAvailabilityRanges}
            dayColor={day.colorHex}
            globalStartH={startH}
            pxPerMin={pxPerMin}
            left={GUTTER + 2}
            right={4}
            backgroundAlpha="10"
            borderAlpha="35"
          />
        )}

      {!externalPreview && interactionAvailabilityRanges.length > 0 && (
        <TimelineAvailabilityBands
          bands={interactionAvailabilityRanges}
          dayColor={day.colorHex}
          globalStartH={startH}
          pxPerMin={pxPerMin}
          left={GUTTER + 2}
          right={4}
          backgroundAlpha="10"
          borderAlpha="35"
        />
      )}

      {items.map((item) => {
        const position = getItemVisualPosition(item, startH);
        const isSelected = selectedItemId === item.itemId;

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
          >
            <TimelineItemBlock
              item={item}
              dayColor={day.colorHex}
              startMin={position.startMin}
              endMin={position.endMin}
              height={position.height}
              density="day"
              isSelected={isSelected}
              isActive={position.active}
              presence={remoteObjectPresenceByItemId?.get(item.itemId) ?? []}
              onPointerDown={(event) => onItemPointerDown(event, item)}
            />
          </div>
        );
      })}

      {interaction.type === 'creating' && (
        <div
          className="absolute z-40 rounded-md border-2 border-dashed"
          style={{
            top: mToY(interaction.startMin, startH, pxPerMin),
            left: GUTTER + 2,
            right: 4,
            height: Math.max(MIN_BLOCK_H, (interaction.endMin - interaction.startMin) * pxPerMin),
            backgroundColor: `${day.colorHex}30`,
            borderColor: `${day.colorHex}90`,
          }}
        >
          <div className="px-2 py-1">
            <span className="text-[10px] font-semibold" style={{ color: day.colorHex }}>
              {`${displayShort(toTime(interaction.startMin))} - ${displayShort(toTime(interaction.endMin))}`}
            </span>
          </div>
        </div>
      )}

      {externalPreview && (() => {
        const previewHeight = Math.max(MIN_BLOCK_H, (externalPreview.endMin - externalPreview.startMin) * pxPerMin);
        return (
          <TimelineOverlayCard
            top={mToY(externalPreview.startMin, startH, pxPerMin)}
            height={previewHeight}
            left={GUTTER + 2}
            right={4}
            className="z-40"
            style={{
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
            {previewHeight >= 32 && (
              <div className="px-2">
                <span className="text-[9px]" style={{ color: `${previewTextColor}99` }}>
                  {`${displayShort(toTime(externalPreview.startMin))} - ${displayShort(toTime(externalPreview.endMin))}`}
                  {!externalPreview.valid ? ' \u00B7 Unavailable' : ''}
                </span>
              </div>
            )}
          </TimelineOverlayCard>
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
