import { useCallback, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { overwriteTripCoreTabs } from '@/services/trip-core-writer';
import { getTripQueryKey, invalidateTrip } from '@/stores/trip-store';
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

function mergeCoreSnapshot(current: TripData, snapshot: ReturnType<typeof extractTripCoreSnapshot>): TripData {
  return {
    ...current,
    trip: snapshot.trip,
    days: snapshot.days,
    items: snapshot.items,
    legs: snapshot.legs,
  };
}

export function useUndoRedo(spreadsheetId: string) {
  const queryClient = useQueryClient();
  const queryKey = getTripQueryKey(spreadsheetId);
  const inFlightRef = useRef(false);

  const ensureSynced = useCallback(
    (data: TripData | null | undefined) => {
      if (!data) return;
      ensureUndoHistoryCompatible(
        spreadsheetId,
        extractTripCoreSnapshot(data),
      );
    },
    [spreadsheetId],
  );

  const recordMutation = useCallback(
    (previous: TripData | undefined) => {
      if (!previous) return;
      const current = queryClient.getQueryData<TripData>(queryKey);
      if (!current) return;

      recordUndoableChange({
        spreadsheetId,
        before: extractTripCoreSnapshot(previous),
        after: extractTripCoreSnapshot(current),
      });
    },
    [queryClient, queryKey, spreadsheetId],
  );

  const undo = useCallback(async (): Promise<boolean> => {
    if (inFlightRef.current) return false;
    const current = queryClient.getQueryData<TripData>(queryKey);
    if (!current) return false;

    const present = extractTripCoreSnapshot(current);
    const history = ensureUndoHistoryCompatible(spreadsheetId, present);

    const step = computeUndoStep({ history, present });
    if (!step) return false;

    inFlightRef.current = true;
    await queryClient.cancelQueries({ queryKey });
    queryClient.setQueryData<TripData>(
      queryKey,
      mergeCoreSnapshot(current, step.nextSnapshot),
    );

    try {
      await overwriteTripCoreTabs({
        spreadsheetId,
        snapshot: step.nextSnapshot,
        padTo: {
          days: current.days.length,
          items: current.items.length,
          legs: current.legs.length,
        },
      });
      writeUndoHistory(spreadsheetId, step.nextHistory);
      return true;
    } catch (err) {
      // Revert cache to the prior "present" state.
      queryClient.setQueryData<TripData>(queryKey, current);
      console.error('Undo failed:', err);
      return false;
    } finally {
      inFlightRef.current = false;
      void invalidateTrip(queryClient, spreadsheetId);
    }
  }, [queryClient, queryKey, spreadsheetId]);

  const redo = useCallback(async (): Promise<boolean> => {
    if (inFlightRef.current) return false;
    const current = queryClient.getQueryData<TripData>(queryKey);
    if (!current) return false;

    const present = extractTripCoreSnapshot(current);
    const history = ensureUndoHistoryCompatible(spreadsheetId, present);

    const step = computeRedoStep({ history, present });
    if (!step) return false;

    inFlightRef.current = true;
    await queryClient.cancelQueries({ queryKey });
    queryClient.setQueryData<TripData>(
      queryKey,
      mergeCoreSnapshot(current, step.nextSnapshot),
    );

    try {
      await overwriteTripCoreTabs({
        spreadsheetId,
        snapshot: step.nextSnapshot,
        padTo: {
          days: current.days.length,
          items: current.items.length,
          legs: current.legs.length,
        },
      });
      writeUndoHistory(spreadsheetId, step.nextHistory);
      return true;
    } catch (err) {
      queryClient.setQueryData<TripData>(queryKey, current);
      console.error('Redo failed:', err);
      return false;
    } finally {
      inFlightRef.current = false;
      void invalidateTrip(queryClient, spreadsheetId);
    }
  }, [queryClient, queryKey, spreadsheetId]);

  const canUndo = useCallback((): boolean => {
    const history = readUndoHistory(spreadsheetId);
    return history.past.length > 0;
  }, [spreadsheetId]);

  const canRedo = useCallback((): boolean => {
    const history = readUndoHistory(spreadsheetId);
    return history.future.length > 0;
  }, [spreadsheetId]);

  return { ensureSynced, recordMutation, undo, redo, canUndo, canRedo };
}
