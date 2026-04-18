// ---------------------------------------------------------------------------
// trip-store – TanStack Query cache helpers for normalized trip data.
//
// Instead of a separate global store (Zustand / Redux), we treat the React
// Query cache as the single source of truth and expose thin helpers that read
// and write into it.  Every mutation layer (useDays, useItems, ...) delegates
// here for optimistic updates so the patterns stay consistent.
// ---------------------------------------------------------------------------

import type { QueryClient } from '@tanstack/react-query';
import type { TripSnapshotResponse } from '@/types/api';
import type { Day, Item, Leg, Trip } from '@/types/trip';

// ---------------------------------------------------------------------------
// Query key factory
// ---------------------------------------------------------------------------

/**
 * Returns the canonical query key used by `useTrip` for a given trip.
 *
 * Keeping the key in one place guarantees that reads, optimistic writes, and
 * invalidations all target the same cache entry.
 */
export function getTripQueryKey(tripId: string): readonly [string, string] {
  return ['trip', tripId] as const;
}

// ---------------------------------------------------------------------------
// Invalidation
// ---------------------------------------------------------------------------

/**
 * Invalidate (mark stale) the trip query so it refetches from the sheet.
 */
export function invalidateTrip(
  queryClient: QueryClient,
  tripId: string,
): Promise<void> {
  return queryClient.invalidateQueries({
    queryKey: getTripQueryKey(tripId),
  });
}

// ---------------------------------------------------------------------------
// Optimistic update helpers
// ---------------------------------------------------------------------------

/**
 * Snapshot the current trip data, apply `updater` to the trip metadata, and
 * write the result back into the cache.
 *
 * Returns the previous snapshot so the caller can rollback on error.
 */
export function updateTripOptimistic(
  queryClient: QueryClient,
  tripId: string,
  updater: (trip: Trip) => Trip,
): TripSnapshotResponse | undefined {
  const queryKey = getTripQueryKey(tripId);
  const previous = queryClient.getQueryData<TripSnapshotResponse>(queryKey);

  if (previous) {
    queryClient.setQueryData<TripSnapshotResponse>(queryKey, {
      ...previous,
      trip: updater(previous.trip),
    });
  }

  return previous;
}

/**
 * Snapshot the current trip data, apply `updater` to the items array, and
 * write the result back into the cache.
 *
 * Returns the previous snapshot so the caller can rollback on error.
 */
export function updateItemsOptimistic(
  queryClient: QueryClient,
  tripId: string,
  updater: (items: Item[]) => Item[],
): TripSnapshotResponse | undefined {
  const queryKey = getTripQueryKey(tripId);
  const previous = queryClient.getQueryData<TripSnapshotResponse>(queryKey);

  if (previous) {
    queryClient.setQueryData<TripSnapshotResponse>(queryKey, {
      ...previous,
      items: updater(previous.items),
    });
  }

  return previous;
}

/**
 * Snapshot the current trip data, apply `updater` to the legs array, and
 * write the result back into the cache.
 *
 * Returns the previous snapshot so the caller can rollback on error.
 */
export function updateLegsOptimistic(
  queryClient: QueryClient,
  tripId: string,
  updater: (legs: Leg[]) => Leg[],
): TripSnapshotResponse | undefined {
  const queryKey = getTripQueryKey(tripId);
  const previous = queryClient.getQueryData<TripSnapshotResponse>(queryKey);

  if (previous) {
    queryClient.setQueryData<TripSnapshotResponse>(queryKey, {
      ...previous,
      legs: updater(previous.legs),
    });
  }

  return previous;
}

/**
 * Snapshot the current trip data, apply `updater` to the days array, and
 * write the result back into the cache.
 *
 * Returns the previous snapshot so the caller can rollback on error.
 */
export function updateDaysOptimistic(
  queryClient: QueryClient,
  tripId: string,
  updater: (days: Day[]) => Day[],
): TripSnapshotResponse | undefined {
  const queryKey = getTripQueryKey(tripId);
  const previous = queryClient.getQueryData<TripSnapshotResponse>(queryKey);

  if (previous) {
    queryClient.setQueryData<TripSnapshotResponse>(queryKey, {
      ...previous,
      days: updater(previous.days),
    });
  }

  return previous;
}
