import type { ReactNode } from 'react';
import { renderHook, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useRecalculateLegs } from '@/hooks/useLegs';
import { useUpdateItem } from '@/hooks/useItems';
import { useDeleteItem } from '@/hooks/useItems';
import { useTrip } from '@/hooks/useTrip';
import { getTripQueryKey } from '@/stores/trip-store';
import type { TripSnapshotResponse } from '@/types/api';
import type { Item, Leg } from '@/types/trip';

const updateItemRecordMock = vi.fn();
const replaceTripLegsMock = vi.fn();
const deleteItemRecordMock = vi.fn();
const getTripSnapshotMock = vi.fn();

vi.mock('@/services/api-client', async () => {
  const actual = await vi.importActual<typeof import('@/services/api-client')>('@/services/api-client');
  return {
    ...actual,
    getTripSnapshot: (...args: Parameters<typeof actual.getTripSnapshot>) => getTripSnapshotMock(...args),
    updateItemRecord: (...args: Parameters<typeof actual.updateItemRecord>) => updateItemRecordMock(...args),
    deleteItemRecord: (...args: Parameters<typeof actual.deleteItemRecord>) => deleteItemRecordMock(...args),
    replaceTripLegs: (...args: Parameters<typeof actual.replaceTripLegs>) => replaceTripLegsMock(...args),
  };
});

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    isAuthenticated: true,
  }),
}));

vi.mock('@/contexts/RealtimeContext', () => ({
  useRealtime: () => ({
    subscribeToTrip: vi.fn(),
    unsubscribeFromTrip: vi.fn(),
  }),
}));

vi.mock('@/hooks/useUndoRedo', () => ({
  useUndoRedo: () => ({
    recordMutation: vi.fn(),
    ensureSynced: vi.fn(),
    undo: vi.fn(),
    redo: vi.fn(),
    canUndo: () => true,
    canRedo: () => true,
  }),
}));

vi.mock('@/services/maps-repository', () => ({
  mapsRepository: {
    calculateLeg: vi.fn(),
    calculateStraightLeg: vi.fn(),
  },
}));

function createSnapshot(items: Item[], legs: Leg[] = []): TripSnapshotResponse {
  return {
    trip: {
      id: 'trip-1',
      name: 'Trip',
      baseTimezone: 'UTC',
      startDate: '2026-01-01',
      endDate: '2026-01-02',
      defaultMode: 'driving',
      startLat: 0,
      startLng: 0,
      startName: '',
      startAddress: '',
      version: 1,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
      updatedByUserId: 'user-1',
    },
    days: [
      {
        dayId: 'day-1',
        date: '2026-01-01',
        label: 'Day 1',
        colorHex: '#3B82F6',
        dayStart: '08:00',
        dayEnd: '22:00',
        version: 1,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
        updatedByUserId: 'user-1',
      },
    ],
    items,
    legs,
    history: [],
    members: [],
    pendingInvites: [],
    meta: {},
  };
}

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

describe('useUpdateItem', () => {
  beforeEach(() => {
    updateItemRecordMock.mockReset();
    replaceTripLegsMock.mockReset();
    deleteItemRecordMock.mockReset();
    getTripSnapshotMock.mockReset();
  });

  it('does not restore a deleted item when a stale in-flight update fails', async () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    const item = createItem();
    queryClient.setQueryData(getTripQueryKey('trip-1'), createSnapshot([item]));

    let rejectUpdate!: (error: Error) => void;
    updateItemRecordMock.mockReturnValue(
      new Promise<Item>((_resolve, reject) => {
        rejectUpdate = reject;
      }),
    );

    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(() => useUpdateItem('trip-1'), { wrapper });
    const updatedItem = createItem({ placeName: 'Updated Museum' });

    let mutationPromise: Promise<unknown> | null = null;
    await act(async () => {
      mutationPromise = result.current.mutateAsync(updatedItem).catch(() => undefined);
    });

    await waitFor(() => {
      const current = queryClient.getQueryData<TripSnapshotResponse>(getTripQueryKey('trip-1'));
      expect(current?.items[0]?.placeName).toBe('Updated Museum');
    });

    await act(async () => {
      queryClient.setQueryData<TripSnapshotResponse>(getTripQueryKey('trip-1'), (current) =>
        current
          ? {
              ...current,
              items: [],
            }
          : current,
      );
    });

    await act(async () => {
      rejectUpdate(new Error('Item not found'));
    });

    await act(async () => {
      await mutationPromise;
    });

    await waitFor(() => {
      const current = queryClient.getQueryData<TripSnapshotResponse>(getTripQueryKey('trip-1'));
      expect(current?.items).toHaveLength(0);
    });
  });

  it('does not restore a deleted item when a stale leg recalculation fails', async () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    const firstItem = createItem({ itemId: 'item-1', lat: 0, lng: 0, placeName: 'Museum' });
    const secondItem = createItem({
      itemId: 'item-2',
      lat: 0,
      lng: 0,
      placeName: 'Lunch',
      scheduledStart: '11:00',
      scheduledEnd: '12:00',
      sortOrder: 1,
    });
    queryClient.setQueryData(getTripQueryKey('trip-1'), createSnapshot([firstItem, secondItem]));

    let rejectRecalculation!: (error: Error) => void;
    replaceTripLegsMock.mockReturnValue(
      new Promise<Leg[]>((_resolve, reject) => {
        rejectRecalculation = reject;
      }),
    );

    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(() => useRecalculateLegs('trip-1'), { wrapper });

    let mutationPromise: Promise<unknown> | null = null;
    await act(async () => {
      mutationPromise = result.current
        .mutateAsync({
          items: [firstItem, secondItem],
          defaultMode: 'walking',
        })
        .catch(() => undefined);
    });

    await act(async () => {
      queryClient.setQueryData<TripSnapshotResponse>(getTripQueryKey('trip-1'), (current) =>
        current
          ? {
              ...current,
              items: current.items.filter((item) => item.itemId !== firstItem.itemId),
            }
          : current,
      );
    });

    await act(async () => {
      rejectRecalculation(new Error('Routing failed'));
    });

    await act(async () => {
      await mutationPromise;
    });

    await waitFor(() => {
      const current = queryClient.getQueryData<TripSnapshotResponse>(getTripQueryKey('trip-1'));
      expect(current?.items.map((item) => item.itemId)).toEqual(['item-2']);
    });
  });

  it('does not restore a deleted item when an in-flight trip refetch resolves stale data', async () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    const item = createItem();
    const initialSnapshot = createSnapshot([item]);
    getTripSnapshotMock.mockResolvedValueOnce(initialSnapshot);
    deleteItemRecordMock.mockResolvedValue(undefined);

    let resolveStaleFetch: (() => void) | null = null;
    let staleFetchAborted = false;
    getTripSnapshotMock.mockImplementationOnce((_tripId: string, signal?: AbortSignal) => {
      return new Promise<TripSnapshotResponse>((resolve, reject) => {
        let settled = false;
        const onAbort = () => {
          if (settled) return;
          settled = true;
          staleFetchAborted = true;
          signal?.removeEventListener('abort', onAbort);
          const error = new Error('Aborted');
          error.name = 'AbortError';
          reject(error);
        };

        if (signal?.aborted) {
          onAbort();
          return;
        }

        signal?.addEventListener('abort', onAbort, { once: true });
        resolveStaleFetch = () => {
          if (settled) return;
          settled = true;
          signal?.removeEventListener('abort', onAbort);
          resolve(initialSnapshot);
        };
      });
    });

    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(
      () => ({
        trip: useTrip('trip-1'),
        deleteItem: useDeleteItem('trip-1'),
      }),
      { wrapper },
    );

    await waitFor(() => {
      expect(result.current.trip.items).toHaveLength(1);
    });

    await act(async () => {
      void result.current.trip.refetch();
    });

    await waitFor(() => {
      expect(getTripSnapshotMock).toHaveBeenCalledTimes(2);
    });

    await act(async () => {
      await result.current.deleteItem.mutateAsync('item-1');
    });

    await waitFor(() => {
      expect(staleFetchAborted).toBe(true);
    });

    resolveStaleFetch?.();

    await waitFor(() => {
      const current = queryClient.getQueryData<TripSnapshotResponse>(getTripQueryKey('trip-1'));
      expect(current?.items).toHaveLength(0);
    });
  });
});
