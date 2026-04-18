import { timeToMinutes, minutesToTime } from '@/lib/optimizer-utils';

export interface AvailabilityWindow {
  dayOfWeek?: number;
  openTime: string;
  closeTime: string;
}

export interface AvailabilityDateSlot {
  date: string;
  startTime: string;
  endTime: string;
  repeatDates?: string[];
}

export interface AvailabilityWeeklyEntry {
  kind: 'weekly';
  days: number[];
  startTime: string;
  endTime: string;
}

export interface AvailabilityDateEntry {
  kind: 'date';
  date: string;
  startTime: string;
  endTime: string;
}

export type AvailabilityEntry = AvailabilityWeeklyEntry | AvailabilityDateEntry;

interface AvailabilityPayloadV2 {
  version?: 2;
  slots?: AvailabilityDateSlot[];
}

interface AvailabilityPayloadV3 {
  version: 3;
  entries?: AvailabilityEntry[];
}

const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6] as const;
const GOOGLE_WEEKDAY_INDEX_TO_DAY_OF_WEEK = [1, 2, 3, 4, 5, 6, 0] as const;
const ENGLISH_DAY_TO_DAY_OF_WEEK: Record<string, number> = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function parseJson(json: string): unknown | null {
  if (!json || json.trim() === '' || json.trim() === '[]') {
    return null;
  }

  try {
    return JSON.parse(json);
  } catch {
    return null;
  }
}

function isAvailabilityPayloadV2(value: unknown): value is AvailabilityPayloadV2 {
  return isRecord(value) && Array.isArray(value.slots);
}

function isAvailabilityPayloadV3(value: unknown): value is AvailabilityPayloadV3 {
  return isRecord(value) && value.version === 3 && Array.isArray(value.entries);
}

function normalizeDays(days: number[]): number[] {
  return Array.from(new Set(days.filter((day) => Number.isInteger(day) && day >= 0 && day <= 6))).sort(
    (a, b) => a - b,
  );
}

function expandDateSlot(slot: AvailabilityDateSlot): AvailabilityDateSlot[] {
  const expanded: AvailabilityDateSlot[] = [
    {
      date: slot.date,
      startTime: slot.startTime,
      endTime: slot.endTime,
    },
  ];

  for (const repeatDate of slot.repeatDates ?? []) {
    if (!repeatDate) continue;
    expanded.push({
      date: repeatDate,
      startTime: slot.startTime,
      endTime: slot.endTime,
    });
  }

  return expanded;
}

function coerceLegacyWindows(raw: unknown[]): AvailabilityWindow[] {
  return raw.filter(
    (window): window is AvailabilityWindow =>
      isRecord(window) &&
      typeof window.openTime === 'string' &&
      typeof window.closeTime === 'string' &&
      (window.dayOfWeek === undefined || typeof window.dayOfWeek === 'number'),
  );
}

function coerceDateSlots(raw: unknown[]): AvailabilityDateSlot[] {
  const slots = raw.filter(
    (slot): slot is AvailabilityDateSlot =>
      isRecord(slot) &&
      typeof slot.date === 'string' &&
      typeof slot.startTime === 'string' &&
      typeof slot.endTime === 'string',
  );

  return slots.flatMap(expandDateSlot);
}

function coerceAvailabilityEntries(raw: unknown[]): AvailabilityEntry[] {
  const entries: AvailabilityEntry[] = [];

  for (const value of raw) {
    if (!isRecord(value)) continue;

    if (value.kind === 'weekly') {
      if (typeof value.startTime !== 'string' || typeof value.endTime !== 'string' || !Array.isArray(value.days)) {
        continue;
      }

      const days = normalizeDays(value.days.filter((day): day is number => typeof day === 'number'));
      if (days.length === 0) continue;

      entries.push({
        kind: 'weekly',
        days,
        startTime: value.startTime,
        endTime: value.endTime,
      });
      continue;
    }

    if (value.kind === 'date') {
      if (typeof value.date !== 'string' || typeof value.startTime !== 'string' || typeof value.endTime !== 'string') {
        continue;
      }

      entries.push({
        kind: 'date',
        date: value.date,
        startTime: value.startTime,
        endTime: value.endTime,
      });
      continue;
    }

    if (typeof value.date === 'string' && typeof value.startTime === 'string' && typeof value.endTime === 'string') {
      const slot: AvailabilityDateSlot = {
        date: value.date,
        startTime: value.startTime,
        endTime: value.endTime,
        ...(Array.isArray(value.repeatDates)
          ? { repeatDates: value.repeatDates.filter((date): date is string => typeof date === 'string') }
          : {}),
      };

      for (const expanded of expandDateSlot(slot)) {
        entries.push({
          kind: 'date',
          date: expanded.date,
          startTime: expanded.startTime,
          endTime: expanded.endTime,
        });
      }
      continue;
    }

    if (typeof value.openTime === 'string' && typeof value.closeTime === 'string') {
      const days =
        typeof value.dayOfWeek === 'number'
          ? normalizeDays([value.dayOfWeek])
          : [...ALL_DAYS];

      if (days.length === 0) continue;

      entries.push({
        kind: 'weekly',
        days,
        startTime: value.openTime,
        endTime: value.closeTime,
      });
    }
  }

  return entries;
}

export function parseAvailabilityEntries(json: string): AvailabilityEntry[] {
  const parsed = parseJson(json);
  if (!parsed) return [];

  if (isAvailabilityPayloadV3(parsed)) {
    return coerceAvailabilityEntries(parsed.entries ?? []);
  }

  if (Array.isArray(parsed)) {
    return coerceAvailabilityEntries(parsed);
  }

  if (isAvailabilityPayloadV2(parsed)) {
    return coerceAvailabilityEntries(parsed.slots ?? []);
  }

  return [];
}

export function serializeAvailabilityEntries(entries: AvailabilityEntry[]): string {
  if (!entries.length) return '[]';

  const normalizedEntries: AvailabilityEntry[] = [];

  for (const entry of entries) {
    if (entry.kind === 'weekly') {
      const days = normalizeDays(entry.days);
      if (days.length === 0) continue;
      normalizedEntries.push({
        kind: 'weekly',
        days,
        startTime: entry.startTime,
        endTime: entry.endTime,
      });
      continue;
    }

    if (!entry.date) continue;
    normalizedEntries.push({
      kind: 'date',
      date: entry.date,
      startTime: entry.startTime,
      endTime: entry.endTime,
    });
  }

  return JSON.stringify({
    version: 3,
    entries: normalizedEntries,
  });
}

export function parseAvailabilityWindows(json: string): AvailabilityWindow[] {
  const parsed = parseJson(json);
  if (!parsed) return [];

  if (Array.isArray(parsed)) {
    return coerceLegacyWindows(parsed);
  }

  if (isAvailabilityPayloadV3(parsed)) {
    return coerceAvailabilityEntries(parsed.entries ?? []).flatMap((entry) =>
      entry.kind === 'weekly'
        ? entry.days.map((dayOfWeek) => ({
            dayOfWeek,
            openTime: entry.startTime,
            closeTime: entry.endTime,
          }))
        : [],
    );
  }

  return [];
}

export function serializeAvailabilityWindows(windows: AvailabilityWindow[]): string {
  if (!windows.length) return '[]';
  return JSON.stringify(
    windows.map((window) => ({
      ...(window.dayOfWeek !== undefined ? { dayOfWeek: window.dayOfWeek } : {}),
      openTime: window.openTime,
      closeTime: window.closeTime,
    })),
  );
}

export function parseGoogleWeekdayTextToAvailabilityWindows(
  weekdayText?: string[] | null,
): AvailabilityWindow[] {
  if (!Array.isArray(weekdayText) || weekdayText.length === 0) return [];

  const windows: AvailabilityWindow[] = [];

  weekdayText.forEach((line, index) => {
    if (typeof line !== 'string' || line.trim() === '') return;

    const colonIndex = line.indexOf(':');
    const rawDayLabel = colonIndex >= 0 ? line.slice(0, colonIndex).trim() : '';
    const rawHours = colonIndex >= 0 ? line.slice(colonIndex + 1).trim() : line.trim();
    const normalizedDayLabel = rawDayLabel.toLowerCase();

    const dayOfWeek =
      ENGLISH_DAY_TO_DAY_OF_WEEK[normalizedDayLabel] ??
      GOOGLE_WEEKDAY_INDEX_TO_DAY_OF_WEEK[index];

    const normalizedHours = rawHours
      .replace(/[\u00A0\u2009\u202F]/g, ' ')
      .replace(/[â€“â€”âˆ’]/g, '-')
      .trim();

    if (!normalizedHours || /closed/i.test(normalizedHours)) {
      return;
    }

    if (/open\s+24\s+hours/i.test(normalizedHours)) {
      windows.push({
        dayOfWeek,
        openTime: '00:00',
        closeTime: '23:59',
      });
      return;
    }

    const ranges = normalizedHours
      .split(',')
      .map((segment) => segment.trim())
      .filter(Boolean);

    for (const range of ranges) {
      const match = range.match(/^(.+?)\s*-\s*(.+)$/);
      if (!match) continue;

      const openTime = parseGoogleHourLabel(match[1]);
      const closeTime = parseGoogleHourLabel(match[2]);
      if (!openTime || !closeTime) continue;

      const openMinutes = timeToMinutes(openTime);
      const closeMinutes = timeToMinutes(closeTime);

      if (closeMinutes <= openMinutes) {
        windows.push({
          dayOfWeek,
          openTime,
          closeTime: '23:59',
        });
        windows.push({
          dayOfWeek: (dayOfWeek + 1) % 7,
          openTime: '00:00',
          closeTime,
        });
        continue;
      }

      windows.push({
        dayOfWeek,
        openTime,
        closeTime,
      });
    }
  });

  return windows;
}

export function parseAvailabilityDateSlots(json: string): AvailabilityDateSlot[] {
  const parsed = parseJson(json);
  if (!parsed) return [];

  if (Array.isArray(parsed)) {
    return coerceDateSlots(parsed);
  }

  if (isAvailabilityPayloadV2(parsed)) {
    return coerceDateSlots(parsed.slots ?? []);
  }

  if (isAvailabilityPayloadV3(parsed)) {
    return coerceAvailabilityEntries(parsed.entries ?? []).flatMap((entry) =>
      entry.kind === 'date'
        ? [
            {
              date: entry.date,
              startTime: entry.startTime,
              endTime: entry.endTime,
            },
          ]
        : [],
    );
  }

  return [];
}

export function serializeAvailabilityDateSlots(slots: AvailabilityDateSlot[]): string {
  if (!slots.length) return '[]';
  return JSON.stringify({
    version: 2,
    slots: slots.map((slot) => ({
      date: slot.date,
      startTime: slot.startTime,
      endTime: slot.endTime,
      ...(slot.repeatDates && slot.repeatDates.length > 0
        ? { repeatDates: slot.repeatDates }
        : {}),
    })),
  });
}

export function getAvailabilityRangesForDate(
  availabilityJson: string,
  date: string,
): { startTime: string; endTime: string }[] {
  const parsed = parseJson(availabilityJson);

  if (isAvailabilityPayloadV3(parsed)) {
    const dayOfWeek = getDayOfWeek(date);
    return coerceAvailabilityEntries(parsed.entries ?? []).flatMap((entry) => {
      if (entry.kind === 'date') {
        return entry.date === date
          ? [{ startTime: entry.startTime, endTime: entry.endTime }]
          : [];
      }

      return entry.days.includes(dayOfWeek)
        ? [{ startTime: entry.startTime, endTime: entry.endTime }]
        : [];
    });
  }

  const dateSlots = parseAvailabilityDateSlots(availabilityJson)
    .filter((slot) => slot.date === date)
    .map((slot) => ({ startTime: slot.startTime, endTime: slot.endTime }));

  if (dateSlots.length > 0) {
    return dateSlots;
  }

  const windows = parseAvailabilityWindows(availabilityJson);
  if (windows.length === 0) return [];

  const dayOfWeek = getDayOfWeek(date);
  return windows
    .filter((window) => window.dayOfWeek === undefined || window.dayOfWeek === dayOfWeek)
    .map((window) => ({ startTime: window.openTime, endTime: window.closeTime }));
}

export function isRangeAllowedForDate(
  availabilityJson: string,
  date: string,
  startTime: string,
  endTime: string,
): boolean {
  const ranges = getAvailabilityRangesForDate(availabilityJson, date);
  if (ranges.length === 0) return true;

  const start = timeToMinutes(startTime);
  const end = timeToMinutes(endTime);
  return ranges.some((range) => {
    const open = timeToMinutes(range.startTime);
    const close = timeToMinutes(range.endTime);
    return start >= open && end <= close;
  });
}

export function isAvailable(
  windows: AvailabilityWindow[],
  date: string,
  startTime: string,
  endTime: string,
): boolean {
  if (windows.length === 0) {
    return true;
  }

  const dayOfWeek = getDayOfWeek(date);
  const startMin = timeToMinutes(startTime);
  const endMin = timeToMinutes(endTime);

  return windows.some((window) => {
    if (window.dayOfWeek !== undefined && window.dayOfWeek !== dayOfWeek) {
      return false;
    }

    const windowOpen = timeToMinutes(window.openTime);
    const windowClose = timeToMinutes(window.closeTime);

    return startMin >= windowOpen && endMin <= windowClose;
  });
}

export function nextAvailableSlot(
  windows: AvailabilityWindow[],
  date: string,
  minStartTime: string,
  durationMinutes: number,
): string | null {
  if (windows.length === 0) {
    return minStartTime;
  }

  const dayOfWeek = getDayOfWeek(date);
  const minStart = timeToMinutes(minStartTime);

  const applicable = windows
    .filter((window) => window.dayOfWeek === undefined || window.dayOfWeek === dayOfWeek)
    .map((window) => ({
      open: timeToMinutes(window.openTime),
      close: timeToMinutes(window.closeTime),
    }))
    .sort((a, b) => a.open - b.open);

  for (const window of applicable) {
    const candidateStart = Math.max(minStart, window.open);
    const candidateEnd = candidateStart + durationMinutes;

    if (candidateEnd <= window.close) {
      return minutesToTime(candidateStart);
    }
  }

  return null;
}

export function hasAvailabilityConstraints(item: { availabilityWindows: string }): boolean {
  return parseAvailabilityEntries(item.availabilityWindows).length > 0;
}

function getDayOfWeek(date: string): number {
  const [year, month, day] = date.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}

function parseGoogleHourLabel(label: string): string | null {
  const normalized = label
    .replace(/[\u00A0\u2009\u202F]/g, ' ')
    .trim()
    .toLowerCase();

  if (!normalized) return null;
  if (normalized === 'midnight') return '00:00';
  if (normalized === 'noon') return '12:00';

  const match = normalized.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)$/i);
  if (!match) return null;

  let hour = Number(match[1]);
  const minute = Number(match[2] ?? '0');
  const meridiem = match[3].toLowerCase();

  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return null;
  if (hour < 1 || hour > 12 || minute < 0 || minute > 59) return null;

  if (hour === 12) hour = 0;
  if (meridiem === 'pm') hour += 12;

  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}
