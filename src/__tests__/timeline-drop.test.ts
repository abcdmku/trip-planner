import {
  getDragDurationMinutes,
  resolveAppendDropAfterLast,
  resolvePointDropNearest,
} from '@/lib/timeline-drop';
import type { Day, Item } from '@/types/trip';

const baseDay: Day = {
  dayId: 'day-1',
  date: '2026-04-18',
  label: 'Day 1',
  colorHex: '#2563EB',
  dayStart: '08:00',
  dayEnd: '22:00',
};

function makeItem(overrides: Partial<Item> = {}): Item {
  return {
    itemId: 'item-1',
    dayId: 'day-1',
    placeId: 'place-1',
    placeName: 'Museum',
    lat: 0,
    lng: 0,
    address: '',
    type: 'activity',
    scheduledStart: '',
    scheduledEnd: '',
    durationMinutes: 20,
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
    itemRoutePathEncoded: '',
    itemRouteDistanceMeters: 0,
    itemRouteDurationMinutes: 0,
    timelineLocked: false,
    travelFromItemId: '',
    travelToItemId: '',
    ...overrides,
  };
}

describe('timeline drop snapping', () => {
  it('defaults point drops to 15-minute snapping without stretching item duration', () => {
    const item = makeItem({ durationMinutes: 20 });

    const result = resolvePointDropNearest({
      item,
      day: baseDay,
      anchorMin: 10 * 60 + 8,
    });

    expect(result.valid).toBe(true);
    expect(result.startMin).toBe(10 * 60 + 15);
    expect(result.endMin).toBe(10 * 60 + 35);
    expect(getDragDurationMinutes(item)).toBe(20);
  });

  it('snaps append drops upward to the next configured slot', () => {
    const item = makeItem({ itemId: 'item-2', durationMinutes: 20 });
    const scheduledItems = [
      makeItem({
        itemId: 'existing-1',
        scheduledStart: '09:00',
        scheduledEnd: '10:05',
      }),
    ];

    const result = resolveAppendDropAfterLast({
      item,
      day: baseDay,
      scheduledItems,
      snapMinutes: 15,
    });

    expect(result.valid).toBe(true);
    expect(result.startMin).toBe(10 * 60 + 15);
    expect(result.endMin).toBe(10 * 60 + 35);
  });
});
