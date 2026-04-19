import type { Day } from '@/types/trip';
import { getDayDisplayLabel } from '@/lib/day-labels';

export interface DayFilterProps {
  days: Day[];
  selectedDayIds: string[];
  onToggleDay: (dayId: string) => void;
  onSelectAll: () => void;
  onClearAll: () => void;
}

export function DayFilter({ days, selectedDayIds, onToggleDay, onSelectAll, onClearAll }: DayFilterProps) {
  const allSelected = selectedDayIds.length === 0 || selectedDayIds.length === days.length;

  return (
    <div className="flex items-center gap-2 overflow-x-auto px-3 py-2">
      <button
        onClick={allSelected ? onClearAll : onSelectAll}
        className={`flex-shrink-0 rounded-lg px-2.5 py-1 text-xs font-medium transition-all ${
          allSelected ? 'bg-stone-800 text-white' : 'bg-stone-100 text-stone-500 hover:bg-stone-200'
        }`}
      >
        All
      </button>
      {days.map((day) => {
        const isActive = selectedDayIds.length === 0 || selectedDayIds.includes(day.dayId);
        const displayLabel = getDayDisplayLabel(day);

        return (
          <button
            key={day.dayId}
            onClick={() => onToggleDay(day.dayId)}
            className={`flex flex-shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition-all ${
              isActive ? 'text-white shadow-sm' : 'bg-stone-100 text-stone-400 hover:bg-stone-200'
            }`}
            style={isActive ? { backgroundColor: day.colorHex } : undefined}
          >
            <span
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: isActive ? 'rgba(255,255,255,0.5)' : day.colorHex }}
            />
            {displayLabel}
          </button>
        );
      })}
    </div>
  );
}
