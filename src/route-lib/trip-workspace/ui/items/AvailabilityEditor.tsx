import { Plus, Trash2 } from 'lucide-react';
import { useMemo } from 'react';
import { DateInput } from '@/component-lib/shared/DateInput';
import {
  parseAvailabilityEntries,
  serializeAvailabilityEntries,
  type AvailabilityEntry,
  type AvailabilityWindow,
} from '@/lib/availability';

interface AvailabilityEditorProps {
  value: string;
  onChange: (nextValue: string) => void;
  defaultDate?: string;
  timezoneLabel?: string | null;
  mapsAvailabilityWindows?: AvailabilityWindow[];
  flat?: boolean;
}

const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6] as const;
const DAY_SHORT_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'] as const;
const DEFAULT_START_TIME = '09:00';
const DEFAULT_END_TIME = '10:00';

function createDefaultDateEntry(seedDate: string): AvailabilityEntry {
  return {
    kind: 'date',
    date: seedDate,
    startTime: DEFAULT_START_TIME,
    endTime: DEFAULT_END_TIME,
  };
}

function normalizeDays(days: number[]): number[] {
  return Array.from(
    new Set(days.filter((day) => Number.isInteger(day) && day >= 0 && day <= 6)),
  ).sort((a, b) => a - b);
}

function groupMapsWindowsToEntries(windows: AvailabilityWindow[]): AvailabilityEntry[] {
  const grouped = new Map<string, Set<number>>();

  for (const window of windows) {
    const key = `${window.openTime}__${window.closeTime}`;
    const days = window.dayOfWeek !== undefined ? [window.dayOfWeek] : [...ALL_DAYS];
    const existing = grouped.get(key) ?? new Set<number>();
    days.forEach((day) => existing.add(day));
    grouped.set(key, existing);
  }

  return Array.from(grouped.entries()).map(([key, days]) => {
    const [startTime, endTime] = key.split('__');
    return {
      kind: 'weekly',
      days: Array.from(days).sort((a, b) => a - b),
      startTime,
      endTime,
    };
  });
}

function formatMapsHoursSummary(
  entries: AvailabilityEntry[],
  timezoneLabel?: string | null,
): string {
  if (entries.length === 0) return 'No Maps hours';
  if (entries.length === 1 && entries[0].kind === 'weekly' && entries[0].days.length === 7) {
    const summary = `Maps hours: daily ${entries[0].startTime}-${entries[0].endTime}`;
    return timezoneLabel ? `${summary} ${timezoneLabel}` : summary;
  }
  const summary = `Maps hours available: ${entries.length} row${entries.length === 1 ? '' : 's'}`;
  return timezoneLabel ? `${summary} ${timezoneLabel}` : summary;
}

function RecurrenceToggle({
  kind,
  onChange,
}: {
  kind: AvailabilityEntry['kind'];
  onChange: (next: AvailabilityEntry['kind']) => void;
}) {
  return (
    <div className="inline-flex rounded-lg bg-theme-subtle p-0.5">
      {(['weekly', 'date'] as const).map((option) => {
        const active = kind === option;
        return (
          <button
            key={option}
            type="button"
            onClick={() => onChange(option)}
            className={`inline-flex h-8 items-center rounded-[7px] px-2.5 text-[10px] font-semibold transition-colors ${
              active
                ? 'bg-theme-elevated text-theme shadow-sm'
                : 'text-theme-tertiary hover:text-theme-secondary'
            }`}
            aria-pressed={active}
          >
            {option === 'weekly' ? 'Weekly' : 'Date'}
          </button>
        );
      })}
    </div>
  );
}

export function AvailabilityEditor({
  value,
  onChange,
  defaultDate,
  timezoneLabel,
  mapsAvailabilityWindows,
  flat = false,
}: AvailabilityEditorProps) {
  const entries = useMemo(() => parseAvailabilityEntries(value), [value]);
  const mapsEntries = useMemo(
    () => groupMapsWindowsToEntries(mapsAvailabilityWindows ?? []),
    [mapsAvailabilityWindows],
  );
  const mapsValue = useMemo(() => serializeAvailabilityEntries(mapsEntries), [mapsEntries]);
  const currentValue = useMemo(() => serializeAvailabilityEntries(entries), [entries]);
  const seedDate = defaultDate ?? new Date().toISOString().slice(0, 10);

  const commit = (nextEntries: AvailabilityEntry[]) => {
    onChange(serializeAvailabilityEntries(nextEntries));
  };

  const updateEntry = (index: number, updater: (entry: AvailabilityEntry) => AvailabilityEntry) => {
    const nextEntries = entries.map((entry, entryIndex) =>
      entryIndex === index ? updater(entry) : entry,
    );
    commit(nextEntries);
  };

  const deleteEntry = (index: number) => {
    commit(entries.filter((_, entryIndex) => entryIndex !== index));
  };

  const addDateEntry = () => {
    commit([...entries, createDefaultDateEntry(seedDate)]);
  };

  return (
    <div
      className={
        flat ? 'space-y-2' : 'space-y-2 rounded-lg border border-theme bg-theme-subtle p-2'
      }
    >
      {mapsEntries.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-theme bg-theme px-3 py-2">
          <span className="text-[11px] text-theme-secondary">
            {formatMapsHoursSummary(mapsEntries, timezoneLabel)}
          </span>
          <span className="flex-1" />
          {currentValue === mapsValue ? (
            <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-theme-tertiary">
              Using Maps hours
            </span>
          ) : (
            <button
              type="button"
              onClick={() => commit(mapsEntries)}
              className="text-[11px] font-semibold text-theme-secondary hover:text-theme"
            >
              Use Maps hours
            </button>
          )}
        </div>
      ) : null}

      {entries.length > 0 ? (
        <div className="space-y-2">
          {entries.map((entry, index) => (
            <div
              key={`${entry.kind}-${index}`}
              className="rounded-xl border border-theme bg-theme px-3 py-2.5"
            >
              <div className="grid gap-2.5 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-center">
                <RecurrenceToggle
                  kind={entry.kind}
                  onChange={(nextKind) => {
                    updateEntry(index, (current) => {
                      if (nextKind === current.kind) return current;
                      if (nextKind === 'weekly') {
                        return {
                          kind: 'weekly',
                          days: [...ALL_DAYS],
                          startTime: current.startTime,
                          endTime: current.endTime,
                        };
                      }

                      return {
                        kind: 'date',
                        date: seedDate,
                        startTime: current.startTime,
                        endTime: current.endTime,
                      };
                    });
                  }}
                />

                {entry.kind === 'weekly' ? (
                  <div className="flex flex-wrap items-center gap-1 sm:flex-nowrap sm:gap-1.5">
                    {DAY_SHORT_LABELS.map((label, dayOfWeek) => {
                      const active = entry.days.includes(dayOfWeek);
                      return (
                        <button
                          key={`${index}-${dayOfWeek}`}
                          type="button"
                          onClick={() =>
                            updateEntry(index, (current) => {
                              if (current.kind !== 'weekly') return current;
                              const nextDays = current.days.includes(dayOfWeek)
                                ? current.days.filter((day) => day !== dayOfWeek)
                                : [...current.days, dayOfWeek];
                              return {
                                ...current,
                                days: normalizeDays(nextDays.length > 0 ? nextDays : [dayOfWeek]),
                              };
                            })
                          }
                          className={`flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-semibold transition-colors ${
                            active
                              ? 'bg-accent/15 text-accent'
                              : 'text-theme-tertiary hover:bg-theme-subtle hover:text-theme-secondary'
                          }`}
                          aria-pressed={active}
                          title={label}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <DateInput
                    value={entry.date}
                    onChange={(e) =>
                      updateEntry(index, (current) =>
                        current.kind === 'date'
                          ? { ...current, date: e.target.value || seedDate }
                          : current,
                      )
                    }
                    className="h-8 w-full py-1 text-[11px] sm:w-[168px]"
                  />
                )}

                <div className="flex flex-wrap items-center gap-1.5 sm:justify-self-end">
                  <input
                    type="time"
                    value={entry.startTime}
                    onChange={(e) =>
                      updateEntry(index, (current) => ({
                        ...current,
                        startTime: e.target.value,
                      }))
                    }
                    className="input h-8 w-[98px] py-1 text-[11px]"
                  />
                  <span className="text-[10px] text-theme-tertiary">to</span>
                  <input
                    type="time"
                    value={entry.endTime}
                    onChange={(e) =>
                      updateEntry(index, (current) => ({
                        ...current,
                        endTime: e.target.value,
                      }))
                    }
                    className="input h-8 w-[98px] py-1 text-[11px]"
                  />
                  <button
                    type="button"
                    onClick={() => deleteEntry(index)}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-full text-theme-tertiary transition-colors hover:bg-red-500/10 hover:text-red-500"
                    aria-label="Delete availability row"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="py-1 text-[11px] text-theme-tertiary">No availability limits.</p>
      )}

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={addDateEntry}
          className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-theme-secondary transition-colors hover:text-theme"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>Add date</span>
        </button>

        {entries.length > 0 ? (
          <button
            type="button"
            onClick={() => onChange('[]')}
            className="text-[11px] font-medium text-theme-tertiary transition-colors hover:text-theme-secondary"
          >
            Clear all
          </button>
        ) : null}
      </div>
    </div>
  );
}
