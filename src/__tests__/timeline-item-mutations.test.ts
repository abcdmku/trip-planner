import {
  buildTimelineItemDuplicate,
  mergeTimelineItemUpdates,
  shouldDuplicateTimelineItem,
} from '@route-lib/trip-workspace/helpers/timeline-item-mutations';
import type { Item } from '@/types/trip';

function createItem(overrides: Partial<Item> = {}): Item {
  return {
    itemId: 'item-1',
    dayId: 'day-1',
    placeId: 'place-1',
    placeName: 'Museum',
    lat: 0,
    lng: 0,
    address: '',
    type: 'activity',
    scheduledStart: '09:00',
    scheduledEnd: '10:00',
    durationMinutes: 60,
    notesMd: '',
    photoUrls: [],
    availabilityWindows: '[]',
    isOptional: false,
    priority: 0,
    sortOrder: 0,
    destLat: 0,
    destLng: 0,
    destName: '',
    destAddress: '',
    transportMode: 'walking',
    itemRouteType: 'directions',
    itemRoutePathEncoded: 'encoded-path',
    itemRouteDistanceMeters: 1234,
    itemRouteDurationMinutes: 18,
    timelineLocked: false,
    travelFromItemId: '',
    travelToItemId: '',
    ...overrides,
  };
}

describe('timeline item mutation helpers', () => {
  it('duplicates an externally dragged scheduled item instead of overwriting it', () => {
    const existing = createItem();
    const merged = mergeTimelineItemUpdates(existing, {
      dayId: 'day-2',
      scheduledStart: '13:00',
      scheduledEnd: '14:00',
    });

    expect(shouldDuplicateTimelineItem(existing, existing.itemId)).toBe(true);

    const duplicate = buildTimelineItemDuplicate(
      merged,
      [existing, createItem({ itemId: 'item-2', dayId: 'day-2', sortOrder: 0 })],
      () => 'item-copy',
    );

    expect(duplicate).toMatchObject({
      itemId: 'item-copy',
      dayId: 'day-2',
      scheduledStart: '13:00',
      scheduledEnd: '14:00',
      sortOrder: 1,
    });
  });

  it('resets cached route details when route inputs change', () => {
    const existing = createItem();

    const merged = mergeTimelineItemUpdates(existing, {
      transportMode: 'driving',
    });

    expect(merged.transportMode).toBe('driving');
    expect(merged.itemRoutePathEncoded).toBe('');
    expect(merged.itemRouteDistanceMeters).toBe(0);
    expect(merged.itemRouteDurationMinutes).toBe(0);
  });
});
