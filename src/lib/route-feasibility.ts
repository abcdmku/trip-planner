// ---------------------------------------------------------------------------
// route-feasibility – Computes feasibility colour for a travel leg based on
// how much travel time fits within the available gap between two items.
// ---------------------------------------------------------------------------

import type { Leg, Item, Day } from '@/types/trip';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type FeasibilityStatus = 'over' | 'tight' | 'comfortable' | 'unknown';

export interface FeasibilityResult {
  color: string;
  status: FeasibilityStatus;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const COLOR_RED = '#EF4444';
const COLOR_YELLOW = '#F59E0B';
const COLOR_GREEN = '#10B981';
const DEFAULT_THRESHOLD = 0.85;

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Determine the feasibility colour for a leg connecting two items.
 *
 * Logic:
 *   availableMinutes = toItem.scheduledStart − fromItem.scheduledEnd
 *   travelMinutes    = leg.durationMinutes
 *
 *   RED    — travelMinutes > availableMinutes  (won't make it)
 *   YELLOW — travelMinutes ≥ availableMinutes × threshold  (tight)
 *   GREEN  — comfortable extra time
 *
 * If either item lacks a scheduled time, returns `'unknown'` with the day's
 * colour (or a default blue).
 */
export function getFeasibilityColor(
  leg: Leg,
  fromItem: Item,
  toItem: Item,
  dayColor?: string,
  threshold: number = DEFAULT_THRESHOLD,
): FeasibilityResult {
  // If either item has no scheduled time, we can't compute feasibility.
  if (!fromItem.scheduledEnd || !toItem.scheduledStart) {
    return { color: dayColor ?? '#4285F4', status: 'unknown' };
  }

  const endTime = new Date(fromItem.scheduledEnd).getTime();
  const startTime = new Date(toItem.scheduledStart).getTime();

  // Guard against invalid dates.
  if (isNaN(endTime) || isNaN(startTime)) {
    return { color: dayColor ?? '#4285F4', status: 'unknown' };
  }

  const availableMinutes = (startTime - endTime) / 60_000;
  const travelMinutes = leg.durationMinutes;

  // If the available window is zero or negative, always red.
  if (availableMinutes <= 0) {
    return { color: COLOR_RED, status: 'over' };
  }

  if (travelMinutes > availableMinutes) {
    return { color: COLOR_RED, status: 'over' };
  }

  if (travelMinutes >= availableMinutes * threshold) {
    return { color: COLOR_YELLOW, status: 'tight' };
  }

  return { color: COLOR_GREEN, status: 'comfortable' };
}

/**
 * Look up the day colour for a given item.
 */
export function getDayColorForItem(
  item: Item,
  dayMap: Map<string, Day>,
): string {
  return dayMap.get(item.dayId)?.colorHex ?? '#4285F4';
}
