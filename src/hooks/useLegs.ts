// ---------------------------------------------------------------------------
// useLegs – TanStack Query hooks for leg read and recalculation operations.
//
// Follows the same patterns as useItems and useDays:
//   1. Optimistic cache update via trip-store helpers
//   2. Persist to Google Sheets via sheets-repository
//   3. Invalidate the trip query on settle
//   4. Rollback on error
// ---------------------------------------------------------------------------

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTrip } from '@/hooks/useTrip';
import { useUndoRedo } from '@/hooks/useUndoRedo';
import { saveLegs } from '@/services/sheets-repository';
import { mapsRepository, type LegCalculation } from '@/services/maps-repository';
import {
  updateLegsOptimistic,
  invalidateTrip,
  getTripQueryKey,
} from '@/stores/trip-store';
import type { Item, Leg, TransportMode, RouteType, TripData } from '@/types/trip';
import { buildDateTime } from '@/lib/date-time';

// ---------------------------------------------------------------------------
// Read hook
// ---------------------------------------------------------------------------

/**
 * Returns the legs array for the given spreadsheet, derived from `useTrip`.
 */
export function useLegs(spreadsheetId: string | null | undefined) {
  const { legs, isLoading, error } = useTrip(spreadsheetId);
  return { legs, isLoading, error };
}

// ---------------------------------------------------------------------------
// Recalculate legs mutation
// ---------------------------------------------------------------------------

interface RecalculatePayload {
  /** Items sorted by sortOrder for a single day. */
  items: Item[];
  /** Default transport mode to use for all legs. */
  defaultMode: TransportMode;
}

/**
 * Mutation that recalculates legs between consecutive items on a day.
 *
 * For each consecutive pair of items (sorted by sortOrder), calls
 * `calculateLeg` on the maps repository to obtain routing data.
 * Replaces all existing legs for the affected item pairs and saves
 * the full legs array to the sheet.
 */
export function useRecalculateLegs(spreadsheetId: string) {
  const queryClient = useQueryClient();
  const { recordMutation } = useUndoRedo(spreadsheetId);

  return useMutation<Leg[], Error, RecalculatePayload, TripData | undefined>({
    mutationFn: async ({ items, defaultMode }) => {
      const sorted = [...items].sort((a, b) => a.sortOrder - b.sortOrder);
      const newLegs: Leg[] = [];
      const queryKey = getTripQueryKey(spreadsheetId);
      const current = queryClient.getQueryData<TripData>(queryKey);
      const dayDateById = new Map((current?.days ?? []).map((day) => [day.dayId, day.date]));

      // Compute legs for each consecutive pair.
      for (let i = 0; i < sorted.length - 1; i++) {
        const fromItem = sorted[i];
        const toItem = sorted[i + 1];

        const from = { lat: fromItem.lat, lng: fromItem.lng };
        const to = { lat: toItem.lat, lng: toItem.lng };

        // Skip items without valid coordinates.
        if (
          (from.lat === 0 && from.lng === 0) ||
          (to.lat === 0 && to.lng === 0)
        ) {
          continue;
        }

        // Use scheduled end of fromItem as departure time if available.
        const departureTime = buildDateTime(dayDateById.get(fromItem.dayId), fromItem.scheduledEnd);

        // Try directions first, fall back to straight-line if unavailable.
        let result: LegCalculation | null = null;
        let routeType: RouteType = 'directions';
        try {
          result = await mapsRepository.calculateLeg(from, to, defaultMode, departureTime);
        } catch {
          // Directions API failed — will fall back below.
        }

        if (!result) {
          // Fall back to straight-line leg (no API call needed).
          result = mapsRepository.calculateStraightLeg(from, to);
          routeType = 'straight';
        }

        newLegs.push({
          legId: `leg-${fromItem.itemId}-${toItem.itemId}`,
          fromItemId: fromItem.itemId,
          toItemId: toItem.itemId,
          mode: defaultMode,
          departure: result.departure,
          arrival: result.arrival,
          durationMinutes: result.durationMinutes,
          distanceMeters: result.distanceMeters,
          routePathEncoded: result.routePathEncoded,
          routeType,
        });
      }

      // Build the set of item IDs involved in this recalculation.
      const involvedItemIds = new Set(sorted.map((item) => item.itemId));

      // Merge: keep existing legs that are NOT between items in this day,
      // then add the newly computed legs.
      const currentAfterCalc = queryClient.getQueryData<TripData>(queryKey);
      const existingLegs = currentAfterCalc?.legs ?? [];

      const keptLegs = existingLegs.filter(
        (leg) =>
          !involvedItemIds.has(leg.fromItemId) ||
          !involvedItemIds.has(leg.toItemId),
      );

      const mergedLegs = [...keptLegs, ...newLegs];

      // Persist to sheet.
      await saveLegs(spreadsheetId, mergedLegs);

      return newLegs;
    },

    onMutate: async ({ items }) => {
      await queryClient.cancelQueries({
        queryKey: getTripQueryKey(spreadsheetId),
      });

      // Build set of item IDs for the day being recalculated.
      const involvedItemIds = new Set(items.map((item) => item.itemId));

      // Optimistic: remove old legs for this day's items (new ones will
      // arrive when the mutation settles).
      const previous = updateLegsOptimistic(
        queryClient,
        spreadsheetId,
        (legs) =>
          legs.filter(
            (leg) =>
              !involvedItemIds.has(leg.fromItemId) ||
              !involvedItemIds.has(leg.toItemId),
          ),
      );

      return previous;
    },

    onError: (_err, _payload, previous) => {
      if (previous) {
        queryClient.setQueryData(getTripQueryKey(spreadsheetId), previous);
      }
    },

    onSuccess: (newLegs, _payload, previous) => {
      // Populate the cache with the newly computed legs so undo/redo sees the
      // final state (not just the optimistic removal).
      const queryKey = getTripQueryKey(spreadsheetId);
      const current = queryClient.getQueryData<TripData>(queryKey);
      if (current && newLegs.length > 0) {
        queryClient.setQueryData<TripData>(queryKey, {
          ...current,
          legs: [...current.legs, ...newLegs],
        });
      }

      recordMutation(previous);
    },

    onSettled: () => {
      void invalidateTrip(queryClient, spreadsheetId);
    },
  });
}

// ---------------------------------------------------------------------------
// Update single leg mode mutation
// ---------------------------------------------------------------------------

interface UpdateLegModePayload {
  leg: Leg;
  newMode: TransportMode;
  fromItem: Item;
  toItem: Item;
}

/**
 * Mutation that recalculates a single leg with a new transport mode.
 *
 * Calls `mapsRepository.calculateLeg()` with the new mode, then replaces
 * that one leg in the cache and persists the full legs array to the sheet.
 */
export function useUpdateLegMode(spreadsheetId: string) {
  const queryClient = useQueryClient();
  const { recordMutation } = useUndoRedo(spreadsheetId);

  return useMutation<Leg, Error, UpdateLegModePayload, TripData | undefined>({
    mutationFn: async ({ leg, newMode, fromItem, toItem }) => {
      const from = { lat: fromItem.lat, lng: fromItem.lng };
      const to = { lat: toItem.lat, lng: toItem.lng };
      const queryKey = getTripQueryKey(spreadsheetId);
      const current = queryClient.getQueryData<TripData>(queryKey);
      const fromDayDate = (current?.days ?? []).find((day) => day.dayId === fromItem.dayId)?.date;
      const departureTime = buildDateTime(fromDayDate, fromItem.scheduledEnd);

      // Try directions first, fall back to straight-line.
      let result: LegCalculation | null = null;
      let routeType: RouteType = leg.routeType;
      try {
        result = await mapsRepository.calculateLeg(from, to, newMode, departureTime);
      } catch {
        // Directions API failed — fall back below.
      }

      if (!result) {
        result = mapsRepository.calculateStraightLeg(from, to);
        routeType = 'straight';
      }

      const updatedLeg: Leg = {
        ...leg,
        mode: newMode,
        routeType,
        departure: result.departure,
        arrival: result.arrival,
        durationMinutes: result.durationMinutes,
        distanceMeters: result.distanceMeters,
        routePathEncoded: result.routePathEncoded,
      };

      // Merge into full legs array and persist.
      const latest = queryClient.getQueryData<TripData>(queryKey);
      const allLegs = (latest?.legs ?? []).map((l) =>
        l.legId === leg.legId ? updatedLeg : l,
      );
      await saveLegs(spreadsheetId, allLegs);

      return updatedLeg;
    },

    onMutate: async ({ leg, newMode }) => {
      await queryClient.cancelQueries({
        queryKey: getTripQueryKey(spreadsheetId),
      });

      // Optimistic: update the mode immediately so the UI reflects the change.
      const previous = updateLegsOptimistic(
        queryClient,
        spreadsheetId,
        (legs) =>
          legs.map((l) =>
            l.legId === leg.legId ? { ...l, mode: newMode } : l,
          ),
      );

      return previous;
    },

    onError: (_err, _payload, previous) => {
      if (previous) {
        queryClient.setQueryData(getTripQueryKey(spreadsheetId), previous);
      }
    },

    onSuccess: (updatedLeg, _payload, previous) => {
      // Ensure the cache contains the fully recalculated leg so undo/redo
      // captures the final state, not the partial optimistic update.
      const queryKey = getTripQueryKey(spreadsheetId);
      const current = queryClient.getQueryData<TripData>(queryKey);
      if (current) {
        queryClient.setQueryData<TripData>(queryKey, {
          ...current,
          legs: current.legs.map((l) =>
            l.legId === updatedLeg.legId ? updatedLeg : l,
          ),
        });
      }

      recordMutation(previous);
    },

    onSettled: () => {
      void invalidateTrip(queryClient, spreadsheetId);
    },
  });
}

// ---------------------------------------------------------------------------
// Update single leg route type mutation
// ---------------------------------------------------------------------------

interface UpdateLegRouteTypePayload {
  leg: Leg;
  newRouteType: RouteType;
  fromItem: Item;
  toItem: Item;
}

/**
 * Mutation that toggles a single leg between 'directions' and 'straight'.
 *
 * When switching to 'straight', uses `calculateStraightLeg` (no API call).
 * When switching to 'directions', calls `calculateLeg` for routed path.
 */
export function useUpdateLegRouteType(spreadsheetId: string) {
  const queryClient = useQueryClient();
  const { recordMutation } = useUndoRedo(spreadsheetId);

  return useMutation<Leg, Error, UpdateLegRouteTypePayload, TripData | undefined>({
    mutationFn: async ({ leg, newRouteType, fromItem, toItem }) => {
      const from = { lat: fromItem.lat, lng: fromItem.lng };
      const to = { lat: toItem.lat, lng: toItem.lng };

      if (newRouteType === 'straight') {
        const calc = mapsRepository.calculateStraightLeg(from, to);
        const updatedLeg: Leg = {
          ...leg,
          routeType: 'straight',
          durationMinutes: calc.durationMinutes,
          distanceMeters: calc.distanceMeters,
          routePathEncoded: calc.routePathEncoded,
          departure: calc.departure,
          arrival: calc.arrival,
        };

        const queryKey = getTripQueryKey(spreadsheetId);
        const current = queryClient.getQueryData<TripData>(queryKey);
        const allLegs = (current?.legs ?? []).map((l) =>
          l.legId === leg.legId ? updatedLeg : l,
        );
        await saveLegs(spreadsheetId, allLegs);
        return updatedLeg;
      }

      // 'directions' — call the Google Directions API.
      const queryKey = getTripQueryKey(spreadsheetId);
      const current = queryClient.getQueryData<TripData>(queryKey);
      const fromDayDate = (current?.days ?? []).find((day) => day.dayId === fromItem.dayId)?.date;
      const departureTime = buildDateTime(fromDayDate, fromItem.scheduledEnd);

      let result: LegCalculation | null = null;
      let finalRouteType: RouteType = 'directions';
      try {
        result = await mapsRepository.calculateLeg(from, to, leg.mode, departureTime);
      } catch {
        // Directions API failed — fall back below.
      }

      if (!result) {
        // Fall back to straight-line if directions unavailable.
        result = mapsRepository.calculateStraightLeg(from, to);
        finalRouteType = 'straight';
      }

      const updatedLeg: Leg = {
        ...leg,
        routeType: finalRouteType,
        durationMinutes: result.durationMinutes,
        distanceMeters: result.distanceMeters,
        routePathEncoded: result.routePathEncoded,
        departure: result.departure,
        arrival: result.arrival,
      };

      const latest = queryClient.getQueryData<TripData>(queryKey);
      const allLegs = (latest?.legs ?? []).map((l) =>
        l.legId === leg.legId ? updatedLeg : l,
      );
      await saveLegs(spreadsheetId, allLegs);
      return updatedLeg;
    },

    onMutate: async ({ leg, newRouteType }) => {
      await queryClient.cancelQueries({
        queryKey: getTripQueryKey(spreadsheetId),
      });

      const previous = updateLegsOptimistic(
        queryClient,
        spreadsheetId,
        (legs) =>
          legs.map((l) =>
            l.legId === leg.legId ? { ...l, routeType: newRouteType } : l,
          ),
      );

      return previous;
    },

    onError: (_err, _payload, previous) => {
      if (previous) {
        queryClient.setQueryData(getTripQueryKey(spreadsheetId), previous);
      }
    },

    onSuccess: (updatedLeg, _payload, previous) => {
      const queryKey = getTripQueryKey(spreadsheetId);
      const current = queryClient.getQueryData<TripData>(queryKey);
      if (current) {
        queryClient.setQueryData<TripData>(queryKey, {
          ...current,
          legs: current.legs.map((l) =>
            l.legId === updatedLeg.legId ? updatedLeg : l,
          ),
        });
      }

      recordMutation(previous);
    },

    onSettled: () => {
      void invalidateTrip(queryClient, spreadsheetId);
    },
  });
}
