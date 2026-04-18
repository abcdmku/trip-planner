import { useMemo } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTrip } from '@/hooks/useTrip';
import { useUndoRedo } from '@/hooks/useUndoRedo';
import {
  createItemRecord,
  deleteItemRecord,
  reorderTripItems,
  updateItemRecord,
} from '@/services/api-client';
import {
  getTripQueryKey,
  updateItemsOptimistic,
} from '@/stores/trip-store';
import type { Item, TripData } from '@/types/trip';
import type { TripSnapshotResponse } from '@/types/api';

export function useItems(
  tripId: string | null | undefined,
  dayId?: string,
) {
  const { items, isLoading, error } = useTrip(tripId);

  const filtered = useMemo(() => {
    const base = dayId ? items.filter((item) => item.dayId === dayId) : items;
    return [...base].sort((a, b) => a.sortOrder - b.sortOrder);
  }, [dayId, items]);

  return { items: filtered, isLoading, error };
}

export function useAddItem(tripId: string) {
  const queryClient = useQueryClient();
  const { recordMutation } = useUndoRedo(tripId);

  return useMutation<Item, Error, Item, TripData | undefined>({
    mutationFn: async (newItem) => createItemRecord(tripId, newItem),

    onMutate: async (newItem) => {
      await queryClient.cancelQueries({ queryKey: getTripQueryKey(tripId) });
      return updateItemsOptimistic(queryClient, tripId, (items) => [...items, newItem]);
    },

    onError: (_error, _payload, previous) => {
      if (previous) {
        queryClient.setQueryData(getTripQueryKey(tripId), previous);
      }
    },

    onSuccess: (savedItem, _payload, previous) => {
      recordMutation(previous);
      queryClient.setQueryData<TripSnapshotResponse | undefined>(
        getTripQueryKey(tripId),
        (current) =>
          current
            ? {
                ...current,
                items: [...current.items.filter((item) => item.itemId !== savedItem.itemId), savedItem].sort(
                  (a, b) => a.sortOrder - b.sortOrder,
                ),
              }
            : current,
      );
    },
  });
}

export function useUpdateItem(tripId: string) {
  const queryClient = useQueryClient();
  const { recordMutation } = useUndoRedo(tripId);

  return useMutation<Item, Error, Item, TripData | undefined>({
    mutationFn: async (updatedItem) => updateItemRecord(tripId, updatedItem),

    onMutate: async (updatedItem) => {
      await queryClient.cancelQueries({ queryKey: getTripQueryKey(tripId) });
      return updateItemsOptimistic(queryClient, tripId, (items) =>
        items.map((item) => (item.itemId === updatedItem.itemId ? updatedItem : item)),
      );
    },

    onError: (_error, _payload, previous) => {
      if (previous) {
        queryClient.setQueryData(getTripQueryKey(tripId), previous);
      }
    },

    onSuccess: (savedItem, _payload, previous) => {
      recordMutation(previous);
      queryClient.setQueryData<TripSnapshotResponse | undefined>(
        getTripQueryKey(tripId),
        (current) =>
          current
            ? {
                ...current,
                items: current.items.map((item) => (item.itemId === savedItem.itemId ? savedItem : item)),
              }
            : current,
      );
    },
  });
}

export function useDeleteItem(tripId: string) {
  const queryClient = useQueryClient();
  const { recordMutation } = useUndoRedo(tripId);

  return useMutation<void, Error, string, TripData | undefined>({
    mutationFn: async (itemId) => deleteItemRecord(tripId, itemId),

    onMutate: async (itemId) => {
      await queryClient.cancelQueries({ queryKey: getTripQueryKey(tripId) });
      const previous = queryClient.getQueryData<TripData>(getTripQueryKey(tripId));
      if (previous) {
        queryClient.setQueryData<TripData>(getTripQueryKey(tripId), {
          ...previous,
          items: previous.items.filter((item) => item.itemId !== itemId),
          legs: previous.legs.filter((leg) => leg.fromItemId !== itemId && leg.toItemId !== itemId),
        });
      }
      return previous;
    },

    onError: (_error, _payload, previous) => {
      if (previous) {
        queryClient.setQueryData(getTripQueryKey(tripId), previous);
      }
    },

    onSuccess: (_data, _payload, previous) => {
      recordMutation(previous);
    },
  });
}

interface ReorderPayload {
  dayId: string;
  orderedItemIds: string[];
}

export function useReorderItems(tripId: string) {
  const queryClient = useQueryClient();
  const { recordMutation } = useUndoRedo(tripId);

  return useMutation<Item[], Error, ReorderPayload, TripData | undefined>({
    mutationFn: async (payload) => reorderTripItems(tripId, payload),

    onMutate: async ({ dayId, orderedItemIds }) => {
      await queryClient.cancelQueries({ queryKey: getTripQueryKey(tripId) });
      const orderMap = new Map(orderedItemIds.map((itemId, index) => [itemId, index]));
      return updateItemsOptimistic(queryClient, tripId, (items) =>
        items.map((item) =>
          item.dayId === dayId && orderMap.has(item.itemId)
            ? { ...item, sortOrder: orderMap.get(item.itemId)! }
            : item,
        ),
      );
    },

    onError: (_error, _payload, previous) => {
      if (previous) {
        queryClient.setQueryData(getTripQueryKey(tripId), previous);
      }
    },

    onSuccess: (savedItems, _payload, previous) => {
      recordMutation(previous);
      const savedById = new Map(savedItems.map((item) => [item.itemId, item]));
      queryClient.setQueryData<TripSnapshotResponse | undefined>(
        getTripQueryKey(tripId),
        (current) =>
          current
            ? {
                ...current,
                items: current.items.map((item) => savedById.get(item.itemId) ?? item).sort((a, b) => a.sortOrder - b.sortOrder),
              }
            : current,
      );
    },
  });
}
