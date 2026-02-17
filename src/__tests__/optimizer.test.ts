// ---------------------------------------------------------------------------
// Tests for src/services/optimizer-service.ts
// ---------------------------------------------------------------------------

import { optimizerService } from '@/services/optimizer-service';
import type { Item, Day, TransportMode } from '@/types/trip';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build a minimal Item for testing. */
function makeItem(overrides: Partial<Item> & { itemId: string }): Item {
  return {
    dayId: 'day-1',
    placeId: 'place-1',
    placeName: 'Test Place',
    lat: 0,
    lng: 0,
    address: '123 Test St',
    type: 'attraction',
    scheduledStart: '',
    scheduledEnd: '',
    durationMinutes: 60,
    notesMd: '',
    photoUrls: [],
    availabilityWindows: '', // no constraints
    isOptional: false,
    priority: 5,
    sortOrder: 0,
    ...overrides,
  };
}

const defaultDay: Day = {
  dayId: 'day-1',
  date: '2025-08-01',
  label: 'Day 1',
  colorHex: '#3B82F6',
  dayStart: '08:00',
  dayEnd: '20:00', // 12-hour day
};

const defaultMode: TransportMode = 'walking';

// ---------------------------------------------------------------------------
// maximizeActivities
// ---------------------------------------------------------------------------

describe('maximizeActivities', () => {
  it('schedules items that fit within the day', async () => {
    const items: Item[] = [
      makeItem({ itemId: 'a', sortOrder: 0, durationMinutes: 60, priority: 5 }),
      makeItem({ itemId: 'b', sortOrder: 1, durationMinutes: 60, priority: 4 }),
    ];

    const result = await optimizerService.maximizeActivities(
      items,
      defaultDay,
      defaultMode,
    );

    expect(result.orderedItems).toHaveLength(2);
    expect(result.droppedItems).toHaveLength(0);
    expect(result.orderedItems[0].itemId).toBe('a');
    expect(result.orderedItems[1].itemId).toBe('b');
  });

  it('drops lowest-priority optional items when day overflows', async () => {
    // Create a short day that can only hold about 2 hours of activities.
    const shortDay: Day = {
      ...defaultDay,
      dayStart: '08:00',
      dayEnd: '10:30', // only 2.5 hours
    };

    const items: Item[] = [
      makeItem({
        itemId: 'high',
        sortOrder: 0,
        durationMinutes: 60,
        priority: 10,
        isOptional: false,
      }),
      makeItem({
        itemId: 'low-optional',
        sortOrder: 1,
        durationMinutes: 60,
        priority: 1,
        isOptional: true,
      }),
      makeItem({
        itemId: 'medium',
        sortOrder: 2,
        durationMinutes: 60,
        priority: 8,
        isOptional: false,
      }),
    ];

    const result = await optimizerService.maximizeActivities(
      items,
      shortDay,
      defaultMode,
    );

    // The low-optional item should be dropped or the medium item dropped
    // because it cannot fit within 2.5 hours after travel time.
    const scheduledIds = result.orderedItems.map((i) => i.itemId);
    const droppedIds = result.droppedItems.map((d) => d.item.itemId);

    // The high-priority item should always be scheduled.
    expect(scheduledIds).toContain('high');
    // At least one item should be dropped.
    expect(droppedIds.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// minimizeTravelTime
// ---------------------------------------------------------------------------

describe('minimizeTravelTime', () => {
  it('reorders items to reduce distance (nearest-neighbour)', async () => {
    // Place items in a line: A is at (0,0), B is at (0,2), C is at (0,1).
    // Nearest-neighbour from A should pick C first (closer), then B.
    const items: Item[] = [
      makeItem({
        itemId: 'A',
        sortOrder: 0,
        lat: 0,
        lng: 0,
        durationMinutes: 30,
      }),
      makeItem({
        itemId: 'B',
        sortOrder: 1,
        lat: 0,
        lng: 2,
        durationMinutes: 30,
      }),
      makeItem({
        itemId: 'C',
        sortOrder: 2,
        lat: 0,
        lng: 1,
        durationMinutes: 30,
      }),
    ];

    const result = await optimizerService.minimizeTravelTime(
      items,
      defaultDay,
      defaultMode,
    );

    const order = result.orderedItems.map((i) => i.itemId);
    // A should be first (lowest sortOrder), then C (nearest to A), then B.
    expect(order).toEqual(['A', 'C', 'B']);
  });

  it('returns empty result for empty items list', async () => {
    const result = await optimizerService.minimizeTravelTime(
      [],
      defaultDay,
      defaultMode,
    );

    expect(result.orderedItems).toEqual([]);
    expect(result.droppedItems).toEqual([]);
    expect(result.legs).toEqual([]);
    expect(result.totalTravelMinutes).toBe(0);
  });
});
