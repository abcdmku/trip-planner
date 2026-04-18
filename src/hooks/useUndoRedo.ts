import { useCallback, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { ApiError, redoTripSnapshot, undoTripSnapshot } from '@/services/api-client';
import { getTripQueryKey } from '@/stores/trip-store';
import type { TripData } from '@/types/trip';
import type { TripSnapshotResponse } from '@/types/api';

export function useUndoRedo(tripId: string) {
  const queryClient = useQueryClient();
  const queryKey = getTripQueryKey(tripId);
  const inFlightRef = useRef(false);

  const ensureSynced = useCallback((_data: TripData | null | undefined) => {
    // Shared undo/redo is managed by the server, so the client no longer
    // maintains a separate local history that needs syncing.
  }, []);

  const recordMutation = useCallback((_previous: TripSnapshotResponse | undefined) => {
    // Shared undo/redo history is recorded server-side inside mutation routes.
  }, []);

  const undo = useCallback(async (): Promise<boolean> => {
    if (inFlightRef.current) return false;

    inFlightRef.current = true;
    try {
      const snapshot = await undoTripSnapshot(tripId);
      queryClient.setQueryData(queryKey, snapshot);
      return true;
    } catch (error) {
      if (error instanceof ApiError && error.status === 409) {
        return false;
      }
      console.error('Undo failed:', error);
      return false;
    } finally {
      inFlightRef.current = false;
    }
  }, [queryClient, queryKey, tripId]);

  const redo = useCallback(async (): Promise<boolean> => {
    if (inFlightRef.current) return false;

    inFlightRef.current = true;
    try {
      const snapshot = await redoTripSnapshot(tripId);
      queryClient.setQueryData(queryKey, snapshot);
      return true;
    } catch (error) {
      if (error instanceof ApiError && error.status === 409) {
        return false;
      }
      console.error('Redo failed:', error);
      return false;
    } finally {
      inFlightRef.current = false;
    }
  }, [queryClient, queryKey, tripId]);

  const canUndo = useCallback((): boolean => true, []);
  const canRedo = useCallback((): boolean => true, []);

  return { ensureSynced, recordMutation, undo, redo, canUndo, canRedo };
}
