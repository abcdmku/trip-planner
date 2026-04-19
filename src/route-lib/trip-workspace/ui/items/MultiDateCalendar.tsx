import { useMemo, useState } from 'react';
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isValid,
  parseISO,
  startOfMonth,
  startOfWeek,
} from 'date-fns';
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';

export interface MultiDateCalendarProps {
  /** ISO dates (YYYY-MM-DD). */
  value: string[];
  onChange: (next: string[]) => void;
  /** Optional ISO date used to choose the initial month to display. */
  anchorDate?: string;
}

const WEEKDAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'] as const;

function uniqSorted(dates: string[]): string[] {
  return Array.from(new Set(dates.filter(Boolean))).sort();
}

function tryParseIsoDate(iso: string | undefined): Date | null {
  if (!iso) return null;
  const date = parseISO(iso);
  return isValid(date) ? date : null;
}

export function MultiDateCalendar({ value, onChange, anchorDate }: MultiDateCalendarProps) {
  const selected = useMemo(() => uniqSorted(value), [value]);
  const selectedSet = useMemo(() => new Set(selected), [selected]);
  const today = useMemo(() => new Date(), []);

  const initialMonth = useMemo(() => {
    const seed =
      tryParseIsoDate(anchorDate) ??
      tryParseIsoDate(selected[0]) ??
      new Date();
    return startOfMonth(seed);
  }, [anchorDate, selected]);

  const [month, setMonth] = useState<Date>(() => initialMonth);

  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(month), { weekStartsOn: 0 });
    const end = endOfWeek(endOfMonth(month), { weekStartsOn: 0 });
    return eachDayOfInterval({ start, end });
  }, [month]);

  const toggle = (iso: string) => {
    const next = new Set(selectedSet);
    if (next.has(iso)) next.delete(iso);
    else next.add(iso);
    onChange(Array.from(next).sort());
  };

  return (
    <div className="w-[304px] select-none rounded-xl border border-theme bg-theme-elevated p-2 shadow-theme-lg">
      <div className="flex items-center gap-2 px-1 pb-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-theme-subtle text-theme-secondary">
          <CalendarDays className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold text-theme">
            {format(month, 'MMMM yyyy')}
          </div>
          <div className="text-[11px] text-theme-tertiary">
            {selected.length > 0 ? `${selected.length} selected` : 'Select dates'}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setMonth((m) => startOfMonth(addMonths(m, -1)))}
            className="rounded-md p-1 text-theme-secondary hover:bg-theme-subtle"
            aria-label="Previous month"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setMonth((m) => startOfMonth(addMonths(m, 1)))}
            className="rounded-md p-1 text-theme-secondary hover:bg-theme-subtle"
            aria-label="Next month"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 px-1 pb-1">
        {WEEKDAY_LABELS.map((d) => (
          <div key={d} className="h-6 text-center text-[10px] font-semibold text-theme-tertiary">
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1 px-1 pb-2">
        {days.map((day) => {
          const iso = format(day, 'yyyy-MM-dd');
          const isSelected = selectedSet.has(iso);
          const inMonth = isSameMonth(day, month);
          const isToday = isSameDay(day, today);

          const base =
            'h-9 w-9 rounded-lg border text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-[rgba(var(--color-accent),0.25)]';
          const colors = isSelected
            ? 'border-[rgba(var(--color-accent),0.35)] bg-[rgba(var(--color-accent),0.15)] text-accent'
            : inMonth
              ? 'border-transparent text-theme-secondary hover:border-theme hover:bg-theme-subtle'
              : 'border-transparent text-theme-tertiary/40 hover:bg-theme-subtle';
          const todayRing = !isSelected && isToday ? 'border-[rgba(var(--color-accent),0.25)]' : '';

          return (
            <button
              key={iso}
              type="button"
              onClick={() => toggle(iso)}
              className={`${base} ${colors} ${todayRing}`}
              aria-pressed={isSelected}
              aria-label={iso}
              title={iso}
            >
              {format(day, 'd')}
            </button>
          );
        })}
      </div>

      <div className="flex items-center justify-between gap-2 px-1">
        <button
          type="button"
          onClick={() => {
            setMonth(startOfMonth(initialMonth));
          }}
          className="text-[11px] font-medium text-theme-tertiary hover:text-theme-secondary"
        >
          Back to default
        </button>
        <button
          type="button"
          onClick={() => onChange([])}
          disabled={selected.length === 0}
          className="rounded-md px-2 py-1 text-[11px] font-semibold text-theme-secondary hover:bg-theme-subtle disabled:cursor-not-allowed disabled:opacity-50"
        >
          Clear
        </button>
      </div>
    </div>
  );
}
