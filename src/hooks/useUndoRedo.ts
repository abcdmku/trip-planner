import { useCallback, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { restoreTripSnapshot } from '@/services/api-client';
import { getTripQueryKey } from '@/stores/trip-store';
import {
  computeRedoStep,
  computeUndoStep,
  ensureUndoHistoryCompatible,
  extractTripCoreSnapshot,
  readUndoHistory,
  recordUndoableChange,
  writeUndoHistory,
} from '@/stores/undo-store';
import type { TripData } from '@/types/trip';
import type { TripSnapshotResponse } from '@/types/api';

function mergeCoreSnapshot(
  current: TripSnapshotResponse,
  snapshot: ReturnType<typeof extractTripCoreSnapshot>,
): TripSnapshotResponse {
  return {
    ...current,
    trip: snapshot.trip,
    days: snapshot.days,
    items: snapshot.items,
    legs: snapshot.legs,
  };
}

export function useUndoRedo(tripId: string) {
  const queryClient = useQueryClient();
  const queryKey = getTripQueryKey(tripId);
  const inFlightRef = useRef(false);

  const ensureSynced = useCallback(
    (data: TripData | null | undefined) => {
      if (!data) return;
      ensureUndoHistoryCompatible(tripId, extractTripCoreSnapshot(data));
    },
    [tripId],
  );

  const recordMutation = useCallback(
    (previous: TripData | undefined) => {
      if (!previous) return;
      const current = queryClient.getQueryData<TripSnapshotResponse>(queryKey);
      if (!current) return;

      recordUndoableChange({
        tripId,
        before: extractTripCoreSnapshot(previous),
        after: extractTripCoreSnapshot(current),
      });
    },
    [queryClient, queryKey, tripId],
  );

  const undo = useCallback(async (): Promise<boolean> => {
    if (inFlightRef.current) return false;
    const current = queryClient.getQueryData<TripSnapshotResponse>(queryKey);
    if (!current) return false;

    const present = extractTripCoreSnapshot(current);
    const history = ensureUndoHistoryCompatible(tripId, present);
    const step = computeUndoStep({ history, present });
    if (!step) return false;

    inFlightRef.current = true;
    await queryClient.cancelQueries({ queryKey });
    queryClient.setQueryData<TripSnapshotResponse>(
      queryKey,
      mergeCoreSnapshot(current, step.nextSnapshot),
    );

    try {
      await restoreTripSnapshot(tripId, step.nextSnapshot);
      writeUndoHistory(tripId, step.nextHistory);
      return true;
    } catch (error) {
      queryClient.setQueryData<TripSnapshotResponse>(queryKey, current);
      console.error('Undo failed:', error);
      return false;
    } finally {
      inFlightRef.current = false;
    }
  }, [queryClient, queryKey, tripId]);

  const redo = useCallback(async (): Promise<boolean> => {
    if (inFlightRef.current) return false;
    const current = queryClient.getQueryData<TripSnapshotResponse>(queryKey);
    if (!current) return false;

    const present = extractTripCoreSnapshot(current);
    const history = ensureUndoHistoryCompatible(tripId, present);
    const step = computeRedoStep({ history, present });
    if (!step) return false;

    inFlightRef.current = true;
    await queryClient.cancelQueries({ queryKey });
    queryClient.setQueryData<TripSnapshotResponse>(
      queryKey,
      mergeCoreSnapshot(current, step.nextSnapshot),
    );

    try {
      await restoreTripSnapshot(tripId, step.nextSnapshot);
      writeUndoHistory(tripId, step.nextHistory);
      return true;
    } catch (error) {
      queryClient.setQueryData<TripSnapshotResponse>(queryKey, current);
      console.error('Redo failed:', error);
      return false;
    } finally {
      inFlightRef.current = false;
    }
  }, [queryClient, queryKey, tripId]);

  const canUndo = useCallback((): boolean => readUndoHistory(tripId).past.length > 0, [tripId]);
  const canRedo = useCallback((): boolean => readUndoHistory(tripId).future.length > 0, [tripId]);

  return { ensureSynced, recordMutation, undo, redo, canUndo, canRedo };
}
