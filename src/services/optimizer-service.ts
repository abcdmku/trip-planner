// ---------------------------------------------------------------------------
// optimizer-service – Selects and orders items within a single Day using
// two strategies: maximize_available_activities and minimize_travel_time.
// ---------------------------------------------------------------------------

import type { Item, Leg, Day, TransportMode } from '@/types/trip';
import {
  parseAvailabilityWindows,
  nextAvailableSlot,
} from '@/lib/availability';
import {
  timeToMinutes,
  minutesToTime,
  calculateEndTime,
  getDayBounds,
  hasOverlap,
} from '@/lib/optimizer-utils';

// ---------------------------------------------------------------------------
// Result shape returned by every optimiser strategy.
// ---------------------------------------------------------------------------

export interface OptimizeResult {
  orderedItems: Item[];
  droppedItems: { item: Item; reason: string }[];
  legs: Leg[];
  totalTravelMinutes: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Fallback travel time (minutes) when we cannot compute real travel. */
const DEFAULT_TRAVEL_MINUTES = 15;

/** Approximate radius of the Earth in kilometres. */
const EARTH_RADIUS_KM = 6371;

// ---------------------------------------------------------------------------
// Private helpers
// ---------------------------------------------------------------------------

/**
 * Haversine distance between two lat/lng points in kilometres.
 */
function haversineKm(
  lat1: number, lng1: number,
  lat2: number, lng2: number,
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Rough travel time estimate in minutes based on Haversine straight-line
 * distance.  Assumes ~30 km/h average urban speed.
 */
function estimateTravelMinutes(from: Item, to: Item): number {
  if (
    (from.lat === 0 && from.lng === 0) ||
    (to.lat === 0 && to.lng === 0)
  ) {
    return DEFAULT_TRAVEL_MINUTES;
  }
  const km = haversineKm(from.lat, from.lng, to.lat, to.lng);
  // 30 km/h -> 0.5 km/min, minimum 2 min between items
  const minutes = Math.max(2, Math.ceil(km / 0.5));
  return minutes;
}

/**
 * Build a placeholder Leg between two items for the optimize preview.
 */
function buildEstimatedLeg(
  from: Item,
  to: Item,
  departureTime: string,
  travelMinutes: number,
  mode: TransportMode,
): Leg {
  return {
    legId: `leg-${from.itemId}-${to.itemId}`,
    fromItemId: from.itemId,
    toItemId: to.itemId,
    mode,
    departure: departureTime,
    arrival: calculateEndTime(departureTime, travelMinutes),
    durationMinutes: travelMinutes,
    distanceMeters: 0,
    routePathEncoded: '',
  };
}

// ---------------------------------------------------------------------------
// OptimizerService
// ---------------------------------------------------------------------------

class OptimizerService {
  // -----------------------------------------------------------------------
  // maximize_available_activities
  // -----------------------------------------------------------------------

  /**
   * Greedy priority-based scheduling: pack as many high-priority items into
   * the day as possible, respecting time-window and travel-time constraints.
   *
   * Algorithm:
   *  1. Sort items by priority (highest first, then by sortOrder).
   *  2. Maintain a "current time" cursor starting at dayStart.
   *  3. For each item, find the next available slot that starts at or after
   *     currentTime (+ travel from previous item).  If the item fits before
   *     dayEnd, schedule it; otherwise try to drop the lowest-priority
   *     optional item already scheduled to make room.
   *  4. Build estimated legs between consecutive scheduled items.
   */
  async maximizeActivities(
    items: Item[],
    day: Day,
    defaultMode: TransportMode,
  ): Promise<OptimizeResult> {
    const { start: dayStartMin, end: dayEndMin } = getDayBounds(day);

    // Sort by priority descending, then by sortOrder ascending as tiebreak.
    const prioritySorted = [...items].sort((a, b) => {
      if (b.priority !== a.priority) return b.priority - a.priority;
      return a.sortOrder - b.sortOrder;
    });

    // Scheduled items stored as { item, startMin, endMin } and kept sorted
    // by startMin so we can always compute travel from the previous item.
    interface Slot {
      item: Item;
      startMin: number;
      endMin: number;
    }

    const scheduled: Slot[] = [];
    const droppedItems: { item: Item; reason: string }[] = [];

    for (const item of prioritySorted) {
      const duration = item.durationMinutes || 30; // fallback 30 min
      const windows = parseAvailabilityWindows(item.availabilityWindows);

      // Determine the earliest time we can start this item.
      // It must be after dayStart and after the end of the last scheduled item + travel.
      let earliestStart = dayStartMin;

      if (scheduled.length > 0) {
        // Sort scheduled by startMin so the "last" item is the one ending latest
        // in chronological sequence.  We need to find a gap, but for a greedy
        // approach we append after the last scheduled item.
        const lastSlot = scheduled[scheduled.length - 1];
        const travel = estimateTravelMinutes(lastSlot.item, item);
        earliestStart = Math.max(earliestStart, lastSlot.endMin + travel);
      }

      const earliestStartTime = minutesToTime(earliestStart);

      // Find a slot within availability windows.
      const slotStart = nextAvailableSlot(
        windows,
        day.date,
        earliestStartTime,
        duration,
      );

      if (slotStart === null) {
        droppedItems.push({
          item,
          reason: 'No availability window fits on this day',
        });
        continue;
      }

      const startMin = timeToMinutes(slotStart);
      const endMin = startMin + duration;

      // Check day bounds.
      if (endMin > dayEndMin) {
        // Try to recover by dropping the lowest-priority optional item.
        const lowestOptional = this._findLowestPriorityOptional(scheduled);
        if (lowestOptional && lowestOptional.item.priority < item.priority) {
          // Remove the lowest optional and try again.
          const idx = scheduled.indexOf(lowestOptional);
          scheduled.splice(idx, 1);
          droppedItems.push({
            item: lowestOptional.item,
            reason: 'Dropped to make room for higher-priority item',
          });

          // Re-attempt scheduling after removal -- recalculate from scratch
          // for simplicity: just push to the end.
          const retryEarliest = scheduled.length > 0
            ? scheduled[scheduled.length - 1].endMin +
              estimateTravelMinutes(scheduled[scheduled.length - 1].item, item)
            : dayStartMin;

          const retrySlot = nextAvailableSlot(
            windows,
            day.date,
            minutesToTime(retryEarliest),
            duration,
          );

          if (retrySlot !== null) {
            const retryStart = timeToMinutes(retrySlot);
            const retryEnd = retryStart + duration;
            if (retryEnd <= dayEndMin) {
              scheduled.push({ item, startMin: retryStart, endMin: retryEnd });
              continue;
            }
          }
        }

        droppedItems.push({
          item,
          reason: 'Exceeds day end time',
        });
        continue;
      }

      // Check for overlap with already-scheduled items.
      const overlaps = scheduled.some((s) =>
        hasOverlap(startMin, endMin, s.startMin, s.endMin),
      );

      if (overlaps) {
        droppedItems.push({
          item,
          reason: 'Time slot conflicts with a higher-priority item',
        });
        continue;
      }

      scheduled.push({ item, startMin, endMin });
    }

    // Sort scheduled items chronologically.
    scheduled.sort((a, b) => a.startMin - b.startMin);

    // Assign sortOrder and update scheduledStart / scheduledEnd on items.
    const orderedItems: Item[] = scheduled.map((slot, index) => ({
      ...slot.item,
      sortOrder: index,
      scheduledStart: `${day.date}T${minutesToTime(slot.startMin)}:00`,
      scheduledEnd: `${day.date}T${minutesToTime(slot.endMin)}:00`,
    }));

    // Build estimated legs.
    const { legs, totalTravelMinutes } = this._buildLegs(
      orderedItems,
      scheduled,
      defaultMode,
    );

    return { orderedItems, droppedItems, legs, totalTravelMinutes };
  }

  // -----------------------------------------------------------------------
  // minimize_travel_time
  // -----------------------------------------------------------------------

  /**
   * Nearest-neighbour heuristic with constraint checking: minimise total
   * travel time while still honouring opening-hours and priority ordering.
   *
   * Algorithm:
   *  1. Start from the first item (by sortOrder) or the earliest-available.
   *  2. From the current item, pick the nearest unvisited item (Haversine)
   *     that is available at the projected arrival time.
   *  3. If the nearest item isn't available, try the next nearest.
   *  4. Continue until all items are visited or no more fit.
   */
  async minimizeTravelTime(
    items: Item[],
    day: Day,
    defaultMode: TransportMode,
  ): Promise<OptimizeResult> {
    const { start: dayStartMin, end: dayEndMin } = getDayBounds(day);

    if (items.length === 0) {
      return { orderedItems: [], droppedItems: [], legs: [], totalTravelMinutes: 0 };
    }

    // Work with a mutable set of remaining items.
    const remaining = new Set(items.map((_, i) => i));
    const itemArr = [...items]; // index-stable copy

    interface Slot {
      item: Item;
      startMin: number;
      endMin: number;
    }

    const scheduled: Slot[] = [];
    const droppedItems: { item: Item; reason: string }[] = [];

    // Pick the first item: use the one sorted first by sortOrder.
    const sortedByOrder = [...items].sort((a, b) => a.sortOrder - b.sortOrder);
    const firstItem = sortedByOrder[0];
    const firstIdx = itemArr.indexOf(firstItem);

    const firstDuration = firstItem.durationMinutes || 30;
    const firstWindows = parseAvailabilityWindows(firstItem.availabilityWindows);
    const firstSlot = nextAvailableSlot(
      firstWindows,
      day.date,
      minutesToTime(dayStartMin),
      firstDuration,
    );

    if (firstSlot === null) {
      // Can't even schedule the first item -- drop it and try others.
      droppedItems.push({
        item: firstItem,
        reason: 'No availability window fits on this day',
      });
      remaining.delete(firstIdx);
    } else {
      const startMin = timeToMinutes(firstSlot);
      scheduled.push({ item: firstItem, startMin, endMin: startMin + firstDuration });
      remaining.delete(firstIdx);
    }

    // Nearest-neighbour loop.
    while (remaining.size > 0) {
      const current = scheduled.length > 0
        ? scheduled[scheduled.length - 1]
        : null;

      const currentTime = current ? current.endMin : dayStartMin;

      // Build candidates sorted by distance from the current item.
      interface Candidate {
        index: number;
        item: Item;
        distKm: number;
      }

      const candidates: Candidate[] = [];
      for (const idx of remaining) {
        const candidate = itemArr[idx];
        const distKm = current
          ? haversineKm(current.item.lat, current.item.lng, candidate.lat, candidate.lng)
          : 0;
        candidates.push({ index: idx, item: candidate, distKm });
      }

      // Sort by distance ascending (nearest first).
      candidates.sort((a, b) => a.distKm - b.distKm);

      let placed = false;

      for (const candidate of candidates) {
        const travel = current
          ? estimateTravelMinutes(current.item, candidate.item)
          : 0;
        const arrivalMin = currentTime + travel;
        const duration = candidate.item.durationMinutes || 30;
        const windows = parseAvailabilityWindows(candidate.item.availabilityWindows);

        // Find the next available slot at or after arrival.
        const slotStart = nextAvailableSlot(
          windows,
          day.date,
          minutesToTime(arrivalMin),
          duration,
        );

        if (slotStart === null) {
          continue; // try next nearest
        }

        const startMin = timeToMinutes(slotStart);
        const endMin = startMin + duration;

        if (endMin > dayEndMin) {
          continue; // doesn't fit in day
        }

        scheduled.push({ item: candidate.item, startMin, endMin });
        remaining.delete(candidate.index);
        placed = true;
        break;
      }

      if (!placed) {
        // None of the remaining items could be placed.
        for (const idx of remaining) {
          droppedItems.push({
            item: itemArr[idx],
            reason: 'Cannot fit into remaining day time or availability windows',
          });
        }
        break;
      }
    }

    // Assign sortOrder and timestamps.
    const orderedItems: Item[] = scheduled.map((slot, index) => ({
      ...slot.item,
      sortOrder: index,
      scheduledStart: `${day.date}T${minutesToTime(slot.startMin)}:00`,
      scheduledEnd: `${day.date}T${minutesToTime(slot.endMin)}:00`,
    }));

    // Build estimated legs.
    const { legs, totalTravelMinutes } = this._buildLegs(
      orderedItems,
      scheduled,
      defaultMode,
    );

    return { orderedItems, droppedItems, legs, totalTravelMinutes };
  }

  // -----------------------------------------------------------------------
  // Private helpers
  // -----------------------------------------------------------------------

  /**
   * Find the lowest-priority optional slot in the scheduled list.
   */
  private _findLowestPriorityOptional(
    scheduled: { item: Item; startMin: number; endMin: number }[],
  ): { item: Item; startMin: number; endMin: number } | null {
    let lowest: { item: Item; startMin: number; endMin: number } | null = null;

    for (const slot of scheduled) {
      if (!slot.item.isOptional) continue;
      if (lowest === null || slot.item.priority < lowest.item.priority) {
        lowest = slot;
      }
    }

    return lowest;
  }

  /**
   * Build estimated legs between consecutive ordered items.
   */
  private _buildLegs(
    orderedItems: Item[],
    scheduled: { item: Item; startMin: number; endMin: number }[],
    defaultMode: TransportMode,
  ): { legs: Leg[]; totalTravelMinutes: number } {
    const legs: Leg[] = [];
    let totalTravelMinutes = 0;

    for (let i = 0; i < orderedItems.length - 1; i++) {
      const from = orderedItems[i];
      const to = orderedItems[i + 1];
      const travel = estimateTravelMinutes(from, to);
      totalTravelMinutes += travel;

      const departureTime = minutesToTime(scheduled[i].endMin);
      legs.push(buildEstimatedLeg(from, to, departureTime, travel, defaultMode));
    }

    return { legs, totalTravelMinutes };
  }
}

export const optimizerService = new OptimizerService();
