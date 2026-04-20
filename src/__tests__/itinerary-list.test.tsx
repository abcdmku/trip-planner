import { render, screen } from '@testing-library/react';
import { ItineraryList } from '@route-lib/trip-workspace/ui/items/ItineraryList';
import type { Day, Item } from '@/types/trip';

function createDay(overrides: Partial<Day>): Day {
  return {
    dayId: 'day-1',
    date: '2026-05-12',
    label: 'Day 1',
    colorHex: '#2563EB',
    dayStart: '08:00',
    dayEnd: '22:00',
    timezone: 'America/Chicago',
    ...overrides,
  };
}

function createItem(overrides: Partial<Item> = {}): Item {
  return {
    itemId: 'item-1',
    dayId: 'day-1',
    placeId: 'place-1',
    placeName: 'Museum',
    lat: 1,
    lng: 1,
    address: '1 Main St',
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
    itemRoutePathEncoded: '',
    itemRouteDistanceMeters: 0,
    itemRouteDurationMinutes: 0,
    timelineLocked: false,
    travelFromItemId: '',
    travelToItemId: '',
    ...overrides,
  };
}

describe('ItineraryList', () => {
  it('shows the selected day timezone once for the list and uses converted display times on cards', () => {
    const dayOne = createDay({});
    const dayTwo = createDay({
      dayId: 'day-2',
      date: '2026-05-13',
      label: 'Day 2',
      colorHex: '#16A34A',
      timezone: 'America/New_York',
    });
    const baseItem = createItem({
      itemId: 'item-overnight',
      placeName: 'Overnight Train',
      scheduledStart: '23:30',
      scheduledEnd: '23:59',
      durationMinutes: 180,
    });

    render(
      <ItineraryList
        items={[baseItem]}
        days={[dayOne, dayTwo]}
        selectedDayId={dayTwo.dayId}
        displayItemsById={
          new Map([
            [
              baseItem.itemId,
              createItem({
                itemId: baseItem.itemId,
                dayId: dayTwo.dayId,
                placeName: baseItem.placeName,
                scheduledStart: '00:30',
                scheduledEnd: '03:30',
                durationMinutes: baseItem.durationMinutes,
              }),
            ],
          ])
        }
      />,
    );

    expect(screen.getByText('Times shown in EDT')).toBeTruthy();
    expect(screen.getByText('12:30a - 3:30a')).toBeTruthy();
    expect(screen.queryByText('12:30a - 3:30a EDT')).toBeNull();
  });
});
