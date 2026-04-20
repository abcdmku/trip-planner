import type { Day, Item, Leg, Trip } from '@/types/trip';
import type { PlaceSearchResult } from '@/services/maps-repository';

let fixtureSequence = 0;

function nextId(prefix: string): string {
  fixtureSequence += 1;
  return `${prefix}-${fixtureSequence}`;
}

export function createTripFixture(overrides: Partial<Trip> = {}): Trip {
  return {
    id: overrides.id ?? nextId('trip'),
    name: 'Spring in Chicago',
    baseTimezone: 'America/Chicago',
    startDate: '2026-05-12',
    endDate: '2026-05-16',
    defaultMode: 'walking',
    startLat: 41.8781,
    startLng: -87.6298,
    startName: 'Chicago Union Station',
    startAddress: '225 S Canal St, Chicago, IL 60606',
    ...overrides,
  };
}

export function createDayFixture(overrides: Partial<Day> = {}): Day {
  return {
    dayId: overrides.dayId ?? nextId('day'),
    date: '2026-05-12',
    label: 'Arrival Day',
    colorHex: '#F59E0B',
    dayStart: '08:00',
    dayEnd: '22:00',
    timezone: 'America/Chicago',
    ...overrides,
  };
}

export function createItemFixture(overrides: Partial<Item> = {}): Item {
  return {
    itemId: overrides.itemId ?? nextId('item'),
    dayId: overrides.dayId ?? 'day-1',
    placeId: overrides.placeId ?? 'place-art-museum',
    placeName: 'Art Institute of Chicago',
    lat: 41.8796,
    lng: -87.6237,
    address: '111 S Michigan Ave, Chicago, IL 60603',
    type: 'attraction',
    scheduledStart: '09:00',
    scheduledEnd: '11:00',
    durationMinutes: 120,
    notesMd: 'Buy tickets ahead of time.',
    photoUrls: [
      'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=1200&q=80',
    ],
    availabilityWindows: '[]',
    isOptional: false,
    priority: 2,
    sortOrder: 0,
    destLat: 0,
    destLng: 0,
    destName: '',
    destAddress: '',
    transportMode: 'walking',
    itemRouteType: 'straight',
    itemRoutePathEncoded: '',
    itemRouteDistanceMeters: 0,
    itemRouteDurationMinutes: 0,
    timelineLocked: false,
    travelFromItemId: '',
    travelToItemId: '',
    ...overrides,
  };
}

export function createLegFixture(overrides: Partial<Leg> = {}): Leg {
  return {
    legId: overrides.legId ?? nextId('leg'),
    fromItemId: overrides.fromItemId ?? 'item-1',
    toItemId: overrides.toItemId ?? 'item-2',
    mode: 'walking',
    departure: '2026-05-12T14:00:00.000Z',
    arrival: '2026-05-12T14:18:00.000Z',
    durationMinutes: 18,
    distanceMeters: 1400,
    routePathEncoded: '',
    routeType: 'directions',
    ...overrides,
  };
}

export function createPlaceSearchResultFixture(
  overrides: Partial<PlaceSearchResult> = {},
): PlaceSearchResult {
  return {
    placeId: overrides.placeId ?? nextId('place'),
    name: 'Chicago Cultural Center',
    address: '78 E Washington St, Chicago, IL 60602',
    lat: 41.8838,
    lng: -87.6242,
    types: ['tourist_attraction', 'museum'],
    photoUrls: [],
    mapsAvailabilityWindows: [],
    ...overrides,
  };
}
