// ---------------------------------------------------------------------------
// useItems – TanStack Query hooks for Item CRUD + reorder operations.
//
// Every mutation follows the same pattern:
//   1. Optimistic cache update via trip-store helpers
//   2. Persist to Google Sheets via sheets-repository
//   3. Append field-level change history (for updates)
//   4. Invalidate the trip query on settle
//   5. Rollback on error
// ---------------------------------------------------------------------------

import { useMemo } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTrip } from '@/hooks/useTrip';
import { useAuth } from '@/hooks/useAuth';
import { useUndoRedo } from '@/hooks/useUndoRedo';
import { saveItems, appendHistory } from '@/services/sheets-repository';
import { detectChanges, createHistoryEvent } from '@/services/history-service';
import {
  updateItemsOptimistic,
  invalidateTrip,
  getTripQueryKey,
} from '@/stores/trip-store';
import type { Item, TripData } from '@/types/trip';

// ---------------------------------------------------------------------------
// Read hook
// ---------------------------------------------------------------------------

/**
 * Returns items for the given spreadsheet, optionally filtered to a single day.
 *
 * When `dayId` is supplied the returned array only contains items belonging to
 * that day; otherwise all items are returned.  Items are sorted by `sortOrder`.
 */
export function useItems(
  spreadsheetId: string | null | undefined,
  dayId?: string,
) {
  const { items, isLoading, error } = useTrip(spreadsheetId);

  const filtered = useMemo(() => {
    const base = dayId ? items.filter((i) => i.dayId === dayId) : items;
    return [...base].sort((a, b) => a.sortOrder - b.sortOrder);
  }, [items, dayId]);

  return { items: filtered, isLoading, error };
}

// ---------------------------------------------------------------------------
// Add item
// ---------------------------------------------------------------------------

/**
 * Mutation that adds a new Item.
 *
 * The caller supplies a complete `Item` (with a generated `itemId`).
 * A "created" history event is automatically appended.
 */
export function useAddItem(spreadsheetId: string) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { recordMutation } = useUndoRedo(spreadsheetId);

  return useMutation<void, Error, Item, TripData | undefined>({
    mutationFn: async (newItem) => {
      // Read current items from cache, but filter out the optimistically added item
      // to avoid duplicates (onMutate runs before mutationFn)
      const queryKey = getTripQueryKey(spreadsheetId);
      const current = queryClient.getQueryData<TripData>(queryKey);
      const existingItems = (current?.items ?? []).filter(
        (item) => item.itemId !== newItem.itemId,
      );
      const updatedItems = [...existingItems, newItem];
      await saveItems(spreadsheetId, updatedItems);

      // Record a creation event in history.
      const event = createHistoryEvent(
        'itemId',
        '',
        newItem.itemId,
        newItem.itemId,
        user?.email ?? 'unknown',
        user?.name ?? 'Unknown',
      );
      await appendHistory(spreadsheetId, [event]);
    },

    onMutate: async (newItem) => {
      await queryClient.cancelQueries({
        queryKey: getTripQueryKey(spreadsheetId),
      });

      const previous = updateItemsOptimistic(
        queryClient,
        spreadsheetId,
        (items) => [...items, newItem],
      );

      return previous;
    },

    onError: (_err, _newItem, previous) => {
      if (previous) {
        queryClient.setQueryData(getTripQueryKey(spreadsheetId), previous);
      }
    },

    onSuccess: (_data, _newItem, previous) => {
      recordMutation(previous);
    },

    onSettled: () => {
      void invalidateTrip(queryClient, spreadsheetId);
    },
  });
}

// ---------------------------------------------------------------------------
// Update item
// ---------------------------------------------------------------------------

/**
 * Mutation that updates an existing Item.
 *
 * Automatically detects which fields changed, creates `HistoryEvent`s for
 * each one, and appends them to the History tab.
 */
export function useUpdateItem(spreadsheetId: string) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { recordMutation } = useUndoRedo(spreadsheetId);

  return useMutation<void, Error, Item, TripData | undefined>({
    mutationFn: async (updatedItem) => {
      const queryKey = getTripQueryKey(spreadsheetId);
      const current = queryClient.getQueryData<TripData>(queryKey);
      const existingItems = current?.items ?? [];

      // Find the old version for change detection.
      const oldItem = existingItems.find((i) => i.itemId === updatedItem.itemId);

      const updatedItems = existingItems.map((i) =>
        i.itemId === updatedItem.itemId ? updatedItem : i,
      );

      await saveItems(spreadsheetId, updatedItems);

      // Append field-level change history.
      if (oldItem) {
        const events = detectChanges(
          oldItem,
          updatedItem,
          user?.email ?? 'unknown',
          user?.name ?? 'Unknown',
        );
        if (events.length > 0) {
          await appendHistory(spreadsheetId, events);
        }
      }
    },

    onMutate: async (updatedItem) => {
      await queryClient.cancelQueries({
        queryKey: getTripQueryKey(spreadsheetId),
      });

      const previous = updateItemsOptimistic(
        queryClient,
        spreadsheetId,
        (items) =>
          items.map((i) => (i.itemId === updatedItem.itemId ? updatedItem : i)),
      );

      return previous;
    },

    onError: (_err, _updatedItem, previous) => {
      if (previous) {
        queryClient.setQueryData(getTripQueryKey(spreadsheetId), previous);
      }
    },

    onSuccess: (_data, _updatedItem, previous) => {
      recordMutation(previous);
    },

    onSettled: () => {
      void invalidateTrip(queryClient, spreadsheetId);
    },
  });
}

// ---------------------------------------------------------------------------
// Delete item
// ---------------------------------------------------------------------------

/**
 * Mutation that removes an Item by `itemId`.
 *
 * Records a deletion event in history.
 */
export function useDeleteItem(spreadsheetId: string) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { recordMutation } = useUndoRedo(spreadsheetId);

  return useMutation<void, Error, string, TripData | undefined>({
    mutationFn: async (itemId) => {
      const queryKey = getTripQueryKey(spreadsheetId);
      const current = queryClient.getQueryData<TripData>(queryKey);
      const existingItems = current?.items ?? [];

      const deletedItem = existingItems.find((i) => i.itemId === itemId);
      const updatedItems = existingItems.filter((i) => i.itemId !== itemId);

      await saveItems(spreadsheetId, updatedItems);

      // Record a deletion event.
      if (deletedItem) {
        const event = createHistoryEvent(
          'itemId',
          deletedItem.itemId,
          '',
          deletedItem.itemId,
          user?.email ?? 'unknown',
          user?.name ?? 'Unknown',
        );
        await appendHistory(spreadsheetId, [event]);
      }
    },

    onMutate: async (itemId) => {
      await queryClient.cancelQueries({
        queryKey: getTripQueryKey(spreadsheetId),
      });

      const previous = updateItemsOptimistic(
        queryClient,
        spreadsheetId,
        (items) => items.filter((i) => i.itemId !== itemId),
      );

      return previous;
    },

    onError: (_err, _itemId, previous) => {
      if (previous) {
        queryClient.setQueryData(getTripQueryKey(spreadsheetId), previous);
      }
    },

    onSuccess: (_data, _itemId, previous) => {
      recordMutation(previous);
    },

    onSettled: () => {
      void invalidateTrip(queryClient, spreadsheetId);
    },
  });
}

// ---------------------------------------------------------------------------
// Reorder items
// ---------------------------------------------------------------------------

interface ReorderPayload {
  /** The dayId whose items are being reordered. */
  dayId: string;
  /** Ordered list of itemIds representing the new sort order. */
  orderedItemIds: string[];
}

/**
 * Mutation that reorders items within a day by updating their `sortOrder`.
 *
 * The caller passes an ordered array of `itemId`s; the hook assigns
 * sequential `sortOrder` values (0, 1, 2, ...) to match.
 */
export function useReorderItems(spreadsheetId: string) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { recordMutation } = useUndoRedo(spreadsheetId);

  return useMutation<void, Error, ReorderPayload, TripData | undefined>({
    mutationFn: async ({ dayId, orderedItemIds }) => {
      const queryKey = getTripQueryKey(spreadsheetId);
      const current = queryClient.getQueryData<TripData>(queryKey);
      const existingItems = current?.items ?? [];

      // Build a lookup from itemId -> new sortOrder.
      const orderMap = new Map<string, number>();
      orderedItemIds.forEach((id, index) => orderMap.set(id, index));

      const updatedItems = existingItems.map((item) => {
        if (item.dayId === dayId && orderMap.has(item.itemId)) {
          return { ...item, sortOrder: orderMap.get(item.itemId)! };
        }
        return item;
      });

      await saveItems(spreadsheetId, updatedItems);

      // Append history events for each item whose sortOrder actually changed.
      const events = existingItems
        .filter(
          (item) =>
            item.dayId === dayId &&
            orderMap.has(item.itemId) &&
            item.sortOrder !== orderMap.get(item.itemId),
        )
        .map((item) =>
          createHistoryEvent(
            'sortOrder',
            String(item.sortOrder),
            String(orderMap.get(item.itemId)!),
            item.itemId,
            user?.email ?? 'unknown',
            user?.name ?? 'Unknown',
          ),
        );

      if (events.length > 0) {
        await appendHistory(spreadsheetId, events);
      }
    },

    onMutate: async ({ dayId, orderedItemIds }) => {
      await queryClient.cancelQueries({
        queryKey: getTripQueryKey(spreadsheetId),
      });

      const orderMap = new Map<string, number>();
      orderedItemIds.forEach((id, index) => orderMap.set(id, index));

      const previous = updateItemsOptimistic(
        queryClient,
        spreadsheetId,
        (items) =>
          items.map((item) => {
            if (item.dayId === dayId && orderMap.has(item.itemId)) {
              return { ...item, sortOrder: orderMap.get(item.itemId)! };
            }
            return item;
          }),
      );

      return previous;
    },

    onError: (_err, _payload, previous) => {
      if (previous) {
        queryClient.setQueryData(getTripQueryKey(spreadsheetId), previous);
      }
    },

    onSuccess: (_data, _payload, previous) => {
      recordMutation(previous);
    },

    onSettled: () => {
      void invalidateTrip(queryClient, spreadsheetId);
    },
  });
}
