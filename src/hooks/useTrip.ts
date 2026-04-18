import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { useRealtime } from '@/contexts/RealtimeContext';
import { useUndoRedo } from '@/hooks/useUndoRedo';
import { getTripSnapshot, updateTripRecord } from '@/services/api-client';
import type { Trip, TripData } from '@/types/trip';
import type { TripSnapshotResponse } from '@/types/api';
import {
  getTripQueryKey,
  updateTripOptimistic,
} from '@/stores/trip-store';

export function useTrip(tripId: string | null | undefined) {
  const { isAuthenticated } = useAuth();
  const { subscribeToTrip, unsubscribeFromTrip } = useRealtime();

  const enabled = Boolean(tripId && isAuthenticated);

  const query = useQuery<TripSnapshotResponse, Error>({
    queryKey: tripId ? getTripQueryKey(tripId) : ['trip', 'disabled'],
    queryFn: ({ signal }) => {
      if (!tripId) throw new Error('tripId is required');
      return getTripSnapshot(tripId, signal);
    },
    enabled,
    staleTime: 1000 * 15,
    refetchOnWindowFocus: true,
  });

  useEffect(() => {
    if (!enabled || !tripId) return;
    subscribeToTrip(tripId);
    return () => unsubscribeFromTrip(tripId);
  }, [enabled, subscribeToTrip, tripId, unsubscribeFromTrip]);

  const snapshot = query.data;
  const coreData: TripData | null = snapshot
    ? {
        trip: snapshot.trip,
        days: snapshot.days,
        items: snapshot.items,
        legs: snapshot.legs,
        history: snapshot.history,
        meta: snapshot.meta,
      }
    : null;

  return {
    trip: snapshot?.trip ?? null,
    days: snapshot?.days ?? [],
    items: snapshot?.items ?? [],
    legs: snapshot?.legs ?? [],
    history: snapshot?.history ?? [],
    meta: snapshot?.meta ?? {},
    members: snapshot?.members ?? [],
    pendingInvites: snapshot?.pendingInvites ?? [],
    data: coreData,
    snapshot,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    error: query.error,
    refetch: query.refetch,
  };
}

export function useUpdateTrip(tripId: string) {
  const queryClient = useQueryClient();
  const { recordMutation } = useUndoRedo(tripId);

  return useMutation<Trip, Error, Trip, TripSnapshotResponse | undefined>({
    mutationFn: async (updatedTrip) => updateTripRecord(tripId, updatedTrip),

    onMutate: async (updatedTrip) => {
      await queryClient.cancelQueries({
        queryKey: getTripQueryKey(tripId),
      });

      const previous = updateTripOptimistic(
        queryClient,
        tripId,
        () => updatedTrip,
      );

      return previous;
    },

    onError: () => {
      void queryClient.invalidateQueries({ queryKey: getTripQueryKey(tripId) });
    },

    onSuccess: (savedTrip, _payload, previous) => {
      recordMutation(previous);
      queryClient.setQueryData<TripSnapshotResponse | undefined>(
        getTripQueryKey(tripId),
        (current) =>
          current
            ? {
                ...current,
                trip: savedTrip,
              }
            : current,
      );
    },
  });
}
