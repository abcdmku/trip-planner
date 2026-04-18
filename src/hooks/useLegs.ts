import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTrip } from '@/hooks/useTrip';
import { useUndoRedo } from '@/hooks/useUndoRedo';
import { replaceTripLegs, updateLegRecord } from '@/services/api-client';
import { mapsRepository, type LegCalculation } from '@/services/maps-repository';
import {
  getTripQueryKey,
  updateLegsOptimistic,
} from '@/stores/trip-store';
import type { Item, Leg, RouteType, TransportMode, TripData } from '@/types/trip';
import type { TripSnapshotResponse } from '@/types/api';
import { buildDateTime } from '@/lib/date-time';

export function useLegs(tripId: string | null | undefined) {
  const { legs, isLoading, error } = useTrip(tripId);
  return { legs, isLoading, error };
}

interface RecalculatePayload {
  items: Item[];
  defaultMode: TransportMode;
}

export function useRecalculateLegs(tripId: string) {
  const queryClient = useQueryClient();
  const { recordMutation } = useUndoRedo(tripId);

  return useMutation<Leg[], Error, RecalculatePayload, TripData | undefined>({
    mutationFn: async ({ items, defaultMode }) => {
      const sorted = [...items].sort((a, b) => a.sortOrder - b.sortOrder);
      const current = queryClient.getQueryData<TripSnapshotResponse>(getTripQueryKey(tripId));
      const dayDateById = new Map((current?.days ?? []).map((day) => [day.dayId, day.date]));
      const calculatedLegs: Leg[] = [];

      for (let index = 0; index < sorted.length - 1; index += 1) {
        const fromItem = sorted[index];
        const toItem = sorted[index + 1];
        if (
          (fromItem.lat === 0 && fromItem.lng === 0) ||
          (toItem.lat === 0 && toItem.lng === 0)
        ) {
          continue;
        }

        const departureTime = buildDateTime(dayDateById.get(fromItem.dayId), fromItem.scheduledEnd);
        let result: LegCalculation | null = null;
        let routeType: RouteType = 'directions';

        try {
          result = await mapsRepository.calculateLeg(
            { lat: fromItem.lat, lng: fromItem.lng },
            { lat: toItem.lat, lng: toItem.lng },
            defaultMode,
            departureTime,
          );
        } catch {
          result = null;
        }

        if (!result) {
          result = mapsRepository.calculateStraightLeg(
            { lat: fromItem.lat, lng: fromItem.lng },
            { lat: toItem.lat, lng: toItem.lng },
          );
          routeType = 'straight';
        }

        calculatedLegs.push({
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

      const involvedItemIds = new Set(sorted.map((item) => item.itemId));
      const existingLegs = current?.legs ?? [];
      const merged = [
        ...existingLegs.filter(
          (leg) => !involvedItemIds.has(leg.fromItemId) || !involvedItemIds.has(leg.toItemId),
        ),
        ...calculatedLegs,
      ];

      return replaceTripLegs(tripId, merged);
    },

    onMutate: async ({ items }) => {
      await queryClient.cancelQueries({ queryKey: getTripQueryKey(tripId) });
      const involvedItemIds = new Set(items.map((item) => item.itemId));
      return updateLegsOptimistic(queryClient, tripId, (legs) =>
        legs.filter(
          (leg) => !involvedItemIds.has(leg.fromItemId) || !involvedItemIds.has(leg.toItemId),
        ),
      );
    },

    onError: (_error, _payload, previous) => {
      if (previous) {
        queryClient.setQueryData(getTripQueryKey(tripId), previous);
      }
    },

    onSuccess: (savedLegs, _payload, previous) => {
      recordMutation(previous);
      queryClient.setQueryData<TripSnapshotResponse | undefined>(
        getTripQueryKey(tripId),
        (current) =>
          current
            ? {
                ...current,
                legs: savedLegs,
              }
            : current,
      );
    },
  });
}

interface UpdateLegModePayload {
  leg: Leg;
  newMode: TransportMode;
  fromItem: Item;
  toItem: Item;
}

export function useUpdateLegMode(tripId: string) {
  const queryClient = useQueryClient();
  const { recordMutation } = useUndoRedo(tripId);

  return useMutation<Leg, Error, UpdateLegModePayload, TripData | undefined>({
    mutationFn: async ({ leg, newMode, fromItem, toItem }) => {
      const current = queryClient.getQueryData<TripSnapshotResponse>(getTripQueryKey(tripId));
      const fromDayDate = (current?.days ?? []).find((day) => day.dayId === fromItem.dayId)?.date;
      const departureTime = buildDateTime(fromDayDate, fromItem.scheduledEnd);

      let result: LegCalculation | null = null;
      let routeType: RouteType = leg.routeType;
      try {
        result = await mapsRepository.calculateLeg(
          { lat: fromItem.lat, lng: fromItem.lng },
          { lat: toItem.lat, lng: toItem.lng },
          newMode,
          departureTime,
        );
      } catch {
        result = null;
      }

      if (!result) {
        result = mapsRepository.calculateStraightLeg(
          { lat: fromItem.lat, lng: fromItem.lng },
          { lat: toItem.lat, lng: toItem.lng },
        );
        routeType = 'straight';
      }

      return updateLegRecord(tripId, {
        ...leg,
        mode: newMode,
        routeType,
        departure: result.departure,
        arrival: result.arrival,
        durationMinutes: result.durationMinutes,
        distanceMeters: result.distanceMeters,
        routePathEncoded: result.routePathEncoded,
      });
    },

    onMutate: async ({ leg, newMode }) => {
      await queryClient.cancelQueries({ queryKey: getTripQueryKey(tripId) });
      return updateLegsOptimistic(queryClient, tripId, (legs) =>
        legs.map((entry) => (entry.legId === leg.legId ? { ...entry, mode: newMode } : entry)),
      );
    },

    onError: (_error, _payload, previous) => {
      if (previous) {
        queryClient.setQueryData(getTripQueryKey(tripId), previous);
      }
    },

    onSuccess: (savedLeg, _payload, previous) => {
      recordMutation(previous);
      queryClient.setQueryData<TripSnapshotResponse | undefined>(
        getTripQueryKey(tripId),
        (current) =>
          current
            ? {
                ...current,
                legs: current.legs.map((leg) => (leg.legId === savedLeg.legId ? savedLeg : leg)),
              }
            : current,
      );
    },
  });
}

interface UpdateLegRouteTypePayload {
  leg: Leg;
  newRouteType: RouteType;
  fromItem: Item;
  toItem: Item;
}

export function useUpdateLegRouteType(tripId: string) {
  const queryClient = useQueryClient();
  const { recordMutation } = useUndoRedo(tripId);

  return useMutation<Leg, Error, UpdateLegRouteTypePayload, TripData | undefined>({
    mutationFn: async ({ leg, newRouteType, fromItem, toItem }) => {
      if (newRouteType === 'straight') {
        const calc = mapsRepository.calculateStraightLeg(
          { lat: fromItem.lat, lng: fromItem.lng },
          { lat: toItem.lat, lng: toItem.lng },
        );
        return updateLegRecord(tripId, {
          ...leg,
          routeType: 'straight',
          departure: calc.departure,
          arrival: calc.arrival,
          durationMinutes: calc.durationMinutes,
          distanceMeters: calc.distanceMeters,
          routePathEncoded: calc.routePathEncoded,
        });
      }

      const current = queryClient.getQueryData<TripSnapshotResponse>(getTripQueryKey(tripId));
      const fromDayDate = (current?.days ?? []).find((day) => day.dayId === fromItem.dayId)?.date;
      const departureTime = buildDateTime(fromDayDate, fromItem.scheduledEnd);

      let result: LegCalculation | null = null;
      let routeType: RouteType = 'directions';
      try {
        result = await mapsRepository.calculateLeg(
          { lat: fromItem.lat, lng: fromItem.lng },
          { lat: toItem.lat, lng: toItem.lng },
          leg.mode,
          departureTime,
        );
      } catch {
        result = null;
      }

      if (!result) {
        result = mapsRepository.calculateStraightLeg(
          { lat: fromItem.lat, lng: fromItem.lng },
          { lat: toItem.lat, lng: toItem.lng },
        );
        routeType = 'straight';
      }

      return updateLegRecord(tripId, {
        ...leg,
        routeType,
        departure: result.departure,
        arrival: result.arrival,
        durationMinutes: result.durationMinutes,
        distanceMeters: result.distanceMeters,
        routePathEncoded: result.routePathEncoded,
      });
    },

    onMutate: async ({ leg, newRouteType }) => {
      await queryClient.cancelQueries({ queryKey: getTripQueryKey(tripId) });
      return updateLegsOptimistic(queryClient, tripId, (legs) =>
        legs.map((entry) =>
          entry.legId === leg.legId ? { ...entry, routeType: newRouteType } : entry,
        ),
      );
    },

    onError: (_error, _payload, previous) => {
      if (previous) {
        queryClient.setQueryData(getTripQueryKey(tripId), previous);
      }
    },

    onSuccess: (savedLeg, _payload, previous) => {
      recordMutation(previous);
      queryClient.setQueryData<TripSnapshotResponse | undefined>(
        getTripQueryKey(tripId),
        (current) =>
          current
            ? {
                ...current,
                legs: current.legs.map((leg) => (leg.legId === savedLeg.legId ? savedLeg : leg)),
              }
            : current,
      );
    },
  });
}
