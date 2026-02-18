import type React from 'react';
import { Clock } from 'lucide-react';
import type { Day, Item } from '@/types/trip';
import { blockColors } from '../colors';
import { GUTTER, MIN_BLOCK_H, PX_PER_MIN, TYPE_ICON } from '../constants';
import { displayShort, mToY, toTime } from '../time';
import type { ExternalDragPreview, Interaction, ItemVisualPosition } from '../types';

interface SingleDayItemLayerProps {
  day: Day;
  items: Item[];
  selectedItemId?: string | null;
  startH: number;
  interaction: Interaction;
  externalPreview: ExternalDragPreview | null;
  getItemVisualPosition: (item: Item, startHour: number) => ItemVisualPosition;
  onItemPointerDown: (e: React.PointerEvent, item: Item) => void;
}

export function SingleDayItemLayer({
  day,
  items,
  selectedItemId,
  startH,
  interaction,
  externalPreview,
  getItemVisualPosition,
  onItemPointerDown,
}: SingleDayItemLayerProps) {
  const previewTextColor = externalPreview?.valid ? day.colorHex : '#DC2626';

  return (
    <>
      {items.map((item) => {
        const position = getItemVisualPosition(item, startH);
        const isSelected = selectedItemId === item.itemId;
        const colors = blockColors(day.colorHex);
        const emoji = TYPE_ICON[item.type] || '\\u{1F4CD}';

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

              <div className="flex h-full cursor-grab items-start px-2 py-1 active:cursor-grabbing">
                <div className="pointer-events-none flex min-w-0 flex-col">
                  <div className="flex items-center gap-1">
                    <span className="flex-shrink-0 text-[10px] leading-none">{emoji}</span>
                    <span
                      className="truncate text-[11px] font-semibold leading-tight"
                      style={{ color: colors.text }}
                    >
                      {item.placeName}
                    </span>
                    {item.timelineLocked ? (
                      <span className="text-[9px]" style={{ color: colors.sub }}>
                        {'\u{1F512}'}
                      </span>
                    ) : null}
                  </div>
                  {position.height >= 36 && (
                    <span
                      className="mt-0.5 truncate text-[9px] leading-tight"
                      style={{ color: colors.sub }}
                    >
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

      {externalPreview && (
        <div
          className="absolute z-40 rounded-md border-2 border-dashed"
          style={{
            top: mToY(externalPreview.startMin, startH, PX_PER_MIN),
            left: GUTTER + 2,
            right: 4,
            height: Math.max(MIN_BLOCK_H, (externalPreview.endMin - externalPreview.startMin) * PX_PER_MIN),
            backgroundColor: externalPreview.valid ? `${day.colorHex}30` : 'rgba(220, 38, 38, 0.15)',
            borderColor: externalPreview.valid ? `${day.colorHex}90` : 'rgba(220, 38, 38, 0.85)',
          }}
        >
          <div className="px-2 py-1">
            <span className="text-[10px] font-semibold" style={{ color: previewTextColor }}>
              {displayShort(toTime(externalPreview.startMin))} - {displayShort(toTime(externalPreview.endMin))}
              {!externalPreview.valid ? ' (Unavailable)' : ''}
            </span>
          </div>
        </div>
      )}

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
