// ---------------------------------------------------------------------------
// useTrip – TanStack React Query hook that loads a full TripData object from
// a Google Sheet via the sheets-repository service.
// ---------------------------------------------------------------------------

import { useQuery } from '@tanstack/react-query';
import { loadTrip } from '@/services/sheets-repository';
import { useAuth } from '@/hooks/useAuth';
import type { TripData } from '@/types/trip';

/**
 * Fetches and caches the full trip dataset for a given spreadsheet.
 *
 * The query is only **enabled** when:
 * 1. `spreadsheetId` is a non-empty string, AND
 * 2. the user is authenticated (valid access token present).
 *
 * @param spreadsheetId  Google Sheets ID, or `null` / `undefined` to disable.
 */
export function useTrip(spreadsheetId: string | null | undefined) {
  const { isAuthenticated } = useAuth();

  const enabled = !!spreadsheetId && isAuthenticated;

  const query = useQuery<TripData, Error>({
    queryKey: ['trip', spreadsheetId],
    queryFn: () => {
      if (!spreadsheetId) {
        throw new Error('spreadsheetId is required');
      }
      return loadTrip(spreadsheetId);
    },
    enabled,
    staleTime: 1000 * 60 * 2, // 2 minutes
    refetchOnWindowFocus: true,
  });

  return {
    /** The fully-parsed trip metadata. */
    trip: query.data?.trip ?? null,
    /** Calendar days in the trip. */
    days: query.data?.days ?? [],
    /** Itinerary items / stops. */
    items: query.data?.items ?? [],
    /** Travel legs connecting items. */
    legs: query.data?.legs ?? [],
    /** Audit history events. */
    history: query.data?.history ?? [],
    /** Arbitrary key-value metadata. */
    meta: query.data?.meta ?? {},
    /** Full TripData object (null while loading or disabled). */
    data: query.data ?? null,
    /** True while the initial fetch is in progress. */
    isLoading: query.isLoading,
    /** True while any fetch (initial or refetch) is in progress. */
    isFetching: query.isFetching,
    /** Error from the most recent failed fetch, or null. */
    error: query.error,
    /** Manually trigger a refetch. */
    refetch: query.refetch,
  };
}
