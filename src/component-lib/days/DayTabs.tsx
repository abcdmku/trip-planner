import { useCallback, useRef, type DragEvent } from 'react';
import { Plus } from 'lucide-react';
import { useHotkey } from '@tanstack/react-hotkeys';
import type { Day } from '@/types/trip';
import { getDayDisplayLabel } from '@/lib/day-labels';
import { resolveDraggedItemId } from '@/lib/timeline-drop';

export interface DayTabsProps {
  days: Day[];
  selectedDayId?: string | null;
  onSelectDay: (dayId: string | null) => void;
  onAddDay?: () => void;
  onDeleteSelectedDay?: (dayId: string) => void;
  onDropItem?: (dayId: string, itemId: string) => void;
  onItemDragPreviewChange?: (preview: { dayId: string; itemId: string } | null) => void;
  draggingItemId?: string | null;
  dropValidityByDay?: Record<string, boolean>;
}

export function DayTabs({
  days,
  selectedDayId,
  onSelectDay,
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

        return (
          <button
            key={day.dayId}
            onClick={() => onSelectDay(day.dayId)}
            onDragOver={(event) => handleDragOver(event, day.dayId)}
            onDrop={(event) => handleDrop(event, day.dayId)}
            onDragLeave={handleDragLeave}
            className={`group flex flex-shrink-0 flex-col items-center rounded-lg px-2.5 py-1 text-xs font-medium transition-all duration-150 ${
              isSelected
                ? 'text-white shadow-sm'
                : isDropTarget
                  ? isValidTarget
                    ? 'scale-105 ring-2 ring-accent ring-offset-1 ring-offset-theme-elevated bg-accent/20 text-accent'
                    : 'opacity-60 ring-2 ring-red-500 ring-offset-1 ring-offset-theme-elevated bg-red-500/15 text-red-600'
                  : 'bg-theme-subtle text-theme-secondary hover:bg-theme-subtle/80 hover:text-theme'
            }`}
            style={isSelected ? { backgroundColor: day.colorHex } : undefined}
          >
            <div className="flex items-center gap-1.5">
              <span
                className={`h-2 w-2 rounded-full ${isSelected ? 'bg-white/50' : ''}`}
                style={!isSelected ? { backgroundColor: day.colorHex } : undefined}
              />
              <span className="whitespace-nowrap">{displayLabel}</span>
            </div>
            <span className={`text-[10px] leading-tight ${isSelected ? 'text-white/70' : 'text-theme-tertiary'}`}>
              {day.date}
            </span>
          </button>
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
