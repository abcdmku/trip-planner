import type React from 'react';
import { Bike, Bus, Car, Circle, Footprints, Lock, Plane } from 'lucide-react';
import type { RemoteObjectPresence } from '@/types/collaboration';
import type { Item, TransportMode } from '@/types/trip';
import { TIMELINE_TYPE_ICON, displayShort, formatTravelDuration, toTime } from './timeline-render-utils';

const MODE_ICON_MAP: Record<TransportMode, typeof Car> = {
  driving: Car,
  walking: Footprints,
  bicycling: Bike,
  transit: Bus,
  flight: Plane,
  other: Circle,
};

function PresenceChips({ presence }: { presence: RemoteObjectPresence[] }) {
  if (presence.length === 0) return null;

  const visible = presence.slice(0, 2);
  const overflow = presence.length - visible.length;

  return (
    <div className="pointer-events-none absolute right-1.5 top-1.5 z-30 flex flex-wrap justify-end gap-1">
      {visible.map((entry) => (
        <div
          key={`${entry.connectionId}:${entry.kind}`}
          className="rounded-full px-2 py-0.5 text-[9px] font-semibold text-white shadow-md"
          style={{ backgroundColor: entry.color }}
          title={`${entry.name}: ${entry.label}`}
        >
          {entry.name.split(' ')[0]} {entry.kind === 'selection' ? 'selecting' : entry.label.toLowerCase()}
        </div>
      ))}
      {overflow > 0 && (
        <div className="rounded-full bg-theme-secondary px-2 py-0.5 text-[9px] font-semibold text-white shadow-md">
          +{overflow}
        </div>
      )}
    </div>
  );
}

export interface TimelineItemBlockProps {
  item: Item;
  dayColor: string;
  startMin: number;
  endMin: number;
  height: number;
  density?: 'day' | 'multi';
  isSelected?: boolean;
  isActive?: boolean;
  presence?: RemoteObjectPresence[];
  onPointerDown?: (event: React.PointerEvent<HTMLDivElement>) => void;
}

export function TimelineItemBlock({
  item,
  dayColor,
  startMin,
  endMin,
  height,
  density = 'day',
  isSelected = false,
  isActive = false,
  presence = [],
  onPointerDown,
}: TimelineItemBlockProps) {
  const emoji = TIMELINE_TYPE_ICON[item.type] || '\u{1F4CD}';
  const isTransport = item.type === 'transport';
  const travelDuration =
    isTransport && item.itemRouteDurationMinutes > 0 ? formatTravelDuration(item.itemRouteDurationMinutes) : null;

  const isCompact = density === 'multi';
  const titleClassName = isCompact ? 'text-[10px]' : 'text-[11px]';
  const iconClassName = isCompact ? 'text-[9px]' : 'text-[10px]';
  const timeClassName = isCompact ? 'text-[8px]' : 'text-[9px]';
  const paddingClassName = isCompact ? 'px-1.5 py-0.5' : 'px-2 py-1';
  const metaGapClassName = isCompact ? 'gap-0.5' : 'gap-1';
  const minimumTimeHeight = isCompact ? 32 : 36;
  const minimumTravelHeight = isCompact ? 44 : 50;
  const iconSizeClassName = isCompact ? 'h-2 w-2' : 'h-2.5 w-2.5';

  return (
    <div
      className={`group relative h-full overflow-hidden rounded-md border border-theme bg-theme-elevated transition-shadow duration-100 ${
        isActive
          ? 'shadow-lg ring-2 ring-offset-1 ring-offset-theme'
          : isSelected
            ? 'shadow-md ring-2 ring-offset-1 ring-offset-theme'
            : 'shadow-sm hover:shadow-md'
      }`}
      style={{
        borderLeftWidth: 3,
        borderLeftColor: dayColor,
        ...(isActive || isSelected ? ({ '--tw-ring-color': `${dayColor}99` } as React.CSSProperties) : {}),
      }}
      onPointerDown={onPointerDown}
    >
      <PresenceChips presence={presence} />

      <div className="absolute inset-x-0 top-0 z-10 h-[7px] cursor-n-resize" />

      <div className={`flex h-full items-start ${paddingClassName} ${item.timelineLocked ? 'cursor-default' : 'cursor-grab active:cursor-grabbing'}`}>
        <div className="pointer-events-none flex min-w-0 flex-col">
          <div className={`flex items-center ${metaGapClassName}`}>
            <span className={`flex-shrink-0 leading-none ${iconClassName}`}>{emoji}</span>
            <span className={`truncate font-semibold leading-tight text-theme ${titleClassName}`}>{item.placeName}</span>
            {item.timelineLocked && <Lock className={`${iconSizeClassName} flex-shrink-0 text-theme-tertiary`} />}
          </div>

          {height >= minimumTimeHeight && (
            <span className={`mt-0.5 truncate leading-tight text-theme-secondary ${timeClassName}`}>
              {displayShort(toTime(startMin))} - {displayShort(toTime(endMin))}
            </span>
          )}

          {isTransport && travelDuration && height >= minimumTravelHeight && (() => {
            const ModeIcon = MODE_ICON_MAP[item.transportMode] ?? Car;
            return (
              <span className={`mt-0.5 flex items-center ${metaGapClassName} leading-tight text-theme-tertiary ${timeClassName}`}>
                <ModeIcon className={iconSizeClassName} />
                {travelDuration}
              </span>
            );
          })()}
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
  );
}
