import { useCallback, useRef } from 'react';
import { Plus } from 'lucide-react';
import { useHotkey } from '@tanstack/react-hotkeys';
import type { Day } from '../../types/trip';

interface DayTabsProps {
  days: Day[];
  selectedDayId?: string | null;
  onSelectDay: (dayId: string | null) => void;
  onAddDay?: () => void;
  /** Called when delete key is pressed for the selected day tab */
  onDeleteSelectedDay?: (dayId: string) => void;
  /** Called when an item is dropped on a day tab */
  onDropItem?: (dayId: string, itemId: string) => void;
  /** Currently dragging item ID for visual feedback */
  draggingItemId?: string | null;
}

export function DayTabs({
  days,
  selectedDayId,
  onSelectDay,
  onAddDay,
  onDeleteSelectedDay,
  onDropItem,
  draggingItemId,
}: DayTabsProps) {
  const rootRef = useRef<HTMLDivElement>(null);

  const selectedDay = selectedDayId
    ? days.find((day) => day.dayId === selectedDayId) ?? null
    : null;

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

  const handleDragOver = (e: React.DragEvent, _dayId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, dayId: string) => {
    e.preventDefault();
    const itemId = e.dataTransfer.getData('text/plain');
    if (itemId && onDropItem) {
      onDropItem(dayId, itemId);
    }
  };

  return (
    <div
      ref={rootRef}
      tabIndex={0}
      onPointerDownCapture={() => rootRef.current?.focus()}
      className="flex items-center gap-1.5 overflow-x-auto border-b border-theme bg-theme-elevated px-3 py-2 focus:outline-none"
    >
      {/* All days tab */}
      <button
        onClick={() => onSelectDay(null)}
        className={`flex-shrink-0 rounded-lg px-3 py-2 text-xs font-medium transition-all ${
          selectedDayId === null
            ? 'bg-neutral-800 text-white dark:bg-white dark:text-neutral-900 shadow-sm'
            : 'bg-theme-subtle text-theme-secondary hover:bg-theme-subtle/80 hover:text-theme'
        }`}
      >
        All Days
      </button>

      {days.map((day) => {
        const isSelected = day.dayId === selectedDayId;
        const isDropTarget = draggingItemId && !isSelected;

        return (
          <button
            key={day.dayId}
            onClick={() => onSelectDay(day.dayId)}
            onDragOver={(e) => handleDragOver(e, day.dayId)}
            onDrop={(e) => handleDrop(e, day.dayId)}
            className={`group flex flex-shrink-0 flex-col items-center rounded-lg px-2.5 py-1 text-xs font-medium transition-all ${
              isSelected
                ? 'text-white shadow-sm'
                : isDropTarget
                  ? 'bg-accent/20 text-accent ring-2 ring-accent ring-offset-1 ring-offset-theme-elevated'
                  : 'bg-theme-subtle text-theme-secondary hover:bg-theme-subtle/80 hover:text-theme'
            }`}
            style={isSelected ? { backgroundColor: day.colorHex } : undefined}
          >
            <div className="flex items-center gap-1.5">
              <span
                className={`h-2 w-2 rounded-full ${isSelected ? 'bg-white/50' : ''}`}
                style={!isSelected ? { backgroundColor: day.colorHex } : undefined}
              />
              <span className="whitespace-nowrap">{day.label}</span>
            </div>
            <span className={`text-[10px] leading-tight ${isSelected ? 'text-white/70' : 'text-theme-tertiary'}`}>
              {day.date}
            </span>
          </button>
        );
      })}

      {onAddDay && (
        <button
          onClick={onAddDay}
          className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg border-2 border-dashed border-theme text-theme-tertiary transition-colors hover:border-accent hover:text-accent"
          aria-label="Add day"
        >
          <Plus className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
