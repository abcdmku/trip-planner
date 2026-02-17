import { useRef, useMemo } from 'react';
import { TimelineHeader } from './TimelineHeader';
import { TimelineBar } from './TimelineBar';
import { TimelineLeg } from './TimelineLeg';
import type { Item, Leg, Day } from '../../types/trip';

interface TimelineChartProps {
  items: Item[];
  legs: Leg[];
  days: Day[];
  selectedDayIds: string[];
  selectedItemId?: string | null;
  onItemClick?: (itemId: string) => void;
  onLegClick?: (legId: string) => void;
}

const PIXELS_PER_HOUR = 120;
const ROW_HEIGHT = 48;

function parseTime(timeStr: string): number | null {
  if (!timeStr) return null;
  const parts = timeStr.split(':');
  if (parts.length < 2) return null;
  return parseInt(parts[0], 10) + parseInt(parts[1], 10) / 60;
}

export function TimelineChart({
  items,
  legs,
  days,
  selectedDayIds,
  selectedItemId,
  onItemClick,
  onLegClick,
}: TimelineChartProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const dayColorMap = useMemo(
    () => new Map(days.map((d) => [d.dayId, d.colorHex])),
    [days],
  );

  // Filter items by selected days
  const visibleItems = useMemo(() => {
    const daySet = new Set(selectedDayIds);
    return items
      .filter((i) => daySet.size === 0 || daySet.has(i.dayId))
      .sort((a, b) => a.sortOrder - b.sortOrder);
  }, [items, selectedDayIds]);

  // Determine time range
  const { startHour, endHour } = useMemo(() => {
    let min = 8;
    let max = 22;
    for (const item of visibleItems) {
      const s = parseTime(item.scheduledStart);
      const e = parseTime(item.scheduledEnd);
      if (s !== null) min = Math.min(min, Math.floor(s));
      if (e !== null) max = Math.max(max, Math.ceil(e));
    }
    return { startHour: Math.max(0, min - 1), endHour: Math.min(24, max + 1) };
  }, [visibleItems]);

  const totalWidth = (endHour - startHour) * PIXELS_PER_HOUR;
  const totalHeight = visibleItems.length * ROW_HEIGHT;

  // Current time offset
  const now = new Date();
  const currentHour = now.getHours() + now.getMinutes() / 60;
  const currentTimeOffset =
    currentHour >= startHour && currentHour <= endHour
      ? (currentHour - startHour) * PIXELS_PER_HOUR
      : undefined;

  // Build item position map
  const itemPositions = useMemo(() => {
    const map = new Map<string, { left: number; right: number; rowIndex: number }>();
    visibleItems.forEach((item, index) => {
      const s = parseTime(item.scheduledStart);
      const e = parseTime(item.scheduledEnd);
      if (s === null) return;
      const eTime = e ?? s + item.durationMinutes / 60;
      const left = (s - startHour) * PIXELS_PER_HOUR;
      const right = (eTime - startHour) * PIXELS_PER_HOUR;
      map.set(item.itemId, { left, right, rowIndex: index });
    });
    return map;
  }, [visibleItems, startHour]);

  if (visibleItems.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-theme-tertiary">
        No scheduled items to display
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* Row labels */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left labels */}
        <div className="w-36 flex-shrink-0 border-r border-theme bg-theme-elevated">
          <div style={{ height: 32 }} className="border-b border-theme" />
          {visibleItems.map((item) => (
            <div
              key={item.itemId}
              className="flex items-center gap-2 border-b border-theme-subtle px-2"
              style={{ height: ROW_HEIGHT }}
            >
              <span
                className="h-2 w-2 flex-shrink-0 rounded-full"
                style={{ backgroundColor: dayColorMap.get(item.dayId) ?? '#3B82F6' }}
              />
              <span className="truncate text-xs font-medium text-theme-secondary">
                {item.placeName}
              </span>
            </div>
          ))}
        </div>

        {/* Scrollable chart area */}
        <div ref={scrollRef} className="flex-1 overflow-auto bg-theme">
          <div style={{ width: totalWidth, minHeight: '100%' }}>
            <TimelineHeader
              startHour={startHour}
              endHour={endHour}
              pixelsPerHour={PIXELS_PER_HOUR}
              currentTimeOffset={currentTimeOffset}
            />

            <div className="relative" style={{ height: totalHeight }}>
              {/* Grid lines */}
              {Array.from({ length: endHour - startHour + 1 }, (_, i) => (
                <div
                  key={i}
                  className="absolute top-0 h-full w-px bg-theme-subtle/50"
                  style={{ left: i * PIXELS_PER_HOUR }}
                />
              ))}

              {/* Row lines */}
              {visibleItems.map((_, i) => (
                <div
                  key={i}
                  className="absolute w-full border-b border-theme-subtle/50"
                  style={{ top: (i + 1) * ROW_HEIGHT }}
                />
              ))}

              {/* Current time line */}
              {currentTimeOffset !== undefined && (
                <div
                  className="absolute top-0 h-full w-0.5 bg-red-500/40"
                  style={{ left: currentTimeOffset }}
                />
              )}

              {/* Leg connectors */}
              {legs.map((leg) => {
                const fromPos = itemPositions.get(leg.fromItemId);
                const toPos = itemPositions.get(leg.toItemId);
                if (!fromPos || !toPos) return null;
                return (
                  <TimelineLeg
                    key={leg.legId}
                    leg={leg}
                    fromRight={fromPos.right}
                    toLeft={toPos.left}
                    rowIndex={Math.min(fromPos.rowIndex, toPos.rowIndex)}
                    rowHeight={ROW_HEIGHT}
                    onClick={onLegClick ? () => onLegClick(leg.legId) : undefined}
                  />
                );
              })}

              {/* Item bars */}
              {visibleItems.map((item) => {
                const pos = itemPositions.get(item.itemId);
                if (!pos) return null;
                return (
                  <TimelineBar
                    key={item.itemId}
                    item={item}
                    left={pos.left}
                    width={pos.right - pos.left}
                    color={dayColorMap.get(item.dayId) ?? '#3B82F6'}
                    rowIndex={pos.rowIndex}
                    rowHeight={ROW_HEIGHT}
                    isSelected={selectedItemId === item.itemId}
                    onClick={onItemClick ? () => onItemClick(item.itemId) : undefined}
                  />
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
