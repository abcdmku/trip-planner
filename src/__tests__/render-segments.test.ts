import { buildTimelineRenderItemsByDay } from '@route-lib/trip-workspace/ui/timeline/vertical/render-segments';
import type { Day, Item } from '@/types/trip';

function makeDay(overrides: Partial<Day>): Day {
  return {
    dayId: overrides.dayId ?? 'day-1',
    date: overrides.date ?? '2026-05-12',
    label: overrides.label ?? 'Day 1',
    colorHex: overrides.colorHex ?? '#2563EB',
    dayStart: overrides.dayStart ?? '08:00',
    dayEnd: overrides.dayEnd ?? '22:00',
    timezone: overrides.timezone ?? 'America/Chicago',
  };
}

function makeItem(overrides: Partial<Item>): Item {
  return {
    itemId: overrides.itemId ?? 'item-1',
    dayId: overrides.dayId ?? 'day-1',
    placeId: overrides.placeId ?? 'place-1',
    placeName: overrides.placeName ?? 'Overnight Train',
    lat: overrides.lat ?? 0,
    lng: overrides.lng ?? 0,
    address: overrides.address ?? '',
    type: overrides.type ?? 'transport',
    scheduledStart: overrides.scheduledStart ?? '23:30',
    scheduledEnd: overrides.scheduledEnd ?? '02:30',
    durationMinutes: overrides.durationMinutes ?? 180,
    notesMd: overrides.notesMd ?? '',
    photoUrls: overrides.photoUrls ?? [],
    availabilityWindows: overrides.availabilityWindows ?? '[]',
    isOptional: overrides.isOptional ?? false,
    priority: overrides.priority ?? 0,
    sortOrder: overrides.sortOrder ?? 0,
    destLat: overrides.destLat ?? 0,
    destLng: overrides.destLng ?? 0,
    destName: overrides.destName ?? '',
    destAddress: overrides.destAddress ?? '',
    transportMode: overrides.transportMode ?? 'walking',
    itemRouteType: overrides.itemRouteType ?? 'directions',
    itemRoutePathEncoded: overrides.itemRoutePathEncoded ?? '',
    itemRouteDistanceMeters: overrides.itemRouteDistanceMeters ?? 0,
    itemRouteDurationMinutes: overrides.itemRouteDurationMinutes ?? 0,
    timelineLocked: overrides.timelineLocked ?? false,
    travelFromItemId: overrides.travelFromItemId ?? '',
    travelToItemId: overrides.travelToItemId ?? '',
  };
}

describe('buildTimelineRenderItemsByDay', () => {
  it('preserves same-timezone overnight rendering', () => {
    const days = [
      makeDay({ dayId: 'day-1', date: '2026-05-12' }),
      makeDay({ dayId: 'day-2', date: '2026-05-13' }),
    ];

    const byDay = buildTimelineRenderItemsByDay(days, [makeItem({ dayId: 'day-1' })]);

    expect(byDay.get('day-1')).toEqual([
      expect.objectContaining({
        scheduledStart: '23:30',
        scheduledEnd: '23:59',
        timelineLocked: true,
      }),
    ]);
    expect(byDay.get('day-2')).toEqual([
      expect.objectContaining({
        scheduledStart: '00:00',
        scheduledEnd: '02:30',
        timelineLocked: true,
      }),
    ]);
  });

  it('shifts the carryover segment into the target day timezone', () => {
    const days = [
      makeDay({ dayId: 'day-1', date: '2026-05-12', timezone: 'America/Chicago' }),
      makeDay({ dayId: 'day-2', date: '2026-05-13', timezone: 'America/New_York' }),
    ];

    const byDay = buildTimelineRenderItemsByDay(days, [
      makeItem({
        dayId: 'day-1',
        scheduledStart: '2026-05-12T23:30:00',
        scheduledEnd: '02:30',
      }),
    ]);

    expect(byDay.get('day-2')).toEqual([
      expect.objectContaining({
        scheduledStart: '00:30',
        scheduledEnd: '03:30',
      }),
    ]);
  });

  it('interprets local datetime strings in the source day timezone', () => {
    const days = [
      makeDay({ dayId: 'day-1', date: '2026-05-12', timezone: 'America/Chicago' }),
      makeDay({ dayId: 'day-2', date: '2026-05-13', timezone: 'America/New_York' }),
    ];

    const byDay = buildTimelineRenderItemsByDay(days, [
      makeItem({
        dayId: 'day-1',
        scheduledStart: '2026-05-12T23:30:00',
        scheduledEnd: '2026-05-13T02:30:00',
      }),
    ]);

    expect(byDay.get('day-2')).toEqual([
      expect.objectContaining({
        scheduledStart: '00:30',
        scheduledEnd: '03:30',
      }),
    ]);
  });

  it('keeps offset-aware timestamps absolute across day timezones', () => {
    const days = [
      makeDay({ dayId: 'day-1', date: '2026-05-12', timezone: 'America/Chicago' }),
      makeDay({ dayId: 'day-2', date: '2026-05-13', timezone: 'America/New_York' }),
    ];

    const byDay = buildTimelineRenderItemsByDay(days, [
      makeItem({
        dayId: 'day-1',
        scheduledStart: '2026-05-13T04:30:00.000Z',
        scheduledEnd: '2026-05-13T07:30:00.000Z',
      }),
    ]);

    expect(byDay.get('day-2')).toEqual([
      expect.objectContaining({
        scheduledStart: '00:30',
        scheduledEnd: '03:30',
      }),
    ]);
  });

  it('does not create a zero-length segment when an item ends at midnight', () => {
    const days = [
      makeDay({ dayId: 'day-1', date: '2026-05-12' }),
      makeDay({ dayId: 'day-2', date: '2026-05-13' }),
    ];

    const byDay = buildTimelineRenderItemsByDay(days, [
      makeItem({
        dayId: 'day-1',
        scheduledStart: '23:00',
        scheduledEnd: '00:00',
        durationMinutes: 60,
      }),
    ]);

    expect(byDay.get('day-1')).toHaveLength(1);
    expect(byDay.get('day-2')).toEqual([]);
  });
});
