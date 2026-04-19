import { useCallback, useEffect, useMemo, useRef, type Dispatch, type SetStateAction } from 'react';
import type {
  CollaborationParticipant,
  PresenceMapCamera,
  PresenceMapOpenLocation,
  PresenceViewport,
  PresenceWorkspaceLayout,
} from '@/types/collaboration';

interface UseTripWorkspaceFollowSyncParams {
  followedConnectionId: string | null;
  tripParticipants: CollaborationParticipant[];
  setFollowedConnectionId: Dispatch<SetStateAction<string | null>>;
  setActiveTab: (tab: NonNullable<PresenceViewport['activeTab']>) => void;
  setWorkspaceLayout: Dispatch<SetStateAction<PresenceWorkspaceLayout>>;
  setDesktopLeftPanelWidth: Dispatch<SetStateAction<number | undefined>>;
  setSelectedDayId: Dispatch<SetStateAction<string | null>>;
  setMapEventFilter: Dispatch<SetStateAction<'all' | 'committed'>>;
  setItineraryScrollTop: Dispatch<SetStateAction<number>>;
  setSelectedItemId: (itemId: string | null) => void;
  setMapCamera: Dispatch<SetStateAction<PresenceMapCamera | null>>;
  setMapOpenLocation: Dispatch<SetStateAction<PresenceMapOpenLocation | null>>;
  areMapCamerasEqual: (
    current: PresenceMapCamera | null | undefined,
    next: PresenceMapCamera | null | undefined,
  ) => boolean;
  areMapOpenLocationsEqual: (
    current: PresenceMapOpenLocation | null | undefined,
    next: PresenceMapOpenLocation | null | undefined,
  ) => boolean;
}

export function useTripWorkspaceFollowSync({
  followedConnectionId,
  tripParticipants,
  setFollowedConnectionId,
  setActiveTab,
  setWorkspaceLayout,
  setDesktopLeftPanelWidth,
  setSelectedDayId,
  setMapEventFilter,
  setItineraryScrollTop,
  setSelectedItemId,
  setMapCamera,
  setMapOpenLocation,
  areMapCamerasEqual,
  areMapOpenLocationsEqual,
}: UseTripWorkspaceFollowSyncParams) {
  const followedParticipant = useMemo(
    () =>
      followedConnectionId
        ? tripParticipants.find((participant) => participant.connectionId === followedConnectionId) ?? null
        : null,
    [followedConnectionId, tripParticipants],
  );
  const followedParticipantRef = useRef<typeof followedParticipant>(null);
  const followSyncTimerRef = useRef<number | null>(null);
  const applyingFollowStateRef = useRef(false);

  useEffect(() => {
    followedParticipantRef.current = followedParticipant;
  }, [followedParticipant]);

  useEffect(() => {
    if (followedConnectionId && !followedParticipant) {
      setFollowedConnectionId(null);
    }
  }, [followedConnectionId, followedParticipant, setFollowedConnectionId]);

  useEffect(() => {
    if (followedConnectionId) return;
    applyingFollowStateRef.current = false;
    if (followSyncTimerRef.current !== null) {
      window.clearTimeout(followSyncTimerRef.current);
      followSyncTimerRef.current = null;
    }
  }, [followedConnectionId]);

  useEffect(() => {
    return () => {
      if (followSyncTimerRef.current !== null) {
        window.clearTimeout(followSyncTimerRef.current);
      }
    };
  }, []);

  const armFollowSyncGuard = useCallback(() => {
    applyingFollowStateRef.current = true;
    if (followSyncTimerRef.current !== null) {
      window.clearTimeout(followSyncTimerRef.current);
    }
    followSyncTimerRef.current = window.setTimeout(() => {
      applyingFollowStateRef.current = false;
      followSyncTimerRef.current = null;
    }, 240);
  }, []);

  const applyParticipantWorkspaceState = useCallback(
    (participant: CollaborationParticipant | null | undefined) => {
      if (!participant?.viewport) return;

      const { viewport } = participant;
      armFollowSyncGuard();

      if (viewport.activeTab) {
        setActiveTab(viewport.activeTab);
      }
      setWorkspaceLayout((current) => {
        const next = viewport.workspaceLayout ?? 'split';
        return current === next ? current : next;
      });
      if (viewport.leftPanelWidth !== undefined) {
        const nextLeftPanelWidth = viewport.leftPanelWidth;
        setDesktopLeftPanelWidth((current) =>
          current !== undefined && Math.abs(current - nextLeftPanelWidth) < 1
            ? current
            : nextLeftPanelWidth,
        );
      }

      setSelectedDayId((current) => {
        const next = viewport.selectedDayId ?? null;
        return current === next ? current : next;
      });
      setMapEventFilter((current) => {
        const next = viewport.mapEventFilter ?? 'all';
        return current === next ? current : next;
      });
      setItineraryScrollTop((current) => {
        const next = viewport.itineraryScrollTop ?? 0;
        return Math.abs(current - next) < 1 ? current : next;
      });
      setSelectedItemId(participant.selection?.primaryObjectId ?? null);
      if (viewport.mapCamera !== undefined) {
        setMapCamera((current) =>
          areMapCamerasEqual(current, viewport.mapCamera ?? null)
            ? current
            : viewport.mapCamera ?? null,
        );
      }
      if (viewport.mapOpenLocation !== undefined) {
        setMapOpenLocation((current) =>
          areMapOpenLocationsEqual(current, viewport.mapOpenLocation ?? null)
            ? current
            : viewport.mapOpenLocation ?? null,
        );
      }
    },
    [
      areMapCamerasEqual,
      areMapOpenLocationsEqual,
      armFollowSyncGuard,
      setActiveTab,
      setDesktopLeftPanelWidth,
      setItineraryScrollTop,
      setMapCamera,
      setMapEventFilter,
      setMapOpenLocation,
      setSelectedDayId,
      setSelectedItemId,
      setWorkspaceLayout,
    ],
  );

  useEffect(() => {
    const participant = followedParticipantRef.current;
    if (!participant?.viewport) return;
    applyParticipantWorkspaceState(participant);
  }, [
    applyParticipantWorkspaceState,
    followedConnectionId,
    followedParticipant?.selection?.primaryObjectId,
    followedParticipant?.selection?.updatedAt,
    followedParticipant?.viewport?.updatedAt,
  ]);

  return {
    applyingFollowStateRef,
    applyParticipantWorkspaceState,
    followedParticipant,
  };
}
