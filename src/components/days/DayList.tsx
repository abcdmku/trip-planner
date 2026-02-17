import { Plus, Calendar, Trash2 } from 'lucide-react';
import type { Day } from '../../types/trip';

interface DayListProps {
  days: Day[];
  selectedDayId?: string;
  onSelectDay: (dayId: string) => void;
  onAddDay?: () => void;
  onDeleteDay?: (dayId: string) => void;
}

export function DayList({ days, selectedDayId, onSelectDay, onAddDay, onDeleteDay }: DayListProps) {
  if (days.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-8 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-stone-100">
          <Calendar className="h-6 w-6 text-stone-300" />
        </div>
        <div>
          <p className="text-sm font-medium text-stone-500">No days yet</p>
          <p className="text-xs text-stone-400">Add your first travel day</p>
        </div>
        {onAddDay && (
          <button
            onClick={onAddDay}
            className="flex items-center gap-1.5 rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition-all hover:bg-amber-600 hover:shadow-md"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Day
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-1 p-2">
      <div className="flex items-center justify-between px-2 py-1">
        <span className="text-xs font-semibold uppercase tracking-wider text-stone-400">
          Days
        </span>
        {onAddDay && (
          <button
            onClick={onAddDay}
            className="rounded-md p-1 text-stone-300 transition-colors hover:bg-stone-100 hover:text-amber-600"
            aria-label="Add day"
          >
            <Plus className="h-4 w-4" />
          </button>
        )}
      </div>

      {days.map((day) => {
        const isSelected = day.dayId === selectedDayId;
        return (
          <button
            key={day.dayId}
            onClick={() => onSelectDay(day.dayId)}
            className={`group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-all ${
              isSelected
                ? 'bg-stone-100 shadow-sm'
                : 'hover:bg-stone-50'
            }`}
            aria-selected={isSelected}
          >
            <span
              className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg text-xs font-bold text-white"
              style={{ backgroundColor: day.colorHex || '#3B82F6' }}
            >
              {day.label?.slice(0, 2) || 'D'}
            </span>
            <div className="min-w-0 flex-1">
              <p className={`truncate text-sm font-medium ${isSelected ? 'text-stone-800' : 'text-stone-600'}`}>
                {day.label || 'Untitled Day'}
              </p>
              <p className="text-xs text-stone-400">{day.date}</p>
            </div>
            {onDeleteDay && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteDay(day.dayId);
                }}
                className="rounded p-1 text-stone-300 opacity-0 transition-all hover:bg-red-50 hover:text-red-500 group-hover:opacity-100"
                aria-label={`Delete ${day.label}`}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
          </button>
        );
      })}
    </div>
  );
}
