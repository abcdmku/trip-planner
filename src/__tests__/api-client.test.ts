import { createItemRecord, deleteItemRecord, getSession } from '@/services/api-client';
import type { Item } from '@/types/trip';

function createItem(overrides?: Partial<Item>): Item {
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

describe('api-client request headers', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('does not send application/json for bodiless deletes', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(null, { status: 204 }));

    await deleteItemRecord('trip-1', 'item-1');

    const headers = new Headers(fetchMock.mock.calls[0]?.[1]?.headers);
    expect(headers.has('Content-Type')).toBe(false);
  });

  it('does not send application/json for bodiless gets', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response(JSON.stringify({ user: null }), { status: 200, headers: { 'Content-Type': 'application/json' } }));

    await getSession();

    const headers = new Headers(fetchMock.mock.calls[0]?.[1]?.headers);
    expect(headers.has('Content-Type')).toBe(false);
  });

  it('sends application/json when a JSON body is present', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify(createItem()), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    await createItemRecord('trip-1', createItem());

    const headers = new Headers(fetchMock.mock.calls[0]?.[1]?.headers);
    expect(headers.get('Content-Type')).toBe('application/json');
  });
});
