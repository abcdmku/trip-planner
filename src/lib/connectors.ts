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
