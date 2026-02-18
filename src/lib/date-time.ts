// ---------------------------------------------------------------------------
// date-time - Helpers for mixed HH:mm and ISO datetime values used by items.
// ---------------------------------------------------------------------------

/**
 * Extract HH:mm from either HH:mm or ISO datetime values.
 */
export function extractTime(value: string): string {
  if (!value) return '';
  if (value.includes('T')) {
    const part = value.split('T')[1] ?? '';
    return part.slice(0, 5);
  }
  return value.slice(0, 5);
}

/**
 * Convert HH:mm or ISO datetime to minutes since midnight.
 */
export function toMinutesOfDay(value: string): number | null {
  const hhmm = extractTime(value);
  if (!hhmm) return null;
  const [h, m] = hhmm.split(':').map(Number);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
  if (h < 0 || h > 23 || m < 0 || m > 59) return null;
  return h * 60 + m;
}

/**
 * Build a Date for Google Directions departure from a day date + HH:mm/ISO.
 *
 * Returns undefined if either side cannot be parsed.
 */
export function buildDateTime(
  dayDate: string | undefined,
  timeOrIso: string,
): Date | undefined {
  if (!timeOrIso) return undefined;

  if (timeOrIso.includes('T')) {
    const parsed = new Date(timeOrIso);
    return Number.isNaN(parsed.getTime()) ? undefined : parsed;
  }

  if (!dayDate) return undefined;
  const hhmm = extractTime(timeOrIso);
  if (!hhmm) return undefined;

  const parsed = new Date(`${dayDate}T${hhmm}:00`);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}
