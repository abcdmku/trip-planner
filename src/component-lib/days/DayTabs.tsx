import { useCallback, useRef, type DragEvent } from 'react';
import { Plus } from 'lucide-react';
import { useHotkey } from '@tanstack/react-hotkeys';
import { TimezoneBadge } from '@/component-lib/timezone/TimezoneBadge';
import type { Day } from '@/types/trip';
import { getDayDisplayLabel, getShortDateLabel } from '@/lib/day-labels';
import { resolveDraggedItemId } from '@/lib/timeline-drop';

export interface DayTabsProps {
  days: Day[];
  baseTimezone?: string;
  selectedDayId?: string | null;
  onSelectDay: (dayId: string | null) => void;
  onEditDay?: (day: Day) => void;
  onAddDay?: () => void;
  onDeleteSelectedDay?: (dayId: string) => void;
  onDropItem?: (dayId: string, itemId: string) => void;
  onItemDragPreviewChange?: (preview: { dayId: string; itemId: string } | null) => void;
  draggingItemId?: string | null;
  dropValidityByDay?: Record<string, boolean>;
}

export function DayTabs({
  days,
  baseTimezone,
  selectedDayId,
  onSelectDay,
  onEditDay,
  onAddDay,
  onDeleteSelectedDay,
  onDropItem,
  onItemDragPreviewChange,
  draggingItemId,
  dropValidityByDay,
}: DayTabsProps) {
  const rootRef = useRef<HTMLDivElement>(null);

  const selectedDay = selectedDayId ? days.find((day) => day.dayId === selectedDayId) ?? null : null;

  const handleDeleteSelectedDay = useCallback(() => {
    if (!selectedDay || !onDeleteSelectedDay) return;
    onDeleteSelectedDay(selectedDay.dayId);
  }, [onDeleteSelectedDay, selectedDay]);

  useHotkey('Delete', handleDeleteSelectedDay, {
    target: rootRef,
    enabled: Boolean(selectedDay) && Boolean(onDeleteSelectedDay),
    conflictBehavior: 'allow',
  });

  useHotkey('Backspace', handleDeleteSelectedDay, {
    target: rootRef,
    enabled: Boolean(selectedDay) && Boolean(onDeleteSelectedDay),
    conflictBehavior: 'allow',
  });

  const handleDragOver = (event: DragEvent<HTMLButtonElement>, dayId: string) => {
    const itemId = resolveDraggedItemId(event.dataTransfer, draggingItemId);
    if (!itemId) return;
    event.preventDefault();
    onItemDragPreviewChange?.({ dayId, itemId });
    const isValidTarget = dropValidityByDay?.[dayId] ?? true;
    event.dataTransfer.dropEffect = isValidTarget ? 'move' : 'none';
  };

  const handleDrop = (event: DragEvent<HTMLButtonElement>, dayId: string) => {
    event.preventDefault();
    const itemId = resolveDraggedItemId(event.dataTransfer, draggingItemId);
    onItemDragPreviewChange?.(null);
    if (itemId && onDropItem) {
      if (dropValidityByDay && !dropValidityByDay[dayId]) return;
      onDropItem(dayId, itemId);
    }
  };

  const handleDragLeave = (event: DragEvent<HTMLButtonElement>) => {
    const relatedTarget = event.relatedTarget as Node | null;
    if (relatedTarget && event.currentTarget.contains(relatedTarget)) return;
    onItemDragPreviewChange?.(null);
  };

  return (
    <div
      ref={rootRef}
      tabIndex={0}
      onPointerDownCapture={() => rootRef.current?.focus()}
      className="flex items-center gap-1.5 overflow-x-auto border-b border-theme bg-theme-elevated px-3 py-2 focus:outline-none"
    >
      <button
        onClick={() => onSelectDay(null)}
        className={`flex-shrink-0 rounded-lg px-3 py-2 text-xs font-medium transition-all ${
          selectedDayId === null
            ? 'bg-neutral-800 text-white shadow-sm dark:bg-white dark:text-neutral-900'
            : 'bg-theme-subtle text-theme-secondary hover:bg-theme-subtle/80 hover:text-theme'
        }`}
      >
        All Days
      </button>

      {days.map((day) => {
        const isSelected = day.dayId === selectedDayId;
        const isDropTarget = Boolean(draggingItemId) && !isSelected;
        const isValidTarget = dropValidityByDay?.[day.dayId] ?? true;
        const displayLabel = getDayDisplayLabel(day);
        const shortDateLabel = getShortDateLabel(day.date);
        const badge = (
          <span className="inline-flex [&>span]:px-1 [&>span]:py-0">
            <TimezoneBadge
              timezone={day.timezone}
              baseTimezone={baseTimezone}
              date={day.date}
              variant={isSelected ? 'onColor' : 'embedded'}
            />
          </span>
        );

        return (
          <div key={day.dayId} className="relative flex-shrink-0">
            <button
              data-day-tab-id={day.dayId}
              onClick={() => onSelectDay(day.dayId)}
              onDragOver={(event) => handleDragOver(event, day.dayId)}
              onDrop={(event) => handleDrop(event, day.dayId)}
              onDragLeave={handleDragLeave}
              className={`group flex flex-col items-start rounded-lg px-2.5 py-1 text-xs font-medium transition-all duration-150 ${
                isSelected
                  ? 'text-white shadow-sm'
                  : isDropTarget
                    ? isValidTarget
                      ? 'scale-105 ring-2 ring-accent ring-offset-1 ring-offset-theme-elevated bg-accent/20 text-accent'
                      : 'opacity-60 ring-2 ring-red-500 ring-offset-1 ring-offset-theme-elevated bg-red-500/15 text-red-600'
                    : 'bg-theme-subtle text-theme-secondary hover:bg-theme-subtle/80 hover:text-theme'
              }`}
              style={{
                ...(isSelected ? { backgroundColor: day.colorHex } : {}),
                paddingRight: onEditDay ? '3.25rem' : undefined,
              }}
            >
              <div className="flex min-w-0 items-center gap-1.5">
                <span
                  className={`h-2 w-2 rounded-full ${isSelected ? 'bg-white/50' : ''}`}
                  style={!isSelected ? { backgroundColor: day.colorHex } : undefined}
                />
                <span className="truncate whitespace-nowrap">{displayLabel}</span>
              </div>
              <div className="flex items-center gap-0.5 leading-tight">
                <span className={`text-[10px] ${isSelected ? 'text-white/70' : 'text-theme-tertiary'}`}>
                  {shortDateLabel}
                </span>
                {!onEditDay ? badge : null}
              </div>
            </button>

            {onEditDay ? (
              <button
                type="button"
                data-day-tab-timezone-id={day.dayId}
                onClick={() => onEditDay(day)}
                className="absolute bottom-1 right-1 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
                aria-label={`Edit timezone for ${displayLabel}`}
              >
                {badge}
              </button>
            ) : null}
          </div>
        );
      })}

      {onAddDay ? (
        <button
          onClick={onAddDay}
          className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg border-2 border-dashed border-theme text-theme-tertiary transition-colors hover:border-accent hover:text-accent"
          aria-label="Add day"
        >
          <Plus className="h-4 w-4" />
        </button>
      ) : null}
    </div>
  );
}
