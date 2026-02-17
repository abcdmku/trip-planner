// ---------------------------------------------------------------------------
// useHistory – TanStack Query hooks for reading and appending history events.
// ---------------------------------------------------------------------------

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTrip } from '@/hooks/useTrip';
import { appendHistory as appendHistoryToSheet } from '@/services/sheets-repository';
import { invalidateTrip, getTripQueryKey } from '@/stores/trip-store';
import type { HistoryEvent, TripData } from '@/types/trip';

// ---------------------------------------------------------------------------
// Read hook
// ---------------------------------------------------------------------------

/**
 * Returns the history events for the given spreadsheet, derived from `useTrip`.
 *
 * Events are returned in the order stored in the sheet (chronological by
 * convention).
 */
export function useHistory(spreadsheetId: string | null | undefined) {
  const { history, isLoading, error } = useTrip(spreadsheetId);
  return { history, isLoading, error };
}

// ---------------------------------------------------------------------------
// Append mutation
// ---------------------------------------------------------------------------

/**
 * Mutation that appends one or more `HistoryEvent`s to the History tab.
 *
 * This is a fire-and-forget append -- it writes to the sheet and then
 * invalidates the trip query so the local cache picks up the new events.
 *
 * An optimistic update pushes the events into the cached `history` array
 * immediately so that the UI can reflect the change without waiting for a
 * full refetch.
 */
export function useAppendHistory(spreadsheetId: string) {
  const queryClient = useQueryClient();

  return useMutation<void, Error, HistoryEvent[], TripData | undefined>({
    mutationFn: async (events) => {
      await appendHistoryToSheet(spreadsheetId, events);
    },

    onMutate: async (events) => {
      await queryClient.cancelQueries({
        queryKey: getTripQueryKey(spreadsheetId),
      });

      const queryKey = getTripQueryKey(spreadsheetId);
      const previous = queryClient.getQueryData<TripData>(queryKey);

      if (previous) {
        queryClient.setQueryData<TripData>(queryKey, {
          ...previous,
          history: [...previous.history, ...events],
        });
      }

      return previous;
    },

    onError: (_err, _events, previous) => {
      if (previous) {
        queryClient.setQueryData(getTripQueryKey(spreadsheetId), previous);
      }
    },

    onSettled: () => {
      void invalidateTrip(queryClient, spreadsheetId);
    },
  });
}
