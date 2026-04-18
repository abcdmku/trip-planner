import { useMemo } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTrip } from '@/hooks/useTrip';
import { useUndoRedo } from '@/hooks/useUndoRedo';
import { createDayRecord, deleteDayRecord, updateDayRecord } from '@/services/api-client';
import {
  getTripQueryKey,
  updateDaysOptimistic,
} from '@/stores/trip-store';
import type { Day } from '@/types/trip';
import type { TripSnapshotResponse } from '@/types/api';

export function useDays(tripId: string | null | undefined) {
  const { days, isLoading, error } = useTrip(tripId);
  return { days, isLoading, error };
}

export function useAddDay(tripId: string) {
  const queryClient = useQueryClient();
  const { recordMutation } = useUndoRedo(tripId);

  return useMutation<Day, Error, Day, TripSnapshotResponse | undefined>({
    mutationFn: async (newDay) => createDayRecord(tripId, newDay),

    onMutate: async (newDay) => {
      await queryClient.cancelQueries({ queryKey: getTripQueryKey(tripId) });
      return updateDaysOptimistic(queryClient, tripId, (days) => [...days, newDay]);
    },

    onError: () => {
      void queryClient.invalidateQueries({ queryKey: getTripQueryKey(tripId) });
    },

    onSuccess: (savedDay, _payload, previous) => {
      recordMutation(previous);
      queryClient.setQueryData<TripSnapshotResponse | undefined>(
        getTripQueryKey(tripId),
        (current) =>
          current
            ? {
                ...current,
                days: [...current.days.filter((day) => day.dayId !== savedDay.dayId), savedDay].sort((a, b) =>
                  a.date.localeCompare(b.date),
                ),
              }
            : current,
      );
    },
  });
}

export function useUpdateDay(tripId: string) {
  const queryClient = useQueryClient();
  const { recordMutation } = useUndoRedo(tripId);

  return useMutation<Day, Error, Day, TripSnapshotResponse | undefined>({
    mutationFn: async (updatedDay) => updateDayRecord(tripId, updatedDay),

    onMutate: async (updatedDay) => {
      await queryClient.cancelQueries({ queryKey: getTripQueryKey(tripId) });
      return updateDaysOptimistic(queryClient, tripId, (days) =>
        days.map((day) => (day.dayId === updatedDay.dayId ? updatedDay : day)),
      );
    },

    onError: () => {
      void queryClient.invalidateQueries({ queryKey: getTripQueryKey(tripId) });
    },

    onSuccess: (savedDay, _payload, previous) => {
      recordMutation(previous);
      queryClient.setQueryData<TripSnapshotResponse | undefined>(
        getTripQueryKey(tripId),
        (current) =>
          current
            ? {
                ...current,
                days: current.days.map((day) => (day.dayId === savedDay.dayId ? savedDay : day)),
              }
            : current,
      );
    },
  });
}

export function useDeleteDay(tripId: string) {
  const queryClient = useQueryClient();
  const { recordMutation } = useUndoRedo(tripId);

  return useMutation<void, Error, string, TripSnapshotResponse | undefined>({
    mutationFn: async (dayId) => deleteDayRecord(tripId, dayId),

    onMutate: async (dayId) => {
      await queryClient.cancelQueries({ queryKey: getTripQueryKey(tripId) });
      const queryKey = getTripQueryKey(tripId);
      const previous = queryClient.getQueryData<TripSnapshotResponse>(queryKey);

      if (previous) {
        const removedItemIds = new Set(
          previous.items.filter((item) => item.dayId === dayId).map((item) => item.itemId),
        );

        queryClient.setQueryData<TripSnapshotResponse>(queryKey, {
          ...previous,
          days: previous.days.filter((day) => day.dayId !== dayId),
          items: previous.items.filter((item) => item.dayId !== dayId),
          legs: previous.legs.filter(
            (leg) => !removedItemIds.has(leg.fromItemId) && !removedItemIds.has(leg.toItemId),
          ),
        });
      }

      return previous;
    },

    onError: () => {
      void queryClient.invalidateQueries({ queryKey: getTripQueryKey(tripId) });
    },

    onSuccess: (_data, _payload, previous) => {
      recordMutation(previous);
    },
  });
}

export function useSortedDays(tripId: string | null | undefined) {
  const { days, isLoading, error } = useDays(tripId);

  const sorted = useMemo(
    () => [...days].sort((a, b) => a.date.localeCompare(b.date)),
    [days],
  );

  return { days: sorted, isLoading, error };
}
