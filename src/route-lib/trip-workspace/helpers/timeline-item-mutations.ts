import type { Item } from '@/types/trip';

export function mergeTimelineItemUpdates(existing: Item, updates: Partial<Item>): Item {
  const merged: Item = { ...existing, ...updates };
  const routeRelevantKeys: (keyof Item)[] = [
    'lat',
    'lng',
    'destLat',
    'destLng',
    'transportMode',
    'itemRouteType',
  ];
  const shouldResetRoute = routeRelevantKeys.some(
    (key) => key in updates && updates[key] !== existing[key],
  );

  if (shouldResetRoute) {
    merged.itemRoutePathEncoded = '';
    merged.itemRouteDistanceMeters = 0;
    merged.itemRouteDurationMinutes = 0;
  }

  return merged;
}

export function shouldDuplicateTimelineItem(
  existing: Item,
  activeExternalDragItemId: string | null | undefined,
): boolean {
  return activeExternalDragItemId === existing.itemId && Boolean(existing.scheduledStart);
}

export function buildTimelineItemDuplicate(
  merged: Item,
  items: Item[],
  createItemId: () => string = () => crypto.randomUUID(),
): Item {
  const targetDayItemCount = items.filter((item) => item.dayId === merged.dayId).length;

  return {
    ...merged,
    itemId: createItemId(),
    sortOrder: targetDayItemCount,
  };
}
