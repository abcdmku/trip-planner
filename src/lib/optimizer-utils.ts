// ---------------------------------------------------------------------------
// optimizer-utils – Low-level helper utilities used by the optimizer service
// and availability module.
//
// These are pure functions with no side effects.
// ---------------------------------------------------------------------------

import type { Day } from '@/types/trip';

// ---------------------------------------------------------------------------
// timeToMinutes
// ---------------------------------------------------------------------------

/**
 * Parse an HH:mm time string to the number of minutes since midnight.
 *
 * @example timeToMinutes("08:30") // => 510
 */
export function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

// ---------------------------------------------------------------------------
// minutesToTime
// ---------------------------------------------------------------------------

/**
 * Convert minutes since midnight back to an HH:mm string.
 *
 * Clamps to [0, 1439] (00:00 -- 23:59).
 *
 * @example minutesToTime(510) // => "08:30"
 */
export function minutesToTime(minutes: number): string {
  const clamped = Math.max(0, Math.min(1439, Math.round(minutes)));
  const h = Math.floor(clamped / 60);
  const m = clamped % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

// ---------------------------------------------------------------------------
// hasOverlap
// ---------------------------------------------------------------------------

/**
 * Returns `true` when two half-open intervals `[aStart, aEnd)` and
 * `[bStart, bEnd)` overlap.  Both values are in minutes since midnight.
 */
export function hasOverlap(
  aStart: number,
  aEnd: number,
  bStart: number,
  bEnd: number,
): boolean {
  return aStart < bEnd && bStart < aEnd;
}

// ---------------------------------------------------------------------------
// calculateEndTime
// ---------------------------------------------------------------------------

/**
 * Given a start time (HH:mm) and a duration in minutes, return the end time
 * as an HH:mm string.
 *
 * @example calculateEndTime("08:30", 90) // => "10:00"
 */
export function calculateEndTime(startTime: string, durationMinutes: number): string {
  return minutesToTime(timeToMinutes(startTime) + durationMinutes);
}

// ---------------------------------------------------------------------------
// getDayBounds
// ---------------------------------------------------------------------------

/**
 * Extract the day's start and end times as minutes since midnight.
 */
export function getDayBounds(day: Pick<Day, 'dayStart' | 'dayEnd'>): { start: number; end: number } {
  return {
    start: timeToMinutes(day.dayStart),
    end: timeToMinutes(day.dayEnd),
  };
}
