// ---------------------------------------------------------------------------
// leg-recompute – Service to determine which legs need recalculation and
// compute legs for a day's items.
// ---------------------------------------------------------------------------

import type { Item, Leg, Day, Trip, TransportMode, RouteType } from '@/types/trip';
import { mapsRepository } from '@/services/maps-repository';
import type { LegCalculation } from '@/services/maps-repository';
import { buildDateTime } from '@/lib/date-time';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Sentinel item ID used for the start location origin. */
export const START_LOCATION_ID = '__start__';

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
  day: Day,
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

    const from = { lat: fromItem.lat, lng: fromItem.lng };
    const to = { lat: toItem.lat, lng: toItem.lng };

    // Use the scheduled end of the fromItem as departure time if available.
    const departureTime = buildDateTime(day.date, fromItem.scheduledEnd);

    // Try directions first, fall back to straight-line.
    let result: LegCalculation | null = null;
    let routeType: RouteType = 'directions';
    try {
      result = await mapsRepository.calculateLeg(from, to, mode, departureTime);
    } catch {
      // Directions API unavailable — fall back below.
    }

    if (!result) {
      result = mapsRepository.calculateStraightLeg(from, to);
      routeType = 'straight';
    }

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
      routeType,
    });
  }

  return legs;
}

// ---------------------------------------------------------------------------
// computeStartLeg
// ---------------------------------------------------------------------------

/**
 * Creates a leg from the trip's start location to the first item of
 * the first selected day. Uses sentinel `fromItemId: '__start__'`.
 *
 * Returns `null` if the trip has no start location or there are no items.
 */
export async function computeStartLeg(
  trip: Trip,
  items: Item[],
  days: Day[],
  selectedDayIds: string[] | undefined,
  mode: TransportMode,
  routeType: RouteType = 'directions',
): Promise<Leg | null> {
  if (trip.startLat === 0 && trip.startLng === 0) return null;
  if (items.length === 0) return null;

  // Determine the first day to use.
  const orderedDays = selectedDayIds && selectedDayIds.length > 0
    ? days.filter((d) => selectedDayIds.includes(d.dayId))
    : days;
  if (orderedDays.length === 0) return null;

  const firstDayId = orderedDays[0].dayId;
  const dayItems = items
    .filter((item) => item.dayId === firstDayId)
    .sort((a, b) => a.sortOrder - b.sortOrder);
  if (dayItems.length === 0) return null;

  const firstItem = dayItems[0];
  if (firstItem.lat === 0 && firstItem.lng === 0) return null;

  const from = { lat: trip.startLat, lng: trip.startLng };
  const to = { lat: firstItem.lat, lng: firstItem.lng };

  if (routeType === 'straight') {
    const calc = mapsRepository.calculateStraightLeg(from, to);
    return {
      legId: `leg-start-${firstItem.itemId}`,
      fromItemId: START_LOCATION_ID,
      toItemId: firstItem.itemId,
      mode,
      departure: calc.departure,
      arrival: calc.arrival,
      durationMinutes: calc.durationMinutes,
      distanceMeters: calc.distanceMeters,
      routePathEncoded: calc.routePathEncoded,
      routeType: 'straight',
    };
  }

  const result = await mapsRepository.calculateLeg(from, to, mode);
  if (!result) return null;

  return {
    legId: `leg-start-${firstItem.itemId}`,
    fromItemId: START_LOCATION_ID,
    toItemId: firstItem.itemId,
    mode,
    departure: result.departure,
    arrival: result.arrival,
    durationMinutes: result.durationMinutes,
    distanceMeters: result.distanceMeters,
    routePathEncoded: result.routePathEncoded,
    routeType: 'directions',
  };
}

// ---------------------------------------------------------------------------
// computeInterDayLegs
// ---------------------------------------------------------------------------

/**
 * Creates legs connecting the last item of day N to the first item of day N+1
 * for each pair of consecutive selected days.
 */
export async function computeInterDayLegs(
  items: Item[],
  days: Day[],
  selectedDayIds: string[] | undefined,
  mode: TransportMode,
  routeType: RouteType = 'directions',
): Promise<Leg[]> {
  const orderedDays = selectedDayIds && selectedDayIds.length > 0
    ? days.filter((d) => selectedDayIds.includes(d.dayId))
    : days;
  if (orderedDays.length < 2) return [];

  const legs: Leg[] = [];

  for (let d = 0; d < orderedDays.length - 1; d++) {
    const day1 = orderedDays[d];
    const day2 = orderedDays[d + 1];

    const day1Items = items
      .filter((item) => item.dayId === day1.dayId)
      .sort((a, b) => a.sortOrder - b.sortOrder);
    const day2Items = items
      .filter((item) => item.dayId === day2.dayId)
      .sort((a, b) => a.sortOrder - b.sortOrder);

    if (day1Items.length === 0 || day2Items.length === 0) continue;

    const lastItem = day1Items[day1Items.length - 1];
    const firstItem = day2Items[0];

    if (
      (lastItem.lat === 0 && lastItem.lng === 0) ||
      (firstItem.lat === 0 && firstItem.lng === 0)
    ) {
      continue;
    }

    const from = { lat: lastItem.lat, lng: lastItem.lng };
    const to = { lat: firstItem.lat, lng: firstItem.lng };

    if (routeType === 'straight') {
      const calc = mapsRepository.calculateStraightLeg(from, to);
      legs.push({
        legId: `leg-interday-${day1.dayId}-${day2.dayId}`,
        fromItemId: lastItem.itemId,
        toItemId: firstItem.itemId,
        mode,
        departure: calc.departure,
        arrival: calc.arrival,
        durationMinutes: calc.durationMinutes,
        distanceMeters: calc.distanceMeters,
        routePathEncoded: calc.routePathEncoded,
        routeType: 'straight',
      });
      continue;
    }

    const result = await mapsRepository.calculateLeg(from, to, mode);
    if (result) {
      legs.push({
        legId: `leg-interday-${day1.dayId}-${day2.dayId}`,
        fromItemId: lastItem.itemId,
        toItemId: firstItem.itemId,
        mode,
        departure: result.departure,
        arrival: result.arrival,
        durationMinutes: result.durationMinutes,
        distanceMeters: result.distanceMeters,
        routePathEncoded: result.routePathEncoded,
        routeType: 'directions',
      });
    }
  }

  return legs;
}
