import { render, screen } from '@testing-library/react';
import { MapInfoCard } from '@component-lib/map/MapInfoCard';
import type { Day, Item } from '@/types/trip';
import type { PlaceSearchResult } from '@/services/maps-repository';

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

function createPlace(overrides: Partial<PlaceSearchResult> = {}): PlaceSearchResult {
  return {
    placeId: 'place-1',
    name: 'Museum',
    address: '1 Main St',
    lat: 1,
    lng: 1,
    types: ['museum'],
    weekdayText: ['Monday: 10:00 AM - 5:00 PM'],
    ...overrides,
  };
}

describe('MapInfoCard', () => {
  it('shows selected-day time and hours using the selected day timezone label', () => {
    const selectedDay: Day = {
      dayId: 'day-2',
      date: '2026-05-13',
      label: 'Day 2',
      colorHex: '#16A34A',
      dayStart: '08:00',
      dayEnd: '22:00',
      timezone: 'America/New_York',
    };

    render(
      <MapInfoCard
        item={createItem({
          placeName: 'Overnight Train',
          scheduledStart: '23:30',
          scheduledEnd: '23:59',
          durationMinutes: 180,
          type: 'transport',
        })}
        displayItem={createItem({
          placeName: 'Overnight Train',
          scheduledStart: '00:30',
          scheduledEnd: '03:30',
          durationMinutes: 180,
          type: 'transport',
        })}
        day={selectedDay}
        place={createPlace()}
        isLoading={false}
        error={null}
        onClose={() => undefined}
      />,
    );

    expect(screen.getByText('12:30 AM - 3:30 AM')).toBeTruthy();
    expect(screen.getByText('EDT')).toBeTruthy();
    expect(screen.getByText('Hours of operation - EDT')).toBeTruthy();
    expect(screen.getByText('Monday: 10:00 AM - 5:00 PM')).toBeTruthy();
  });
});
