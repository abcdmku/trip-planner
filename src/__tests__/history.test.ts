// ---------------------------------------------------------------------------
// Tests for src/services/history-service.ts
// ---------------------------------------------------------------------------

import { detectChanges, createHistoryEvent } from '@/services/history-service';
import type { Item } from '@/types/trip';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeItem(overrides: Partial<Item> = {}): Item {
  return {
    itemId: 'item-1',
    dayId: 'day-1',
    placeId: 'place-1',
    placeName: 'Test Place',
    lat: 40.7128,
    lng: -74.006,
    address: '123 Test St',
    type: 'attraction',
    scheduledStart: '2025-08-01T09:00:00',
    scheduledEnd: '2025-08-01T10:00:00',
    durationMinutes: 60,
    notesMd: '',
    photoUrls: [],
    availabilityWindows: '',
    isOptional: false,
    priority: 5,
    sortOrder: 0,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('detectChanges', () => {
  it('detects changed fields between two items', () => {
    const oldItem = makeItem({ placeName: 'Old Name', priority: 3 });
    const newItem = makeItem({ placeName: 'New Name', priority: 7 });

    const events = detectChanges(oldItem, newItem, 'user-1', 'Alice');

    expect(events.length).toBe(2);

    const changedFields = events.map((e) => e.field);
    expect(changedFields).toContain('placeName');
    expect(changedFields).toContain('priority');

    const nameEvent = events.find((e) => e.field === 'placeName')!;
    expect(nameEvent.oldValue).toBe('Old Name');
    expect(nameEvent.newValue).toBe('New Name');
    expect(nameEvent.itemId).toBe('item-1');
    expect(nameEvent.userId).toBe('user-1');
    expect(nameEvent.userName).toBe('Alice');
  });

  it('returns empty array for identical items', () => {
    const item = makeItem();
    const events = detectChanges(item, { ...item }, 'user-1', 'Alice');

    expect(events).toEqual([]);
  });
});

describe('createHistoryEvent', () => {
  it('generates a proper event with UUID and timestamp', () => {
    const event = createHistoryEvent(
      'placeName',
      'Old',
      'New',
      'item-1',
      'user-1',
      'Alice',
    );

    // UUID format: 8-4-4-4-12 hex digits
    expect(event.eventId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    );

    // Timestamp should be a valid ISO string close to now.
    const ts = new Date(event.timestamp);
    expect(ts.getTime()).not.toBeNaN();
    expect(Date.now() - ts.getTime()).toBeLessThan(5000); // within 5 seconds

    expect(event.field).toBe('placeName');
    expect(event.oldValue).toBe('Old');
    expect(event.newValue).toBe('New');
    expect(event.itemId).toBe('item-1');
    expect(event.userId).toBe('user-1');
    expect(event.userName).toBe('Alice');
  });
});
