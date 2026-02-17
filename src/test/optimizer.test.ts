import { describe, expect, it } from 'vitest';
import { OptimizerService } from '../services/optimizer/OptimizerService';
import type { ItineraryItem, TripDay } from '../types/domain';

const day: TripDay = {
  dayId: 'day1',
  date: '2026-02-17',
  label: 'Day 1',
  colorHex: '#1d4ed8',
  dayStart: '08:00',
  dayEnd: '20:00'
};

function makeItem(overrides: Partial<ItineraryItem>): ItineraryItem {
  return {
    itemId: 'item',
    dayId: 'day1',
    sortOrder: 1,
    type: 'poi',
    tags: [],
    title: 'Test stop',
    sourceKind: 'manual',
    lat: 37.78,
    lng: -122.4,
    startTime: '09:00',
    endTime: '10:00',
    durationMin: 60,
    notesMd: '',
    photoUrls: [],
    mode: 'DRIVING',
    isOptional: false,
    priority: 50,
    ...overrides
  };
}

describe('OptimizerService', () => {
  it('drops optional stops outside availability in maximize mode', () => {
    const service = new OptimizerService();

    const required = makeItem({
      itemId: 'required',
      title: 'Required',
      sortOrder: 1,
      priority: 90,
      isOptional: false,
      availabilityStart: '09:00',
      availabilityEnd: '18:00'
    });

    const optional = makeItem({
      itemId: 'optional',
      title: 'Optional',
      sortOrder: 2,
      isOptional: true,
      priority: 40,
      availabilityStart: '06:00',
      availabilityEnd: '06:30'
    });

    const result = service.optimizeDay([required, optional], day, 'maximize_available_activities');

    expect(result.orderedItems.some((item) => item.itemId === 'required')).toBe(true);
    expect(result.droppedOptionalItemIds).toContain('optional');
  });

  it('is deterministic for minimize travel mode', () => {
    const service = new OptimizerService();

    const items = [
      makeItem({ itemId: 'a', title: 'A', sortOrder: 1, lat: 37.78, lng: -122.4 }),
      makeItem({ itemId: 'b', title: 'B', sortOrder: 2, lat: 37.8, lng: -122.45 }),
      makeItem({ itemId: 'c', title: 'C', sortOrder: 3, lat: 37.79, lng: -122.41 })
    ];

    const firstRun = service.optimizeDay(items, day, 'minimize_travel_time').orderedItems.map((item) => item.itemId);
    const secondRun = service.optimizeDay(items, day, 'minimize_travel_time').orderedItems.map((item) => item.itemId);

    expect(firstRun).toEqual(secondRun);
  });
});
