// ---------------------------------------------------------------------------
// leg-recompute – Service to determine which legs need recalculation and
// compute legs for a day's items.
// ---------------------------------------------------------------------------

import type { Item, Leg, Day, TransportMode } from '@/types/trip';
import { mapsRepository } from '@/services/maps-repository';
import type { LegCalculation } from '@/services/maps-repository';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** A pair of consecutive items that needs a new leg calculation. */
export interface DirtyLegPair {
  fromItem: Item;
  toItem: Item;
}

// ---------------------------------------------------------------------------
// findDirtyLegs
// ---------------------------------------------------------------------------

/**
 * Compares the sorted items against existing legs and returns pairs of
 * consecutive items that need new leg calculations.
 *
 * A leg is considered "dirty" (needing recalculation) if:
 * - There is no existing leg for the (fromItemId, toItemId) pair.
 * - An item was added, removed, or reordered such that the consecutive pair
 *   no longer matches an existing leg.
 */
export function findDirtyLegs(
  items: Item[],
  existingLegs: Leg[],
): DirtyLegPair[] {
  // Build a set of existing leg keys for fast lookup.
  const existingLegKeys = new Set(
    existingLegs.map((leg) => `${leg.fromItemId}::${leg.toItemId}`),
  );

  const dirtyPairs: DirtyLegPair[] = [];

  // Items should already be sorted by sortOrder; iterate consecutive pairs.
  for (let i = 0; i < items.length - 1; i++) {
    const fromItem = items[i];
    const toItem = items[i + 1];
    const key = `${fromItem.itemId}::${toItem.itemId}`;

    if (!existingLegKeys.has(key)) {
      dirtyPairs.push({ fromItem, toItem });
    }
  }

  return dirtyPairs;
}

// ---------------------------------------------------------------------------
// computeLegsForDay
// ---------------------------------------------------------------------------

/**
 * Computes all legs between consecutive items for a given day.
 *
 * Items are sorted by `sortOrder` before processing. For each consecutive
 * pair, calls the maps repository `calculateLeg` to obtain the route.
 *
 * Returns an array of `Leg` objects ready to be persisted. Failed
 * calculations are silently skipped (the leg is omitted).
 *
 * @param items     Items belonging to a single day (will be sorted internally).
 * @param day       The day these items belong to.
 * @param mode      The transport mode to use for leg calculations.
 */
export async function computeLegsForDay(
  items: Item[],
  _day: Day,
  mode: TransportMode,
): Promise<Leg[]> {
  // Sort items by sortOrder.
  const sorted = [...items].sort((a, b) => a.sortOrder - b.sortOrder);

  if (sorted.length < 2) return [];

  const legs: Leg[] = [];

  // Process consecutive pairs sequentially to avoid quota spikes.
  for (let i = 0; i < sorted.length - 1; i++) {
    const fromItem = sorted[i];
    const toItem = sorted[i + 1];

    // Skip items without valid coordinates.
    if (
      (fromItem.lat === 0 && fromItem.lng === 0) ||
      (toItem.lat === 0 && toItem.lng === 0)
    ) {
      continue;
    }

    // Use the scheduled end of the fromItem as departure time if available.
    const departureTime = fromItem.scheduledEnd
      ? new Date(fromItem.scheduledEnd)
      : undefined;

    const result: LegCalculation | null = await mapsRepository.calculateLeg(
      { lat: fromItem.lat, lng: fromItem.lng },
      { lat: toItem.lat, lng: toItem.lng },
      mode,
      departureTime,
    );

    if (result) {
      legs.push({
        legId: `leg-${fromItem.itemId}-${toItem.itemId}`,
        fromItemId: fromItem.itemId,
        toItemId: toItem.itemId,
        mode,
        departure: result.departure,
        arrival: result.arrival,
        durationMinutes: result.durationMinutes,
        distanceMeters: result.distanceMeters,
        routePathEncoded: result.routePathEncoded,
      });
    }
  }

  return legs;
}
