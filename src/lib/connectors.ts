import type { Item } from '@/types/trip';
import { toMinutesOfDay } from '@/lib/date-time';

export interface TimelineConnector {
  id: string;
  dayId: string;
  fromItemId: string;
  toItemId: string;
  from: { lat: number; lng: number };
  to: { lat: number; lng: number };
}

/**
 * Timeline connector with positioning data for rendering in the timeline view.
 * Includes the gap duration between items.
 */
export interface TimelineConnectorWithTiming {
  id: string;
  dayId: string;
  fromItemId: string;
  toItemId: string;
  /** End minute of the fromItem (when the gap starts) */
  fromEndMin: number;
  /** Start minute of the toItem (when the gap ends) */
  toStartMin: number;
  /** Duration of the gap in minutes */
  gapMinutes: number;
}

function hasCoordinates(lat: number, lng: number): boolean {
  return lat !== 0 || lng !== 0;
}

function anchorFromItem(item: Item): { lat: number; lng: number } | null {
  const hasDest = hasCoordinates(item.destLat, item.destLng);
  if (hasDest) {
    return { lat: item.destLat, lng: item.destLng };
  }
  if (!hasCoordinates(item.lat, item.lng)) return null;
  return { lat: item.lat, lng: item.lng };
}

function originFromItem(item: Item): { lat: number; lng: number } | null {
  if (!hasCoordinates(item.lat, item.lng)) return null;
  return { lat: item.lat, lng: item.lng };
}

/**
 * Build dotted auto-connectors between scheduled, non-transport items.
 *
 * Connectors are suppressed when an explicit transport item exists that links
 * the same pair via travelFromItemId/travelToItemId.
 */
export function deriveTimelineConnectors(items: Item[]): TimelineConnector[] {
  const explicitPairs = new Set(
    items
      .filter((item) => item.type === 'transport' && item.travelFromItemId && item.travelToItemId)
      .map((item) => `${item.travelFromItemId}::${item.travelToItemId}`),
  );

  const byDay = new Map<string, Item[]>();
  for (const item of items) {
    if (!item.scheduledStart) continue;
    if (item.type === 'transport') continue;
    const list = byDay.get(item.dayId) ?? [];
    list.push(item);
    byDay.set(item.dayId, list);
  }

  const connectors: TimelineConnector[] = [];
  for (const [dayId, dayItems] of byDay) {
    const sorted = [...dayItems].sort((a, b) => {
      const timeDelta = (toMinutesOfDay(a.scheduledStart) ?? 0) - (toMinutesOfDay(b.scheduledStart) ?? 0);
      if (timeDelta !== 0) return timeDelta;
      return a.sortOrder - b.sortOrder;
    });

    for (let i = 0; i < sorted.length - 1; i++) {
      const fromItem = sorted[i];
      const toItem = sorted[i + 1];

      if (explicitPairs.has(`${fromItem.itemId}::${toItem.itemId}`)) {
        continue;
      }

      const from = anchorFromItem(fromItem);
      const to = originFromItem(toItem);
      if (!from || !to) continue;

      connectors.push({
        id: `connector-${fromItem.itemId}-${toItem.itemId}`,
        dayId,
        fromItemId: fromItem.itemId,
        toItemId: toItem.itemId,
        from,
        to,
      });
    }
  }

  return connectors;
}

/**
 * Build timeline connectors with timing data for rendering connection lines
 * in the timeline view. Shows the gap between consecutive scheduled items.
 *
 * @param items - All items in the trip
 * @param suppressedConnectorIds - Set of connector IDs to exclude (manually removed)
 * @returns Array of connectors with timing information
 */
export function deriveTimelineConnectorsWithTiming(
  items: Item[],
  suppressedConnectorIds?: Set<string>,
): TimelineConnectorWithTiming[] {
  // Only consider scheduled transport items as explicit pairs
  // (unscheduled transport items shouldn't suppress auto-connectors)
  const explicitPairs = new Set(
    items
      .filter((item) => item.type === 'transport' && item.travelFromItemId && item.travelToItemId && item.scheduledStart)
      .map((item) => `${item.travelFromItemId}::${item.travelToItemId}`),
  );

  const byDay = new Map<string, Item[]>();
  for (const item of items) {
    if (!item.scheduledStart) continue;
    // Include all item types (including transport) for timeline connectors
    const list = byDay.get(item.dayId) ?? [];
    list.push(item);
    byDay.set(item.dayId, list);
  }

  const connectors: TimelineConnectorWithTiming[] = [];

  for (const [dayId, dayItems] of byDay) {
    const sorted = [...dayItems].sort((a, b) => {
      const timeDelta = (toMinutesOfDay(a.scheduledStart) ?? 0) - (toMinutesOfDay(b.scheduledStart) ?? 0);
      if (timeDelta !== 0) return timeDelta;
      return a.sortOrder - b.sortOrder;
    });

    for (let i = 0; i < sorted.length - 1; i++) {
      const fromItem = sorted[i];
      const toItem = sorted[i + 1];

      // Skip if there's an explicit transport item linking these
      if (explicitPairs.has(`${fromItem.itemId}::${toItem.itemId}`)) {
        continue;
      }

      const connectorId = `connector-${fromItem.itemId}-${toItem.itemId}`;

      // Skip if this connector was manually suppressed
      if (suppressedConnectorIds?.has(connectorId)) {
        continue;
      }

      const fromStartMin = toMinutesOfDay(fromItem.scheduledStart) ?? 0;
      const fromEndMin = fromItem.scheduledEnd
        ? (toMinutesOfDay(fromItem.scheduledEnd) ?? fromStartMin + fromItem.durationMinutes)
        : fromStartMin + fromItem.durationMinutes;

      const toStartMin = toMinutesOfDay(toItem.scheduledStart) ?? 0;

      const gapMinutes = Math.max(0, toStartMin - fromEndMin);

      connectors.push({
        id: connectorId,
        dayId,
        fromItemId: fromItem.itemId,
        toItemId: toItem.itemId,
        fromEndMin,
        toStartMin,
        gapMinutes,
      });
    }
  }

  return connectors;
}
