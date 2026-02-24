// ---------------------------------------------------------------------------
// useDays – TanStack Query hooks for Day CRUD operations.
//
// Each mutation performs an optimistic cache update, persists to Google Sheets,
// and invalidates the trip query on success (or rolls back on error).
// ---------------------------------------------------------------------------

import { useMemo } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTrip } from '@/hooks/useTrip';
import { useUndoRedo } from '@/hooks/useUndoRedo';
import { saveDays, saveItems, saveLegs } from '@/services/sheets-repository';
import {
  updateDaysOptimistic,
  invalidateTrip,
  getTripQueryKey,
} from '@/stores/trip-store';
import type { Day, TripData } from '@/types/trip';

// ---------------------------------------------------------------------------
// Read hook
// ---------------------------------------------------------------------------

/**
 * Returns the `days` array for the given spreadsheet, derived from `useTrip`.
 */
export function useDays(spreadsheetId: string | null | undefined) {
  const { days, isLoading, error } = useTrip(spreadsheetId);
  return { days, isLoading, error };
}

// ---------------------------------------------------------------------------
// Mutation hooks
// ---------------------------------------------------------------------------

/**
 * Mutation that appends a new Day to the sheet.
 *
 * The caller must supply a fully-formed `Day` object (with a generated
 * `dayId`). The mutation optimistically prepends the day to the cache,
 * persists the full days array to Google Sheets, and then invalidates.
 */
export function useAddDay(spreadsheetId: string) {
  const queryClient = useQueryClient();
  const { recordMutation } = useUndoRedo(spreadsheetId);

  return useMutation<void, Error, Day, TripData | undefined>({
    mutationFn: async (newDay) => {
      const queryKey = getTripQueryKey(spreadsheetId);
      const current = queryClient.getQueryData<TripData>(queryKey);
      // onMutate adds optimistically, so remove any prior copy first.
      const existingDays = (current?.days ?? []).filter(
        (day) => day.dayId !== newDay.dayId,
      );
      const updatedDays = [...existingDays, newDay];
      await saveDays(spreadsheetId, updatedDays);
    },

    onMutate: async (newDay) => {
      // Cancel any in-flight refetches so they don't overwrite optimistic data.
      await queryClient.cancelQueries({
        queryKey: getTripQueryKey(spreadsheetId),
      });

      const previous = updateDaysOptimistic(queryClient, spreadsheetId, (days) => [
        ...days,
        newDay,
      ]);

      return previous;
    },

    onError: (_err, _newDay, previous) => {
      // Rollback to the snapshot taken in onMutate.
      if (previous) {
        queryClient.setQueryData(getTripQueryKey(spreadsheetId), previous);
      }
    },

    onSuccess: (_data, _newDay, previous) => {
      recordMutation(previous);
    },

    onSettled: () => {
      void invalidateTrip(queryClient, spreadsheetId);
    },
  });
}

/**
 * Mutation that updates an existing Day in-place.
 *
 * The caller supplies the full updated `Day` object.  The hook matches by
 * `dayId` and replaces it in the cache optimistically.
 */
export function useUpdateDay(spreadsheetId: string) {
  const queryClient = useQueryClient();
  const { recordMutation } = useUndoRedo(spreadsheetId);

  return useMutation<void, Error, Day, TripData | undefined>({
    mutationFn: async (updatedDay) => {
      const queryKey = getTripQueryKey(spreadsheetId);
      const current = queryClient.getQueryData<TripData>(queryKey);
      const updatedDays = (current?.days ?? []).map((d) =>
        d.dayId === updatedDay.dayId ? updatedDay : d,
      );
      await saveDays(spreadsheetId, updatedDays);
    },

    onMutate: async (updatedDay) => {
      await queryClient.cancelQueries({
        queryKey: getTripQueryKey(spreadsheetId),
      });

      const previous = updateDaysOptimistic(queryClient, spreadsheetId, (days) =>
        days.map((d) => (d.dayId === updatedDay.dayId ? updatedDay : d)),
      );

      return previous;
    },

    onError: (_err, _updatedDay, previous) => {
      if (previous) {
        queryClient.setQueryData(getTripQueryKey(spreadsheetId), previous);
      }
    },

    onSuccess: (_data, _updatedDay, previous) => {
      recordMutation(previous);
    },

    onSettled: () => {
      void invalidateTrip(queryClient, spreadsheetId);
    },
  });
}

/**
 * Mutation that removes a Day by `dayId`, along with items/legs tied to it.
 */
export function useDeleteDay(spreadsheetId: string) {
  const queryClient = useQueryClient();
  const { recordMutation } = useUndoRedo(spreadsheetId);

  return useMutation<void, Error, string, TripData | undefined>({
    mutationFn: async (dayId) => {
      const queryKey = getTripQueryKey(spreadsheetId);
      const current = queryClient.getQueryData<TripData>(queryKey);
      const days = current?.days ?? [];
      const items = current?.items ?? [];
      const legs = current?.legs ?? [];

      const removedItemIds = new Set(
        items
          .filter((item) => item.dayId === dayId)
          .map((item) => item.itemId),
      );

      const updatedDays = days.filter((d) => d.dayId !== dayId);
      const updatedItems = items.filter((item) => item.dayId !== dayId);
      const updatedLegs = legs.filter(
        (leg) =>
          !removedItemIds.has(leg.fromItemId) && !removedItemIds.has(leg.toItemId),
      );

      await Promise.all([
        saveDays(spreadsheetId, updatedDays),
        saveItems(spreadsheetId, updatedItems),
        saveLegs(spreadsheetId, updatedLegs),
      ]);
    },

    onMutate: async (dayId) => {
      await queryClient.cancelQueries({
        queryKey: getTripQueryKey(spreadsheetId),
      });

      const queryKey = getTripQueryKey(spreadsheetId);
      const previous = queryClient.getQueryData<TripData>(queryKey);

      if (previous) {
        const removedItemIds = new Set(
          previous.items
            .filter((item) => item.dayId === dayId)
            .map((item) => item.itemId),
        );

        queryClient.setQueryData<TripData>(queryKey, {
          ...previous,
          days: previous.days.filter((d) => d.dayId !== dayId),
          items: previous.items.filter((item) => item.dayId !== dayId),
          legs: previous.legs.filter(
            (leg) =>
              !removedItemIds.has(leg.fromItemId) &&
              !removedItemIds.has(leg.toItemId),
          ),
        });
      }

      return previous;
    },

    onError: (_err, _dayId, previous) => {
      if (previous) {
        queryClient.setQueryData(getTripQueryKey(spreadsheetId), previous);
      }
    },

    onSuccess: (_data, _dayId, previous) => {
      recordMutation(previous);
    },

    onSettled: () => {
      void invalidateTrip(queryClient, spreadsheetId);
    },
  });
}

// ---------------------------------------------------------------------------
// Convenience: sorted days
// ---------------------------------------------------------------------------

/**
 * Returns days sorted by date, useful for UI rendering.
 */
export function useSortedDays(spreadsheetId: string | null | undefined) {
  const { days, isLoading, error } = useDays(spreadsheetId);

  const sorted = useMemo(
    () => [...days].sort((a, b) => a.date.localeCompare(b.date)),
    [days],
  );

  return { days: sorted, isLoading, error };
}
