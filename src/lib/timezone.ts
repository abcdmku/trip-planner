// ---------------------------------------------------------------------------
// timezone – Timezone conversion utilities using date-fns-tz.
//
// Provides helpers for converting times between timezones, formatting
// datetimes with timezone awareness, and comparing timezone offsets.
// ---------------------------------------------------------------------------

import { formatInTimeZone, toZonedTime, fromZonedTime } from 'date-fns-tz';

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
  return formatInTimeZone(date, timezone, 'zzz');
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
