import { useEffect, useRef } from 'react';

export function useTripWorkspaceUndoSync<T>(
  tripId: string,
  tripData: T | null | undefined,
  isFetching: boolean,
  ensureSynced: (data: T) => void,
) {
  const hasSyncedUndoRef = useRef(false);
  const wasFetchingUndoRef = useRef(false);

  useEffect(() => {
    hasSyncedUndoRef.current = false;
    wasFetchingUndoRef.current = false;
  }, [tripId]);

  useEffect(() => {
    if (!tripData) return;

    if (!hasSyncedUndoRef.current && !isFetching) {
      ensureSynced(tripData);
      hasSyncedUndoRef.current = true;
    }

    const wasFetching = wasFetchingUndoRef.current;
    if (wasFetching && !isFetching) {
      ensureSynced(tripData);
    }
    wasFetchingUndoRef.current = isFetching;
  }, [ensureSynced, isFetching, tripData]);
}
