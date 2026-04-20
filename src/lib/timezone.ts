// ---------------------------------------------------------------------------
// timezone – Timezone conversion utilities using date-fns-tz.
//
// Provides helpers for converting times between timezones, formatting
// datetimes with timezone awareness, and comparing timezone offsets.
// ---------------------------------------------------------------------------

import { addDays, format, parseISO } from 'date-fns';
import { formatInTimeZone, toZonedTime, fromZonedTime } from 'date-fns-tz';

export interface DayTimeContext {
  date: string;
  timezone: string;
}

export const COMMON_TIMEZONES = [
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Anchorage',
  'Pacific/Honolulu',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Europe/Rome',
  'Europe/Madrid',
  'Asia/Tokyo',
  'Asia/Shanghai',
  'Asia/Singapore',
  'Asia/Dubai',
  'Asia/Kolkata',
  'Australia/Sydney',
  'Pacific/Auckland',
] as const;

const OFFSET_SUFFIX_RE = /(Z|[+-]\d{2}:\d{2})$/i;
const COMPACT_TIMEZONE_LABELS: Partial<Record<(typeof COMMON_TIMEZONES)[number], (date: Date) => string>> = {
  'Europe/London': (date) => (hasDifferentJanuaryOffset('Europe/London', date) ? 'BST' : 'GMT'),
  'Europe/Paris': () => 'CET',
  'Europe/Berlin': () => 'CET',
  'Europe/Rome': () => 'CET',
  'Europe/Madrid': () => 'CET',
  'Asia/Tokyo': () => 'JST',
  'Asia/Shanghai': () => 'CST',
  'Asia/Singapore': () => 'SGT',
  'Asia/Dubai': () => 'GST',
  'Asia/Kolkata': () => 'IST',
  'Australia/Sydney': () => 'AET',
  'Pacific/Auckland': () => 'NZT',
};

function normalizeClockTime(value: string): string | null {
  const candidate = value.slice(0, 5);
  const [hours, minutes] = candidate.split(':').map(Number);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

function toMinutesOfDay(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

function hasExplicitOffset(value: string): boolean {
  return OFFSET_SUFFIX_RE.test(value);
}

function hasDifferentJanuaryOffset(timezone: string, date: Date): boolean {
  const januaryOffset = formatInTimeZone(new Date(Date.UTC(date.getUTCFullYear(), 0, 15, 12, 0, 0)), timezone, 'xxx');
  const currentOffset = formatInTimeZone(date, timezone, 'xxx');
  return januaryOffset !== currentOffset;
}

export function formatTimezoneOptionLabel(timezone: string): string {
  return timezone.replace(/_/g, ' ');
}

export function getDayBoundsInstant(context: DayTimeContext): { start: Date; end: Date } {
  const start = fromZonedTime(`${context.date}T00:00:00`, context.timezone);
  const nextDate = format(addDays(parseISO(context.date), 1), 'yyyy-MM-dd');
  const end = fromZonedTime(`${nextDate}T00:00:00`, context.timezone);
  return { start, end };
}

export function formatInstantForDay(
  instant: Date,
  context: DayTimeContext,
): { localDate: string; localTime: string; minutesOfDay: number } {
  const localDate = formatInTimeZone(instant, context.timezone, 'yyyy-MM-dd');
  const localTime = formatInTimeZone(instant, context.timezone, 'HH:mm');
  return {
    localDate,
    localTime,
    minutesOfDay: toMinutesOfDay(localTime),
  };
}

export function parseScheduledInstant(value: string, context: DayTimeContext): Date | null {
  if (!value) return null;

  if (hasExplicitOffset(value)) {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  if (value.includes('T')) {
    const [datePart = context.date, timePart = ''] = value.split('T');
    const normalizedTime = normalizeClockTime(timePart);
    if (!normalizedTime) return null;
    return fromZonedTime(`${datePart}T${normalizedTime}:00`, context.timezone);
  }

  const normalizedTime = normalizeClockTime(value);
  if (!normalizedTime) return null;
  return fromZonedTime(`${context.date}T${normalizedTime}:00`, context.timezone);
}

// ---------------------------------------------------------------------------
// convertTime
// ---------------------------------------------------------------------------

/**
 * Convert a time string (HH:mm) on a given date from one timezone to another.
 *
 * @param time   Time in HH:mm format (e.g. "14:30").
 * @param date   Date in YYYY-MM-DD format.
 * @param fromTz Source IANA timezone (e.g. "America/New_York").
 * @param toTz   Target IANA timezone (e.g. "Europe/London").
 * @returns      Converted time in HH:mm format.
 *
 * @example convertTime("14:30", "2025-07-01", "America/New_York", "Europe/London") // => "19:30"
 */
export function convertTime(
  time: string,
  date: string,
  fromTz: string,
  toTz: string,
): string {
  // Build a wall-clock datetime in the source timezone and get the UTC instant.
  const dateTimeStr = `${date}T${time}:00`;
  const utcDate = fromZonedTime(dateTimeStr, fromTz);

  // Format that UTC instant in the target timezone.
  return formatInTimeZone(utcDate, toTz, 'HH:mm');
}

// ---------------------------------------------------------------------------
// formatInTz
// ---------------------------------------------------------------------------

/**
 * Format a datetime string in the specified timezone.
 *
 * @param dateStr  An ISO-8601 datetime string or any string parseable by `Date`.
 * @param timezone IANA timezone (e.g. "Asia/Tokyo").
 * @param fmt      date-fns format string. Defaults to `"yyyy-MM-dd HH:mm"`.
 * @returns        The formatted string.
 *
 * @example formatInTz("2025-07-01T12:00:00Z", "Asia/Tokyo") // => "2025-07-01 21:00"
 */
export function formatInTz(
  dateStr: string,
  timezone: string,
  fmt: string = 'yyyy-MM-dd HH:mm',
): string {
  const date = new Date(dateStr);
  return formatInTimeZone(date, timezone, fmt);
}

// ---------------------------------------------------------------------------
// getTimezoneAbbr
// ---------------------------------------------------------------------------

/**
 * Get the timezone abbreviation for a given IANA timezone at a specific date.
 *
 * @param timezone IANA timezone (e.g. "America/New_York").
 * @param date     Reference date (defaults to now). The date matters because
 *                 abbreviations can change with DST (e.g. EST vs EDT).
 * @returns        Short abbreviation string (e.g. "EDT", "JST").
 *
 * @example getTimezoneAbbr("America/New_York", new Date("2025-07-01")) // => "EDT"
 */
export function getTimezoneAbbr(
  timezone: string,
  date: Date = new Date(),
): string {
  const compactLabel = COMPACT_TIMEZONE_LABELS[timezone as (typeof COMMON_TIMEZONES)[number]];
  if (compactLabel) return compactLabel(date);

  const derived = formatInTimeZone(date, timezone, 'zzz').toUpperCase();
  const alphaOnly = derived.replace(/[^A-Z]/g, '');
  if (alphaOnly.length >= 3) return alphaOnly.slice(0, 3);

  const fallback = timezone
    .split('/')
    .pop()
    ?.replace(/_/g, '')
    .replace(/[^A-Za-z]/g, '')
    .toUpperCase();

  return fallback?.slice(0, 3) || 'TZ';
}

// ---------------------------------------------------------------------------
// isDifferentTimezone
// ---------------------------------------------------------------------------

/**
 * Check if two IANA timezone strings represent different UTC offsets on a
 * given date.
 *
 * This is useful for deciding whether to show a "local time" conversion in
 * the UI -- two timezone names can map to the same offset (e.g.
 * "America/New_York" and "US/Eastern").
 *
 * @param tz1  First IANA timezone.
 * @param tz2  Second IANA timezone.
 * @param date Reference date (defaults to now).
 * @returns    `true` if the offsets differ.
 *
 * @example isDifferentTimezone("America/New_York", "America/Chicago") // => true
 */
export function isDifferentTimezone(
  tz1: string,
  tz2: string,
  date: Date = new Date(),
): boolean {
  // Format the UTC offset (e.g. "+05:30", "-04:00") at the reference date.
  const offset1 = formatInTimeZone(date, tz1, 'xxx');
  const offset2 = formatInTimeZone(date, tz2, 'xxx');
  return offset1 !== offset2;
}

// ---------------------------------------------------------------------------
// nowInTimezone
// ---------------------------------------------------------------------------

/**
 * Get the current wall-clock time in a timezone, represented as a `Date`
 * whose UTC fields correspond to the local time in that timezone.
 *
 * Note: The returned `Date` object's internal UTC timestamp is shifted so
 * that calling `date.getHours()` etc. returns the wall-clock values for the
 * target timezone. Use `format()` from date-fns (not `toISOString()`) to
 * render it.
 *
 * @param timezone IANA timezone (e.g. "Europe/Paris").
 * @returns        Zoned `Date`.
 *
 * @example
 * const tokyoNow = nowInTimezone("Asia/Tokyo");
 * format(tokyoNow, "HH:mm"); // current time in Tokyo
 */
export function nowInTimezone(timezone: string): Date {
  return toZonedTime(new Date(), timezone);
}
