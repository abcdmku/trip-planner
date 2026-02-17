import { useEffect, useMemo, useState } from 'react';
import { ITEM_TYPE_ICONS } from '../constants/colors';
import type { ItineraryItem, TripDay } from '../types/domain';
import { fromMinutes, toMinutes } from '../utils/time';

interface DragState {
  itemId: string;
  dayId: string;
  startX: number;
  initialStartMin: number;
  initialEndMin: number;
  dayStartMin: number;
  dayEndMin: number;
  rowWidth: number;
}

interface TimelineChartProps {
  days: TripDay[];
  items: ItineraryItem[];
  selectedDayIds: string[];
  selectedItemId?: string;
  onSelectItem: (itemId: string) => void;
  onItemTimeChange: (itemId: string, startTime: string, endTime: string) => void;
}

function clampRange(
  startMin: number,
  endMin: number,
  dayStartMin: number,
  dayEndMin: number
): { start: number; end: number } {
  const duration = Math.max(5, endMin - startMin);
  let nextStart = Math.max(dayStartMin, startMin);
  let nextEnd = nextStart + duration;

  if (nextEnd > dayEndMin) {
    nextEnd = dayEndMin;
    nextStart = Math.max(dayStartMin, nextEnd - duration);
  }

  return { start: nextStart, end: nextEnd };
}

export function TimelineChart({
  days,
  items,
  selectedDayIds,
  selectedItemId,
  onSelectItem,
  onItemTimeChange
}: TimelineChartProps) {
  const [dragState, setDragState] = useState<DragState | null>(null);

  const rows = useMemo(() => {
    const map = new Map<string, ItineraryItem[]>();
    for (const item of items) {
      if (!selectedDayIds.includes(item.dayId)) {
        continue;
      }

      if (!map.has(item.dayId)) {
        map.set(item.dayId, []);
      }

      map.get(item.dayId)?.push(item);
    }

    for (const [dayId, list] of map.entries()) {
      map.set(
        dayId,
        [...list].sort((a, b) => a.sortOrder - b.sortOrder || a.itemId.localeCompare(b.itemId))
      );
    }

    return map;
  }, [items, selectedDayIds]);

  useEffect(() => {
    if (!dragState) {
      return;
    }

    const onMouseMove = (event: MouseEvent): void => {
      const deltaX = event.clientX - dragState.startX;
      const minuteSpan = dragState.dayEndMin - dragState.dayStartMin;
      const deltaMin = Math.round((deltaX / dragState.rowWidth) * minuteSpan);

      const range = clampRange(
        dragState.initialStartMin + deltaMin,
        dragState.initialEndMin + deltaMin,
        dragState.dayStartMin,
        dragState.dayEndMin
      );

      onItemTimeChange(dragState.itemId, fromMinutes(range.start), fromMinutes(range.end));
    };

    const onMouseUp = (): void => {
      setDragState(null);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [dragState, onItemTimeChange]);

  return (
    <section className="rounded-xl border border-slate-700 bg-slate-900/70 p-3">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-xs uppercase tracking-[0.15em] text-slate-400">Timeline</p>
        <p className="text-[11px] text-slate-500">Drag bars to shift time ranges</p>
      </div>

      <div className="space-y-4">
        {days
          .filter((day) => selectedDayIds.includes(day.dayId))
          .map((day) => {
            const dayItems = rows.get(day.dayId) ?? [];
            const startMin = toMinutes(day.dayStart);
            const endMin = toMinutes(day.dayEnd);
            const total = Math.max(1, endMin - startMin);

            return (
              <div key={day.dayId}>
                <div className="mb-1 flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-200">{day.label}</span>
                  <span className="text-slate-500">
                    {day.dayStart} - {day.dayEnd}
                  </span>
                </div>

                <div className="relative h-24 rounded-lg border border-slate-700 bg-slate-950/80">
                  <div className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-slate-800" />
                  {dayItems.map((item) => {
                    const itemStart = toMinutes(item.startTime);
                    const itemEnd = toMinutes(item.endTime);
                    const leftPercent = ((itemStart - startMin) / total) * 100;
                    const widthPercent = (Math.max(5, itemEnd - itemStart) / total) * 100;
                    const selected = item.itemId === selectedItemId;

                    return (
                      <button
                        key={item.itemId}
                        type="button"
                        onClick={() => onSelectItem(item.itemId)}
                        onMouseDown={(event) => {
                          const container = (event.currentTarget.parentElement as HTMLDivElement | null);
                          if (!container) {
                            return;
                          }

                          const rowWidth = Math.max(1, container.getBoundingClientRect().width);

                          setDragState({
                            itemId: item.itemId,
                            dayId: day.dayId,
                            startX: event.clientX,
                            initialStartMin: itemStart,
                            initialEndMin: itemEnd,
                            dayStartMin: startMin,
                            dayEndMin: endMin,
                            rowWidth
                          });
                        }}
                        className={`absolute top-1/2 h-8 -translate-y-1/2 rounded-md px-2 text-left text-[10px] font-semibold text-slate-950 shadow ${
                          selected ? 'ring-2 ring-slate-100' : ''
                        }`}
                        style={{
                          left: `${Math.max(0, leftPercent)}%`,
                          width: `${Math.max(8, widthPercent)}%`,
                          backgroundColor: day.colorHex
                        }}
                      >
                        <span className="truncate">
                          {ITEM_TYPE_ICONS[item.type]} {item.title}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
      </div>
    </section>
  );
}
