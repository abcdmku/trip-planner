import type { TripDay } from '../types/domain';

interface DayFilterProps {
  days: TripDay[];
  selectedDayIds: string[];
  onToggleDay: (dayId: string) => void;
}

export function DayFilter({ days, selectedDayIds, onToggleDay }: DayFilterProps) {
  return (
    <div className="rounded-xl border border-slate-700 bg-slate-900/70 p-3">
      <p className="mb-2 text-xs uppercase tracking-[0.15em] text-slate-400">Visible Days</p>
      <div className="flex flex-wrap gap-2">
        {days.map((day) => {
          const selected = selectedDayIds.includes(day.dayId);
          return (
            <button
              key={day.dayId}
              type="button"
              onClick={() => onToggleDay(day.dayId)}
              className={`rounded-md border px-2 py-1 text-xs font-semibold transition ${
                selected
                  ? 'border-transparent text-slate-950'
                  : 'border-slate-600 bg-slate-800 text-slate-200 hover:border-slate-400'
              }`}
              style={selected ? { backgroundColor: day.colorHex } : undefined}
            >
              {day.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
