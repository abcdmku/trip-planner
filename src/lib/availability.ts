// ---------------------------------------------------------------------------
// availability – Availability window checking logic for itinerary items.
//
// Items can specify JSON-encoded availability windows (e.g. opening hours)
// that constrain when they can be scheduled. This module provides utilities
// to parse, query, and find slots within those windows.
// ---------------------------------------------------------------------------

import { timeToMinutes, minutesToTime } from '@/lib/optimizer-utils';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AvailabilityWindow {
  dayOfWeek?: number; // 0=Sun, 1=Mon, ..., 6=Sat. If undefined, applies to all days.
  openTime: string;   // HH:mm
  closeTime: string;  // HH:mm
}

/** Date-specific availability slot. */
export interface AvailabilityDateSlot {
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  /** Optional extra dates that repeat this same time range. */
  repeatDates?: string[];
}

interface AvailabilityPayloadV2 {
  version?: 2;
  slots?: AvailabilityDateSlot[];
}

// ---------------------------------------------------------------------------
// parseAvailabilityWindows
// ---------------------------------------------------------------------------

/**
 * Parse the JSON string stored in `item.availabilityWindows` into a typed
 * array.  Returns an empty array for null, empty, or malformed input.
 */
export function parseAvailabilityWindows(json: string): AvailabilityWindow[] {
  if (!json || json.trim() === '' || json.trim() === '[]') {
    return [];
  }

  try {
    const parsed: unknown = JSON.parse(json);

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter(
      (w): w is AvailabilityWindow =>
        typeof w === 'object' &&
        w !== null &&
        typeof (w as AvailabilityWindow).openTime === 'string' &&
        typeof (w as AvailabilityWindow).closeTime === 'string',
    );
  } catch {
    return [];
  }
}

/**
 * Parse date-specific availability slots from JSON.
 *
 * Supports either:
 * - Array payload with `{ date, startTime, endTime }` entries
 * - Object payload: `{ version: 2, slots: [...] }`
 */
export function parseAvailabilityDateSlots(json: string): AvailabilityDateSlot[] {
  if (!json || json.trim() === '' || json.trim() === '[]') {
    return [];
  }

  try {
    const parsed: unknown = JSON.parse(json);
    const rawSlots: unknown[] = Array.isArray(parsed)
      ? parsed
      : Array.isArray((parsed as AvailabilityPayloadV2)?.slots)
        ? ((parsed as AvailabilityPayloadV2).slots as unknown[])
        : [];

    const slots: AvailabilityDateSlot[] = rawSlots.filter(
      (slot): slot is AvailabilityDateSlot =>
        typeof slot === 'object' &&
        slot !== null &&
        typeof (slot as AvailabilityDateSlot).date === 'string' &&
        typeof (slot as AvailabilityDateSlot).startTime === 'string' &&
        typeof (slot as AvailabilityDateSlot).endTime === 'string',
    );

    const expanded: AvailabilityDateSlot[] = [];
    for (const slot of slots) {
      expanded.push({
        date: slot.date,
        startTime: slot.startTime,
        endTime: slot.endTime,
      });
      for (const repeatDate of slot.repeatDates ?? []) {
        expanded.push({
          date: repeatDate,
          startTime: slot.startTime,
          endTime: slot.endTime,
        });
      }
    }

    return expanded;
  } catch {
    return [];
  }
}

/**
 * Serialize date slots to the normalized v2 availability payload.
 */
export function serializeAvailabilityDateSlots(
  slots: AvailabilityDateSlot[],
): string {
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

/**
 * Returns all availability windows/slots that apply to a specific date.
 *
 * Legacy weekday windows and new date-specific slots are both supported.
 */
export function getAvailabilityRangesForDate(
  availabilityJson: string,
  date: string,
): { startTime: string; endTime: string }[] {
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

/**
 * Checks whether a [startTime, endTime) interval is allowed for a date.
 *
 * If no availability constraints exist, returns true.
 */
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

// ---------------------------------------------------------------------------
// isAvailable
// ---------------------------------------------------------------------------

/**
 * Check if a time range `[startTime, endTime)` fits within at least one
 * availability window for the given `date`.
 *
 * If `windows` is empty, the item is considered always available (returns true).
 *
 * @param windows   Parsed availability windows.
 * @param date      Date string in YYYY-MM-DD format.
 * @param startTime Start time in HH:mm format.
 * @param endTime   End time in HH:mm format.
 */
export function isAvailable(
  windows: AvailabilityWindow[],
  date: string,
  startTime: string,
  endTime: string,
): boolean {
  // No constraints means always available.
  if (windows.length === 0) {
    return true;
  }

  const dayOfWeek = getDayOfWeek(date);
  const startMin = timeToMinutes(startTime);
  const endMin = timeToMinutes(endTime);

  // The requested range must fit entirely within at least one matching window.
  return windows.some((w) => {
    // Check day-of-week constraint.
    if (w.dayOfWeek !== undefined && w.dayOfWeek !== dayOfWeek) {
      return false;
    }

    const windowOpen = timeToMinutes(w.openTime);
    const windowClose = timeToMinutes(w.closeTime);

    return startMin >= windowOpen && endMin <= windowClose;
  });
}

// ---------------------------------------------------------------------------
// nextAvailableSlot
// ---------------------------------------------------------------------------

/**
 * Find the next available start time on a given `date` that is at or after
 * `minStartTime` and can accommodate `durationMinutes` within one of the
 * availability windows.
 *
 * Returns the start time as HH:mm, or `null` if no slot fits on this date.
 *
 * If `windows` is empty (no constraints), returns `minStartTime` directly.
 */
export function nextAvailableSlot(
  windows: AvailabilityWindow[],
  date: string,
  minStartTime: string,
  durationMinutes: number,
): string | null {
  // No constraints -- the earliest possible time works.
  if (windows.length === 0) {
    return minStartTime;
  }

  const dayOfWeek = getDayOfWeek(date);
  const minStart = timeToMinutes(minStartTime);

  // Collect all windows that apply to this day, sorted by open time.
  const applicable = windows
    .filter((w) => w.dayOfWeek === undefined || w.dayOfWeek === dayOfWeek)
    .map((w) => ({
      open: timeToMinutes(w.openTime),
      close: timeToMinutes(w.closeTime),
    }))
    .sort((a, b) => a.open - b.open);

  for (const win of applicable) {
    // The earliest we can start within this window.
    const candidateStart = Math.max(minStart, win.open);
    const candidateEnd = candidateStart + durationMinutes;

    if (candidateEnd <= win.close) {
      return minutesToTime(candidateStart);
    }
  }

  // No window can fit the duration after minStartTime.
  return null;
}

// ---------------------------------------------------------------------------
// hasAvailabilityConstraints
// ---------------------------------------------------------------------------

/**
 * Returns `true` when the item has non-empty, parseable availability windows.
 */
export function hasAvailabilityConstraints(item: { availabilityWindows: string }): boolean {
  const windows = parseAvailabilityWindows(item.availabilityWindows);
  if (windows.length > 0) return true;
  return parseAvailabilityDateSlots(item.availabilityWindows).length > 0;
}

// ---------------------------------------------------------------------------
// Private helpers
// ---------------------------------------------------------------------------

/**
 * Get the JS day-of-week (0=Sun ... 6=Sat) for a YYYY-MM-DD date string.
 *
 * We parse manually to avoid timezone issues -- constructing a `Date` from
 * YYYY-MM-DD without a time component is treated as UTC midnight, which can
 * shift the day-of-week for certain timezones.
 */
function getDayOfWeek(date: string): number {
  const [year, month, day] = date.split('-').map(Number);
  // Month is 0-indexed in JS Date; use UTC to avoid TZ shifts.
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}
