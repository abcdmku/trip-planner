import { useEffect, useMemo, useRef } from 'react';
import { Clock, Plus, Trash2 } from 'lucide-react';
import {
  parseAvailabilityDateSlots,
  parseAvailabilityWindows,
  serializeAvailabilityDateSlots,
  serializeAvailabilityWindows,
  type AvailabilityDateSlot,
  type AvailabilityWindow,
} from '@/lib/availability';

interface AvailabilityEditorProps {
  value: string;
  onChange: (nextValue: string) => void;
  defaultDate?: string;
  mapsAvailabilityWindows?: AvailabilityWindow[];
}

type AvailabilityMode = 'hours' | 'manual' | 'none';
type ManualEntryMode = 'weekly' | 'dates';
interface WeeklyManualRow {
  startTime: string;
  endTime: string;
  dayEnabled: boolean[]; // Sun..Sat
}

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DAY_SHORT_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

function normalizeWindowsForCompare(windows: AvailabilityWindow[]): string {
  return JSON.stringify(
    windows
      .map((window) => ({
        dayOfWeek: window.dayOfWeek ?? -1,
        openTime: window.openTime,
        closeTime: window.closeTime,
      }))
      .sort((a, b) => {
        if (a.dayOfWeek !== b.dayOfWeek) return a.dayOfWeek - b.dayOfWeek;
        if (a.openTime !== b.openTime) return a.openTime.localeCompare(b.openTime);
        return a.closeTime.localeCompare(b.closeTime);
      }),
  );
}

function windowsToWeeklyRows(windows: AvailabilityWindow[]): WeeklyManualRow[] {
  if (windows.length === 0) return [];

  const grouped = new Map<string, WeeklyManualRow>();

  for (const window of windows) {
    const key = `${window.openTime}__${window.closeTime}`;
    const existing = grouped.get(key) ?? {
      startTime: window.openTime,
      endTime: window.closeTime,
      dayEnabled: [false, false, false, false, false, false, false],
    };

    if (window.dayOfWeek === undefined) {
      existing.dayEnabled = [true, true, true, true, true, true, true];
    } else if (window.dayOfWeek >= 0 && window.dayOfWeek <= 6) {
      existing.dayEnabled[window.dayOfWeek] = true;
    }

    grouped.set(key, existing);
  }

  return Array.from(grouped.values());
}

function serializeWeeklyRows(rows: WeeklyManualRow[]): string {
  const windows: AvailabilityWindow[] = [];

  for (const row of rows) {
    if (!row.startTime || !row.endTime) continue;
    row.dayEnabled.forEach((enabled, dayOfWeek) => {
      if (!enabled) return;
      windows.push({
        dayOfWeek,
        openTime: row.startTime,
        closeTime: row.endTime,
      });
    });
  }

  return serializeAvailabilityWindows(windows);
}

function createDefaultWeeklyRow(): WeeklyManualRow {
  return {
    startTime: '09:00',
    endTime: '10:00',
    dayEnabled: [true, true, true, true, true, true, true],
  };
}

function normalizeSlot(slot: AvailabilityDateSlot): AvailabilityDateSlot {
  return {
    date: slot.date,
    startTime: slot.startTime,
    endTime: slot.endTime,
    repeatDates: (slot.repeatDates ?? []).filter(Boolean),
  };
}

export function AvailabilityEditor({
  value,
  onChange,
  defaultDate,
  mapsAvailabilityWindows,
}: AvailabilityEditorProps) {
  const slots = useMemo(() => parseAvailabilityDateSlots(value), [value]);
  const legacyWindows = useMemo(() => parseAvailabilityWindows(value), [value]);
  const weeklyRows = useMemo(() => windowsToWeeklyRows(legacyWindows), [legacyWindows]);
  const mapsHoursValue = useMemo(
    () => serializeAvailabilityWindows(mapsAvailabilityWindows ?? []),
    [mapsAvailabilityWindows],
  );
  const mapsWindowsNormalized = useMemo(
    () => normalizeWindowsForCompare(mapsAvailabilityWindows ?? []),
    [mapsAvailabilityWindows],
  );
  const legacyWindowsNormalized = useMemo(
    () => normalizeWindowsForCompare(legacyWindows),
    [legacyWindows],
  );
  const legacyMatchesMaps =
    legacyWindows.length > 0 &&
    (mapsAvailabilityWindows?.length ?? 0) > 0 &&
    legacyWindowsNormalized === mapsWindowsNormalized;
  const hasHoursSource = (mapsAvailabilityWindows?.length ?? 0) > 0;
  const availableHoursWindows = mapsAvailabilityWindows ?? [];
  const activeMode: AvailabilityMode =
    slots.length > 0 ? 'manual' : legacyWindows.length > 0 ? (legacyMatchesMaps ? 'hours' : 'manual') : 'none';
  const manualEntryMode: ManualEntryMode = slots.length > 0 ? 'dates' : 'weekly';
  const manualCacheRef = useRef<string>('[]');
  const hoursCacheRef = useRef<string>('[]');

  useEffect(() => {
    if (activeMode === 'manual' && (slots.length > 0 || legacyWindows.length > 0)) {
      manualCacheRef.current = value;
    }
  }, [activeMode, legacyWindows.length, slots.length, value]);

  useEffect(() => {
    if (activeMode === 'hours' && legacyWindows.length > 0) {
      hoursCacheRef.current = value;
      return;
    }

    if (mapsHoursValue !== '[]') {
      hoursCacheRef.current = mapsHoursValue;
    }
  }, [activeMode, legacyWindows.length, mapsHoursValue, value]);

  const commit = (nextSlots: AvailabilityDateSlot[]) => {
    onChange(serializeAvailabilityDateSlots(nextSlots.map(normalizeSlot)));
  };

  const commitWeekly = (nextRows: WeeklyManualRow[]) => {
    onChange(serializeWeeklyRows(nextRows));
  };

  const createSeedSlot = (): AvailabilityDateSlot => ({
    date: defaultDate ?? new Date().toISOString().slice(0, 10),
    startTime: '09:00',
    endTime: '10:00',
  });

  const handleAddSlot = () => {
    if (activeMode !== 'manual' || manualEntryMode !== 'dates') return;
    const seedDate = defaultDate ?? new Date().toISOString().slice(0, 10);
    commit([
      ...slots,
      {
        date: seedDate,
        startTime: '09:00',
        endTime: '10:00',
      },
    ]);
  };

  const handleAddWeeklyRow = () => {
    if (activeMode !== 'manual' || manualEntryMode !== 'weekly') return;
    commitWeekly([...weeklyRows, createDefaultWeeklyRow()]);
  };

  const switchMode = (nextMode: AvailabilityMode) => {
    if (nextMode === activeMode) return;

    if (activeMode === 'manual' && slots.length > 0) {
      manualCacheRef.current = value;
    }
    if (activeMode === 'hours' && legacyWindows.length > 0) {
      hoursCacheRef.current = value;
    }

    if (nextMode === 'none') {
      onChange('[]');
      return;
    }

    if (nextMode === 'hours') {
      const candidate =
        parseAvailabilityWindows(hoursCacheRef.current).length > 0
          ? hoursCacheRef.current
          : mapsHoursValue;
      if (parseAvailabilityWindows(candidate).length === 0) return;
      onChange(candidate);
      return;
    }

    const cachedManual = manualCacheRef.current;
    if (
      parseAvailabilityDateSlots(cachedManual).length > 0 ||
      (parseAvailabilityWindows(cachedManual).length > 0 &&
        normalizeWindowsForCompare(parseAvailabilityWindows(cachedManual)) !== mapsWindowsNormalized)
    ) {
      onChange(cachedManual);
      return;
    }

    onChange(serializeWeeklyRows([createDefaultWeeklyRow()]));
  };

  const switchManualEntryMode = (nextManualMode: ManualEntryMode) => {
    if (activeMode !== 'manual' || nextManualMode === manualEntryMode) return;

    if (nextManualMode === 'weekly') {
      const cachedManual = manualCacheRef.current;
      const cachedWindows = parseAvailabilityWindows(cachedManual);
      if (cachedWindows.length > 0 && normalizeWindowsForCompare(cachedWindows) !== mapsWindowsNormalized) {
        onChange(cachedManual);
        return;
      }
      onChange(serializeWeeklyRows([createDefaultWeeklyRow()]));
      return;
    }

    const cachedSlots = parseAvailabilityDateSlots(manualCacheRef.current);
    if (cachedSlots.length > 0) {
      onChange(serializeAvailabilityDateSlots(cachedSlots.map(normalizeSlot)));
      return;
    }

    onChange(serializeAvailabilityDateSlots([createSeedSlot()]));
  };

  const handleSlotChange = (
    index: number,
    key: keyof AvailabilityDateSlot,
    rawValue: string,
  ) => {
    const next = [...slots];
    if (!next[index]) return;

    if (key === 'repeatDates') {
      next[index] = {
        ...next[index],
        repeatDates: rawValue
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
      };
    } else {
      next[index] = {
        ...next[index],
        [key]: rawValue,
      };
    }
    commit(next);
  };

  const handleDelete = (index: number) => {
    const next = slots.filter((_, i) => i !== index);
    commit(next);
  };

  const handleWeeklyTimeChange = (
    index: number,
    key: 'startTime' | 'endTime',
    nextValue: string,
  ) => {
    const next = [...weeklyRows];
    if (!next[index]) return;
    next[index] = { ...next[index], [key]: nextValue };
    commitWeekly(next);
  };

  const handleWeeklyDayToggle = (index: number, dayOfWeek: number) => {
    const next = [...weeklyRows];
    if (!next[index]) return;
    const row = next[index];
    const dayEnabled = [...row.dayEnabled];
    dayEnabled[dayOfWeek] = !dayEnabled[dayOfWeek];
    next[index] = { ...row, dayEnabled };
    commitWeekly(next);
  };

  const handleDeleteWeeklyRow = (index: number) => {
    const next = weeklyRows.filter((_, i) => i !== index);
    commitWeekly(next);
  };

  const modeButtonClass = (mode: AvailabilityMode, disabled = false) =>
    `rounded-md px-2 py-1 text-[11px] font-medium transition-colors ${
      disabled
        ? 'cursor-not-allowed bg-theme text-theme-tertiary opacity-50'
        : activeMode === mode
          ? 'bg-accent/20 text-accent ring-1 ring-accent/40'
          : 'bg-theme-elevated text-theme-secondary hover:bg-theme hover:text-theme'
    }`;

  const manualEntryButtonClass = (mode: ManualEntryMode) =>
    `rounded-md px-2 py-1 text-[11px] font-medium transition-colors ${
      manualEntryMode === mode
        ? 'bg-accent/20 text-accent ring-1 ring-accent/40'
        : 'bg-theme-elevated text-theme-secondary hover:bg-theme hover:text-theme'
    }`;

  return (
    <div className="space-y-2 rounded-lg border border-theme bg-theme-subtle p-2">
      <div className="flex items-center justify-between">
        <label className="flex items-center gap-1.5 text-xs font-medium text-theme-secondary">
          <Clock className="h-3.5 w-3.5" />
          Available Times
        </label>
        {activeMode === 'manual' ? (
          <button
            type="button"
            onClick={manualEntryMode === 'weekly' ? handleAddWeeklyRow : handleAddSlot}
            className="rounded-md p-1 text-theme-tertiary hover:bg-theme-elevated hover:text-theme"
            aria-label="Add available time"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        ) : null}
      </div>

      <div className="grid grid-cols-3 gap-1.5">
        <button
          type="button"
          onClick={() => switchMode('hours')}
          disabled={!hasHoursSource}
          className={modeButtonClass('hours', !hasHoursSource)}
        >
          Hours of Operation
        </button>
        <button
          type="button"
          onClick={() => switchMode('manual')}
          className={modeButtonClass('manual')}
        >
          Manual
        </button>
        <button
          type="button"
          onClick={() => switchMode('none')}
          className={modeButtonClass('none')}
        >
          No Restriction
        </button>
      </div>

      {activeMode === 'hours' && (
        <div className="rounded-md border border-theme bg-theme-elevated p-2 text-[11px] text-theme-secondary">
          <p className="mb-1 font-medium text-theme">
            Using hours of operation{mapsAvailabilityWindows?.length ? ' from Maps' : ''}
          </p>
          <div className="space-y-0.5">
            {availableHoursWindows.map((window, index) => (
              <div key={`${window.dayOfWeek ?? 'any'}-${window.openTime}-${window.closeTime}-${index}`}>
                {window.dayOfWeek !== undefined
                  ? `${DAY_LABELS[window.dayOfWeek] ?? `D${window.dayOfWeek}`}`
                  : 'Any day'}
                : {window.openTime} - {window.closeTime}
              </div>
            ))}
          </div>
          <p className="mt-1 text-theme-tertiary">
            Switch to Manual to override with date-specific times.
          </p>
        </div>
      )}

      {activeMode === 'none' && (
        <p className="text-[11px] italic text-theme-tertiary">
          No constraints. Event can be placed anytime.
        </p>
      )}

      {activeMode === 'manual' && (
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-1.5">
            <button
              type="button"
              onClick={() => switchManualEntryMode('weekly')}
              className={manualEntryButtonClass('weekly')}
            >
              Repeats Weekly
            </button>
            <button
              type="button"
              onClick={() => switchManualEntryMode('dates')}
              className={manualEntryButtonClass('dates')}
            >
              Specific Dates
            </button>
          </div>

          {manualEntryMode === 'dates' && defaultDate ? (
            <p className="text-[11px] text-theme-tertiary">
              Manual slots are date-specific. Default date: {defaultDate}
            </p>
          ) : null}

          {manualEntryMode === 'weekly' && weeklyRows.length === 0 ? (
            <p className="text-[11px] italic text-theme-tertiary">
              No weekly slots yet. Add a repeating time window.
            </p>
          ) : null}

          {manualEntryMode === 'dates' && slots.length === 0 ? (
            <p className="text-[11px] italic text-theme-tertiary">
              No manual slots yet. Add a time window for this date.
            </p>
          ) : null}

          {manualEntryMode === 'weekly' &&
            weeklyRows.map((row, index) => (
              <div key={`weekly-${index}`} className="rounded-md border border-theme bg-theme-elevated p-2">
                <div className="mb-1.5 flex flex-wrap gap-1">
                  {DAY_SHORT_LABELS.map((label, dayOfWeek) => {
                    const enabled = row.dayEnabled[dayOfWeek];
                    return (
                      <button
                        key={`${label}-${dayOfWeek}`}
                        type="button"
                        onClick={() => handleWeeklyDayToggle(index, dayOfWeek)}
                        className={`h-6 w-6 rounded-md text-[10px] font-semibold transition-colors ${
                          enabled
                            ? 'bg-accent/20 text-accent ring-1 ring-accent/40'
                            : 'bg-theme-subtle text-theme-secondary hover:bg-theme hover:text-theme'
                        }`}
                        aria-pressed={enabled}
                        title={DAY_LABELS[dayOfWeek]}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>

                <div className="grid grid-cols-[1fr_1fr_auto] items-center gap-1.5">
                  <input
                    type="time"
                    value={row.startTime}
                    onChange={(e) => handleWeeklyTimeChange(index, 'startTime', e.target.value)}
                    className="input w-full py-1 text-xs"
                  />
                  <input
                    type="time"
                    value={row.endTime}
                    onChange={(e) => handleWeeklyTimeChange(index, 'endTime', e.target.value)}
                    className="input w-full py-1 text-xs"
                  />
                  <button
                    type="button"
                    onClick={() => handleDeleteWeeklyRow(index)}
                    className="rounded-md p-1 text-theme-tertiary hover:bg-theme-subtle hover:text-red-500"
                    aria-label="Delete repeating available slot"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}

          {manualEntryMode === 'dates' &&
            slots.map((slot, index) => (
              <div key={index} className="rounded-md border border-theme bg-theme-elevated p-2">
                <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
                  <input
                    type="date"
                    value={slot.date}
                    onChange={(e) => handleSlotChange(index, 'date', e.target.value)}
                    className="input col-span-2 w-full py-1 text-xs sm:col-span-1"
                  />
                  <input
                    type="time"
                    value={slot.startTime}
                    onChange={(e) => handleSlotChange(index, 'startTime', e.target.value)}
                    className="input w-full py-1 text-xs"
                  />
                  <input
                    type="time"
                    value={slot.endTime}
                    onChange={(e) => handleSlotChange(index, 'endTime', e.target.value)}
                    className="input w-full py-1 text-xs"
                  />
                </div>
                <div className="mt-1.5 flex items-center gap-1.5">
                  <input
                    type="text"
                    value={(slot.repeatDates ?? []).join(', ')}
                    onChange={(e) => handleSlotChange(index, 'repeatDates', e.target.value)}
                    placeholder="Repeat dates (YYYY-MM-DD, comma-separated)"
                    className="input w-full py-1 text-xs"
                  />
                  <button
                    type="button"
                    onClick={() => handleDelete(index)}
                    className="rounded-md p-1 text-theme-tertiary hover:bg-theme-subtle hover:text-red-500"
                    aria-label="Delete available slot"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
