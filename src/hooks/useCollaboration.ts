import { useMemo, useSyncExternalStore } from 'react';
import { collaborationStore } from '@/stores/collaboration-store';
import {
  buildRemoteObjectPresenceById,
  participantsToCursors,
  participantsToItemPreviews,
  participantsToManipulations,
  participantsToSelections,
  participantsToViewports,
} from '@/lib/collaboration/state';

export function useTripCollaboration(tripId: string, localConnectionId?: string | null) {
  const room = useSyncExternalStore(
    collaborationStore.subscribe,
    () => collaborationStore.getRoomSnapshot(tripId),
    () => collaborationStore.getRoomSnapshot(tripId),
  );

  return useMemo(
    () => ({
      isReconnecting: room.isReconnecting,
      participants: room.participants,
      cursors: participantsToCursors(room.participants),
      itemPreviews: participantsToItemPreviews(room.participants),
      selections: participantsToSelections(room.participants),
      manipulations: participantsToManipulations(room.participants),
      viewports: participantsToViewports(room.participants),
      remoteObjectPresenceById: buildRemoteObjectPresenceById(room.participants, localConnectionId),
    }),
    [localConnectionId, room],
  );
}
