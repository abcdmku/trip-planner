import { useEffect, useMemo, useRef, useState } from 'react';
import { Plus, Trash2, X } from 'lucide-react';
import {
  parseAvailabilityDateSlots,
  parseAvailabilityWindows,
  serializeAvailabilityWindows,
  type AvailabilityWindow,
} from '@/lib/availability';
import {
  groupAvailabilityDateSlots,
  serializeAvailabilityDateGroups,
  type AvailabilityDateGroup,
} from '@/lib/availability-date-groups';
import { MultiDateCalendar } from '@/components/items/MultiDateCalendar';

interface AvailabilityEditorProps {
  value: string;
  onChange: (nextValue: string) => void;
  defaultDate?: string;
  mapsAvailabilityWindows?: AvailabilityWindow[];
  /** When true, removes outer border/padding/bg (for use inside EditorSection). */
  flat?: boolean;
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

// ---------------------------------------------------------------------------
// Segmented control helper
// ---------------------------------------------------------------------------

function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  disabledValues,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (next: T) => void;
  disabledValues?: Set<T>;
}) {
  return (
    <div className="flex rounded-lg bg-theme-subtle p-0.5">
      {options.map((opt) => {
        const disabled = disabledValues?.has(opt.value);
        const active = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => !disabled && onChange(opt.value)}
            disabled={disabled}
            className={`flex-1 rounded-md py-1.5 text-[11px] font-medium transition-all ${
              disabled
                ? 'cursor-not-allowed text-theme-tertiary/30'
                : active
                  ? 'bg-theme-elevated text-theme shadow-sm'
                  : 'text-theme-tertiary hover:text-theme-secondary'
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function AvailabilityEditor({
  value,
  onChange,
  defaultDate,
  mapsAvailabilityWindows,
  flat = false,
}: AvailabilityEditorProps) {
  const slots = useMemo(() => parseAvailabilityDateSlots(value), [value]);
  const dateGroups = useMemo(() => groupAvailabilityDateSlots(slots), [slots]);
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
  const [openCalendarIndex, setOpenCalendarIndex] = useState<number | null>(null);
  const openCalendarContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (openCalendarIndex === null) return;

    const handlePointerDown = (e: MouseEvent) => {
      const container = openCalendarContainerRef.current;
      if (!container) return;
      if (!container.contains(e.target as Node)) {
        setOpenCalendarIndex(null);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpenCalendarIndex(null);
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [openCalendarIndex]);

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

  const commitDateGroups = (nextGroups: AvailabilityDateGroup[]) => {
    onChange(serializeAvailabilityDateGroups(nextGroups));
  };

  const commitWeekly = (nextRows: WeeklyManualRow[]) => {
    onChange(serializeWeeklyRows(nextRows));
  };

  const seedDate = defaultDate ?? new Date().toISOString().slice(0, 10);

  const createSeedDateGroup = (): AvailabilityDateGroup => ({
    startTime: '09:00',
    endTime: '10:00',
    dates: [seedDate],
  });

  const handleAddDateGroup = () => {
    if (activeMode !== 'manual' || manualEntryMode !== 'dates') return;
    commitDateGroups([...dateGroups, createSeedDateGroup()]);
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
      commitDateGroups(groupAvailabilityDateSlots(cachedSlots));
      return;
    }

    commitDateGroups([createSeedDateGroup()]);
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

  const handleDateGroupTimeChange = (index: number, key: 'startTime' | 'endTime', nextValue: string) => {
    const next = [...dateGroups];
    if (!next[index]) return;
    next[index] = { ...next[index], [key]: nextValue };
    commitDateGroups(next);
  };

  const handleDateGroupDatesChange = (index: number, nextDates: string[]) => {
    const next = [...dateGroups];
    if (!next[index]) return;
    const deduped = Array.from(new Set(nextDates.filter(Boolean))).sort();
    if (deduped.length === 0) {
      commitDateGroups(next.filter((_, i) => i !== index));
      setOpenCalendarIndex(null);
      return;
    }
    next[index] = { ...next[index], dates: deduped };
    commitDateGroups(next);
  };

  const handleRemoveDateFromGroup = (index: number, date: string) => {
    const group = dateGroups[index];
    if (!group) return;
    handleDateGroupDatesChange(index, group.dates.filter((d) => d !== date));
  };

  const handleDeleteDateGroup = (index: number) => {
    const next = dateGroups.filter((_, i) => i !== index);
    commitDateGroups(next);
    setOpenCalendarIndex(null);
  };

  const disabledModes = hasHoursSource ? undefined : new Set<AvailabilityMode>(['hours']);

  return (
    <div className={flat ? 'space-y-2' : 'space-y-2 rounded-lg border border-theme bg-theme-subtle p-2'}>
      {/* Header — hidden when flat (section header handles it) */}
      {!flat && (
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-theme-secondary">Available Times</span>
          {activeMode === 'manual' && (
          <button
            type="button"
            onClick={manualEntryMode === 'weekly' ? handleAddWeeklyRow : handleAddDateGroup}
            className="rounded-md p-1 text-theme-tertiary hover:bg-theme-elevated hover:text-theme"
            aria-label="Add available time"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
          )}
        </div>
      )}

      {/* Mode selector — segmented control */}
      <SegmentedControl
        options={[
          { value: 'hours' as AvailabilityMode, label: 'Hours' },
          { value: 'manual' as AvailabilityMode, label: 'Custom' },
          { value: 'none' as AvailabilityMode, label: 'Any Time' },
        ]}
        value={activeMode}
        onChange={switchMode}
        disabledValues={disabledModes}
      />

      {/* + button for flat mode */}
      {flat && activeMode === 'manual' && (
        <div className="flex justify-end -mt-1">
          <button
            type="button"
            onClick={manualEntryMode === 'weekly' ? handleAddWeeklyRow : handleAddDateGroup}
            className="rounded-md p-1 text-theme-tertiary hover:bg-theme-subtle hover:text-theme-secondary"
            aria-label="Add available time"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Hours of operation display */}
      {activeMode === 'hours' && (
        <div className="rounded-lg bg-theme-subtle p-2.5 text-[11px] text-theme-secondary">
          <p className="mb-1.5 text-xs font-medium text-theme">
            Using hours{mapsAvailabilityWindows?.length ? ' from Maps' : ''}
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
          <p className="mt-1.5 text-theme-tertiary">
            Switch to Custom to override.
          </p>
        </div>
      )}

      {/* No restriction */}
      {activeMode === 'none' && (
        <p className="py-1 text-center text-[11px] italic text-theme-tertiary">
          No constraints — event can be placed anytime.
        </p>
      )}

      {/* Manual mode */}
      {activeMode === 'manual' && (
        <div className="space-y-2">
          {/* Weekly / Specific Dates toggle */}
          <SegmentedControl
            options={[
              { value: 'weekly' as ManualEntryMode, label: 'Weekly' },
              { value: 'dates' as ManualEntryMode, label: 'Specific Dates' },
            ]}
            value={manualEntryMode}
            onChange={switchManualEntryMode}
          />

          {manualEntryMode === 'weekly' && weeklyRows.length === 0 ? (
            <p className="py-1 text-center text-[11px] italic text-theme-tertiary">
              No weekly slots yet.
            </p>
          ) : null}

          {manualEntryMode === 'dates' && dateGroups.length === 0 ? (
            <p className="py-1 text-center text-[11px] italic text-theme-tertiary">
              No date slots yet.
            </p>
          ) : null}

          {/* Weekly rows */}
          {manualEntryMode === 'weekly' &&
            weeklyRows.map((row, index) => (
              <div key={`weekly-${index}`} className="space-y-1.5 rounded-lg bg-theme-subtle px-2.5 py-2">
                <div className="flex gap-1">
                  {DAY_SHORT_LABELS.map((label, dayOfWeek) => {
                    const enabled = row.dayEnabled[dayOfWeek];
                    return (
                      <button
                        key={`${label}-${dayOfWeek}`}
                        type="button"
                        onClick={() => handleWeeklyDayToggle(index, dayOfWeek)}
                        className={`flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-semibold transition-all ${
                          enabled
                            ? 'bg-accent/15 text-accent'
                            : 'text-theme-tertiary/40 hover:text-theme-tertiary hover:bg-theme-elevated'
                        }`}
                        aria-pressed={enabled}
                        title={DAY_LABELS[dayOfWeek]}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>

                <div className="flex items-center gap-1.5">
                  <input
                    type="time"
                    value={row.startTime}
                    onChange={(e) => handleWeeklyTimeChange(index, 'startTime', e.target.value)}
                    className="input flex-1 py-1 text-[11px]"
                  />
                  <span className="text-xs text-theme-tertiary/30">&rarr;</span>
                  <input
                    type="time"
                    value={row.endTime}
                    onChange={(e) => handleWeeklyTimeChange(index, 'endTime', e.target.value)}
                    className="input flex-1 py-1 text-[11px]"
                  />
                  <button
                    type="button"
                    onClick={() => handleDeleteWeeklyRow(index)}
                    className="rounded-md p-1 text-theme-tertiary/50 hover:text-red-500 transition-colors"
                    aria-label="Delete repeating available slot"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              </div>
            ))}

          {/* Date-specific groups */}
          {manualEntryMode === 'dates' &&
            dateGroups.map((group, index) => (
              <div key={`${group.startTime}-${group.endTime}-${index}`} className="space-y-2 rounded-lg bg-theme-subtle px-2.5 py-2">
                <div className="flex items-center gap-1.5">
                  <input
                    type="time"
                    value={group.startTime}
                    onChange={(e) => handleDateGroupTimeChange(index, 'startTime', e.target.value)}
                    className="input flex-1 py-1 text-[11px]"
                  />
                  <span className="text-xs text-theme-tertiary/30">&rarr;</span>
                  <input
                    type="time"
                    value={group.endTime}
                    onChange={(e) => handleDateGroupTimeChange(index, 'endTime', e.target.value)}
                    className="input flex-1 py-1 text-[11px]"
                  />
                  <button
                    type="button"
                    onClick={() => handleDeleteDateGroup(index)}
                    className="rounded-md p-1 text-theme-tertiary/50 hover:text-red-500 transition-colors"
                    aria-label="Delete date slot group"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                  {group.dates.length > 0 ? (
                    group.dates.map((date) => (
                      <span
                        key={date}
                        className="inline-flex items-center gap-1 rounded-full border border-theme bg-theme-elevated px-2 py-0.5 text-[11px] font-medium text-theme-secondary"
                        title={date}
                      >
                        <span className="tabular-nums">{date}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveDateFromGroup(index, date)}
                          className="rounded-full p-0.5 text-theme-tertiary hover:bg-theme-subtle hover:text-theme-secondary"
                          aria-label={`Remove ${date}`}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))
                  ) : (
                    <span className="text-[11px] italic text-theme-tertiary">
                      No dates selected.
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <div
                    className="relative"
                    ref={openCalendarIndex === index ? openCalendarContainerRef : undefined}
                  >
                    <button
                      type="button"
                      onClick={() => setOpenCalendarIndex((prev) => (prev === index ? null : index))}
                      className="rounded-md border border-theme bg-theme-elevated px-2.5 py-1 text-[11px] font-semibold text-theme-secondary hover:bg-theme"
                    >
                      Pick dates
                    </button>

                    {openCalendarIndex === index && (
                      <div className="absolute left-0 z-50 mt-2">
                        <MultiDateCalendar
                          value={group.dates}
                          onChange={(next) => handleDateGroupDatesChange(index, next)}
                          anchorDate={defaultDate}
                        />
                        <div className="mt-2 flex justify-end">
                          <button
                            type="button"
                            onClick={() => setOpenCalendarIndex(null)}
                            className="rounded-md border border-theme bg-theme-elevated px-2.5 py-1 text-[11px] font-semibold text-theme-secondary hover:bg-theme"
                          >
                            Done
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {defaultDate && !group.dates.includes(defaultDate) && (
                    <button
                      type="button"
                      onClick={() => handleDateGroupDatesChange(index, [...group.dates, defaultDate])}
                      className="text-[11px] font-semibold text-theme-tertiary hover:text-theme-secondary"
                    >
                      + Add default date
                    </button>
                  )}
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
