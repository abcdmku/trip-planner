import type { ItineraryItem, OptimizeResult, OptimizationMode, TripDay, TransportMode } from '../../types/domain';
import { durationBetween, fromMinutes, toMinutes } from '../../utils/time';

const MODE_SPEED_KMH: Record<TransportMode, number> = {
  DRIVING: 40,
  WALKING: 5,
  BICYCLING: 15,
  TRANSIT: 25
};

function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const toRadians = (value: number): number => (value * Math.PI) / 180;

  const earthRadiusKm = 6371;
  const dLat = toRadians(b.lat - a.lat);
  const dLng = toRadians(b.lng - a.lng);

  const lat1 = toRadians(a.lat);
  const lat2 = toRadians(b.lat);

  const value =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLng / 2) * Math.sin(dLng / 2) * Math.cos(lat1) * Math.cos(lat2);

  const arc = 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
  return earthRadiusKm * arc;
}

function estimateTravelMinutes(
  from: Pick<ItineraryItem, 'lat' | 'lng'>,
  to: Pick<ItineraryItem, 'lat' | 'lng'>,
  mode: TransportMode
): number {
  const km = haversineKm(from, to);
  const speedKmh = MODE_SPEED_KMH[mode];
  if (speedKmh <= 0) {
    return 0;
  }
  return Math.max(1, Math.round((km / speedKmh) * 60));
}

function compareByPriorityAndId(a: ItineraryItem, b: ItineraryItem): number {
  if (a.priority !== b.priority) {
    return b.priority - a.priority;
  }

  const aAvailabilityEnd = a.availabilityEnd ?? '23:59';
  const bAvailabilityEnd = b.availabilityEnd ?? '23:59';
  if (aAvailabilityEnd !== bAvailabilityEnd) {
    return aAvailabilityEnd.localeCompare(bAvailabilityEnd);
  }

  return a.itemId.localeCompare(b.itemId);
}

function isWithinAvailability(item: ItineraryItem, startMin: number, endMin: number): boolean {
  const availabilityStart = item.availabilityStart ? toMinutes(item.availabilityStart) : 0;
  const availabilityEnd = item.availabilityEnd ? toMinutes(item.availabilityEnd) : 24 * 60;
  return startMin >= availabilityStart && endMin <= availabilityEnd;
}

function applySchedule(
  items: ItineraryItem[],
  day: TripDay,
  includeAvailabilityChecks: boolean
): { items: ItineraryItem[]; conflicts: string[]; droppedOptional: string[] } {
  const conflicts: string[] = [];
  const droppedOptional: string[] = [];
  const scheduled: ItineraryItem[] = [];

  const dayStartMin = toMinutes(day.dayStart);
  const dayEndMin = toMinutes(day.dayEnd);

  let currentTime = dayStartMin;

  for (let index = 0; index < items.length; index += 1) {
    const current = items[index];
    const previous = scheduled[index - 1];

    if (previous) {
      currentTime += estimateTravelMinutes(previous, current, current.mode);
    }

    const preferredStart = Math.max(currentTime, toMinutes(current.startTime));
    const durationMin = Math.max(5, current.durationMin || durationBetween(current.startTime, current.endTime));
    const endTime = preferredStart + durationMin;

    if (endTime > dayEndMin) {
      if (current.isOptional) {
        droppedOptional.push(current.itemId);
        continue;
      }

      conflicts.push(`${current.title}: exceeds day end (${day.dayEnd})`);
    }

    if (includeAvailabilityChecks && !isWithinAvailability(current, preferredStart, endTime)) {
      if (current.isOptional) {
        droppedOptional.push(current.itemId);
        continue;
      }

      conflicts.push(`${current.title}: outside availability window`);
    }

    const scheduledStart = Math.max(dayStartMin, Math.min(preferredStart, dayEndMin));
    const scheduledEnd = Math.max(scheduledStart, Math.min(endTime, dayEndMin));

    scheduled.push({
      ...current,
      sortOrder: scheduled.length + 1,
      startTime: fromMinutes(scheduledStart),
      endTime: fromMinutes(scheduledEnd)
    });

    currentTime = scheduledEnd;
  }

  return { items: scheduled, conflicts, droppedOptional };
}

function optimizeMinTravelTime(items: ItineraryItem[], day: TripDay): OptimizeResult {
  if (items.length <= 1) {
    return {
      orderedItems: items,
      droppedOptionalItemIds: [],
      conflicts: []
    };
  }

  const sorted = [...items].sort((a, b) => a.sortOrder - b.sortOrder || a.itemId.localeCompare(b.itemId));
  const ordered: ItineraryItem[] = [sorted[0]];
  const remaining = sorted.slice(1);

  while (remaining.length > 0) {
    const last = ordered[ordered.length - 1];

    remaining.sort((a, b) => {
      const travelA = estimateTravelMinutes(last, a, a.mode);
      const travelB = estimateTravelMinutes(last, b, b.mode);
      if (travelA !== travelB) {
        return travelA - travelB;
      }
      return compareByPriorityAndId(a, b);
    });

    ordered.push(remaining.shift() as ItineraryItem);
  }

  const scheduled = applySchedule(ordered, day, false);

  return {
    orderedItems: scheduled.items,
    droppedOptionalItemIds: [],
    conflicts: scheduled.conflicts
  };
}

function optimizeMaximizeActivities(items: ItineraryItem[], day: TripDay): OptimizeResult {
  const required = items.filter((item) => !item.isOptional).sort(compareByPriorityAndId);
  const optional = items.filter((item) => item.isOptional).sort(compareByPriorityAndId);

  const orderedCandidates = [...required, ...optional];
  const scheduled = applySchedule(orderedCandidates, day, true);

  return {
    orderedItems: scheduled.items,
    droppedOptionalItemIds: scheduled.droppedOptional,
    conflicts: scheduled.conflicts
  };
}

export class OptimizerService {
  optimizeDay(items: ItineraryItem[], day: TripDay, mode: OptimizationMode): OptimizeResult {
    const targetItems = [...items].sort((a, b) => a.sortOrder - b.sortOrder || a.itemId.localeCompare(b.itemId));

    if (mode === 'minimize_travel_time') {
      return optimizeMinTravelTime(targetItems, day);
    }

    return optimizeMaximizeActivities(targetItems, day);
  }
}
