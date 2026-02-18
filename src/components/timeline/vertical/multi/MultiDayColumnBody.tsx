import type React from 'react';
import { Clock } from 'lucide-react';
import type { MutableRefObject } from 'react';
import type { Day, Item } from '@/types/trip';
import { blockColors } from '../colors';
import { MIN_BLOCK_H, PX_PER_HR, PX_PER_MIN, TYPE_ICON } from '../constants';
import { displayShort, mToY, toTime } from '../time';
import type { ExternalDragPreview, Interaction, ItemVisualPosition } from '../types';

interface MultiDayColumnBodyProps {
  day: Day;
  dayItems: Item[];
  globalStartH: number;
  globalEndH: number;
  gTotalH: number;
  gHours: number[];
  nowMin: number;
  selectedItemId: string | null;
  interaction: Interaction;
  externalPreview: ExternalDragPreview | null;
  contentRef: MutableRefObject<HTMLDivElement | null>;
  onBackgroundPointerDown: (e: React.PointerEvent) => void;
  onPointDragOver: (e: React.DragEvent) => void;
  onPointDrop: (e: React.DragEvent) => void;
  onPointDragLeave: (e: React.DragEvent) => void;
  onItemPointerDown: (e: React.PointerEvent, item: Item) => void;
  getItemVisualPosition: (item: Item, startHour: number) => ItemVisualPosition;
}

export function MultiDayColumnBody({
  day,
  dayItems,
  globalStartH,
  globalEndH,
  gTotalH,
  gHours,
  nowMin,
  selectedItemId,
  interaction,
  externalPreview,
  contentRef,
  onBackgroundPointerDown,
  onPointDragOver,
  onPointDrop,
  onPointDragLeave,
  onItemPointerDown,
  getItemVisualPosition,
}: MultiDayColumnBodyProps) {
  const colors = blockColors(day.colorHex);
  const previewTextColor = externalPreview?.valid ? day.colorHex : '#DC2626';

  return (
    <div
      ref={contentRef}
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

      {dayItems.map((item) => {
        const position = getItemVisualPosition(item, globalStartH);
        const isSelected = selectedItemId === item.itemId;
        const emoji = TYPE_ICON[item.type] || '\\u{1F4CD}';

        return (
          <div
            key={item.itemId}
            className="absolute"
            style={{
              top: position.top,
              left: 2,
              right: 2,
              height: position.height,
              zIndex: position.active ? 50 : isSelected ? 10 : 1,
            }}
            onPointerDown={(e) => onItemPointerDown(e, item)}
          >
            <div
              className={`group relative h-full overflow-hidden rounded-md transition-shadow duration-100 ${
                position.active
                  ? 'shadow-lg ring-2 ring-white/60'
                  : isSelected
                    ? 'shadow-md ring-2 ring-white/70 ring-offset-1 ring-offset-black/10'
                    : 'shadow-sm hover:shadow-md'
              }`}
              style={{ backgroundColor: day.colorHex }}
            >
              <div className="absolute inset-x-0 top-0 z-10 h-[7px] cursor-n-resize" />

              <div className="flex h-full cursor-grab items-start px-1.5 py-0.5 active:cursor-grabbing">
                <div className="pointer-events-none flex min-w-0 flex-col">
                  <div className="flex items-center gap-0.5">
                    <span className="flex-shrink-0 text-[9px] leading-none">{emoji}</span>
                    <span className="truncate text-[10px] font-semibold leading-tight" style={{ color: colors.text }}>
                      {item.placeName}
                    </span>
                    {item.timelineLocked ? (
                      <span className="text-[8px]" style={{ color: colors.sub }}>
                        {'\u{1F512}'}
                      </span>
                    ) : null}
                  </div>
                  {position.height >= 32 && (
                    <span className="mt-0.5 truncate text-[8px] leading-tight" style={{ color: colors.sub }}>
                      {displayShort(toTime(position.startMin))} - {displayShort(toTime(position.endMin))}
                    </span>
                  )}
                </div>
              </div>

              <div className="absolute inset-x-0 bottom-0 z-10 h-[7px] cursor-s-resize" />

              <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex justify-center pt-[2px] opacity-0 transition-opacity group-hover:opacity-100">
                <div className="h-[2.5px] w-5 rounded-full" style={{ backgroundColor: colors.handle }} />
              </div>
              <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 flex justify-center pb-[2px] opacity-0 transition-opacity group-hover:opacity-100">
                <div className="h-[2.5px] w-5 rounded-full" style={{ backgroundColor: colors.handle }} />
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

      {externalPreview && (
        <div
          className="absolute z-40 rounded-md border-2 border-dashed"
          style={{
            top: mToY(externalPreview.startMin, globalStartH, PX_PER_MIN),
            left: 2,
            right: 2,
            height: Math.max(MIN_BLOCK_H, (externalPreview.endMin - externalPreview.startMin) * PX_PER_MIN),
            backgroundColor: externalPreview.valid ? `${day.colorHex}30` : 'rgba(220, 38, 38, 0.15)',
            borderColor: externalPreview.valid ? `${day.colorHex}90` : 'rgba(220, 38, 38, 0.85)',
          }}
        >
          <div className="px-1.5 py-0.5">
            <span className="text-[9px] font-semibold" style={{ color: previewTextColor }}>
              {displayShort(toTime(externalPreview.startMin))} - {displayShort(toTime(externalPreview.endMin))}
              {!externalPreview.valid ? ' (Unavailable)' : ''}
            </span>
          </div>
        </div>
      )}

      {dayItems.length === 0 && interaction.type === 'idle' && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <Clock className="h-4 w-4 text-theme-tertiary opacity-20" />
        </div>
      )}
    </div>
  );
}
