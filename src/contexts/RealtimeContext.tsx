import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import {
  CURSOR_EPSILON_NORMALIZED,
  CURSOR_SEND_INTERVAL_MS,
  HEARTBEAT_INTERVAL_MS,
  ITEM_PREVIEW_SEND_INTERVAL_MS,
  VIEWPORT_CENTER_EPSILON,
  VIEWPORT_SCROLL_EPSILON_PX,
  VIEWPORT_SEND_INTERVAL_MS,
  VIEWPORT_ZOOM_EPSILON,
} from '@/lib/collaboration/perf';
import {
  participantsToCursors,
  participantsToItemPreviews,
  participantsToSelections,
  participantsToViewports,
} from '@/lib/collaboration/state';
import { isRemoteTripEvent, shouldRefetchTripForEvent } from '@/lib/realtime';
import { buildRealtimeUrl, setRealtimeConnectionId } from '@/services/api-client';
import { collaborationStore } from '@/stores/collaboration-store';
import { getTripQueryKey } from '@/stores/trip-store';
import type {
  CollaborationParticipant,
  PresenceCursor,
  PresenceItemPreview,
  PresenceSelection,
  PresenceViewport,
} from '@/types/collaboration';
import type {
  RealtimeServerMessage,
  TripEventEnvelope,
  TripSnapshotResponse,
} from '@/types/api';

type ConnectionState = 'connecting' | 'connected' | 'disconnected';

interface LiveItemPreviewPayload {
  itemId: string;
  dayId: string;
  scheduledStart: string;
  scheduledEnd: string;
  durationMinutes: number;
  mode?: PresenceItemPreview['mode'];
}

interface SelectionPayload {
  objectIds: string[];
  primaryObjectId: string | null;
}

interface ViewportPayload {
  viewMode: PresenceViewport['viewMode'];
  focusedDayId: string | null;
  scrollLeft: number;
  scrollTop: number;
  zoom: number;
  activeTab?: PresenceViewport['activeTab'];
  workspaceLayout?: PresenceViewport['workspaceLayout'];
  selectedDayId?: string | null;
  itineraryScrollTop?: number;
  mapEventFilter?: PresenceViewport['mapEventFilter'];
  mapCamera?: PresenceViewport['mapCamera'];
}

interface RealtimeContextValue {
  connectionState: ConnectionState;
  localConnectionId: string | null;
  subscribeToTrip: (tripId: string) => void;
  unsubscribeFromTrip: (tripId: string) => void;
  sendCursor: (tripId: string, x: number, y: number) => void;
  clearCursor: (tripId: string) => void;
  sendItemPreview: (tripId: string, preview: LiveItemPreviewPayload | null) => void;
  sendSelection: (tripId: string, selection: SelectionPayload | null) => void;
  sendViewport: (tripId: string, viewport: ViewportPayload | null) => void;
  getTripParticipants: (tripId: string) => CollaborationParticipant[];
  getTripCursors: (tripId: string) => PresenceCursor[];
  getTripItemPreviews: (tripId: string) => PresenceItemPreview[];
  getTripSelections: (tripId: string) => PresenceSelection[];
  getTripViewports: (tripId: string) => PresenceViewport[];
  getRemoteEditNotice: (tripId: string) => string | null;
  dismissRemoteEditNotice: (tripId: string) => void;
}

const RealtimeContext = createContext<RealtimeContextValue | null>(null);

function sortSnapshot(snapshot: TripSnapshotResponse): TripSnapshotResponse {
  return {
    ...snapshot,
    days: [...snapshot.days].sort((a, b) => a.date.localeCompare(b.date)),
    items: [...snapshot.items].sort((a, b) => a.sortOrder - b.sortOrder),
    history: [...snapshot.history].sort((a, b) => a.timestamp.localeCompare(b.timestamp)),
    members: [...snapshot.members].sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
    pendingInvites: [...snapshot.pendingInvites].sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
  };
}

function applyTripEvent(
  current: TripSnapshotResponse,
  event: TripEventEnvelope,
): TripSnapshotResponse | null {
  switch (event.type) {
    case 'trip.updated':
      return sortSnapshot({
        ...current,
        trip: event.trip ?? current.trip,
      });
    case 'day.created': {
      const day = event.day;
      if (!day) return current;
      return sortSnapshot({
        ...current,
        days: [...current.days.filter((entry) => entry.dayId !== day.dayId), day],
      });
    }
    case 'day.updated': {
      const day = event.day;
      if (!day) return current;
      return sortSnapshot({
        ...current,
        days: current.days.map((entry) => (entry.dayId === day.dayId ? day : entry)),
      });
    }
    case 'day.deleted': {
      const removedDayId = event.dayId;
      if (!removedDayId) return current;
      const removedItemIds = new Set(
        current.items.filter((item) => item.dayId === removedDayId).map((item) => item.itemId),
      );
      return sortSnapshot({
        ...current,
        days: current.days.filter((entry) => entry.dayId !== removedDayId),
        items: current.items.filter((item) => item.dayId !== removedDayId),
        legs: current.legs.filter(
          (leg) => !removedItemIds.has(leg.fromItemId) && !removedItemIds.has(leg.toItemId),
        ),
      });
    }
    case 'item.created': {
      const item = event.item;
      if (!item) return current;
      return sortSnapshot({
        ...current,
        items: [...current.items.filter((entry) => entry.itemId !== item.itemId), item],
      });
    }
    case 'item.updated': {
      const item = event.item;
      if (!item) return current;
      return sortSnapshot({
        ...current,
        items: current.items.map((entry) => (entry.itemId === item.itemId ? item : entry)),
      });
    }
    case 'item.deleted': {
      const removedItemId = event.itemId;
      if (!removedItemId) return current;
      return sortSnapshot({
        ...current,
        items: current.items.filter((entry) => entry.itemId !== removedItemId),
        legs: current.legs.filter(
          (leg) => leg.fromItemId !== removedItemId && leg.toItemId !== removedItemId,
        ),
      });
    }
    case 'items.reordered': {
      const incoming = event.items ?? [];
      const incomingById = new Map(incoming.map((item) => [item.itemId, item]));
      return sortSnapshot({
        ...current,
        items: current.items.map((item) => incomingById.get(item.itemId) ?? item),
      });
    }
    case 'leg.updated': {
      const leg = event.leg;
      if (!leg) return current;
      return sortSnapshot({
        ...current,
        legs: [...current.legs.filter((entry) => entry.legId !== leg.legId), leg],
      });
    }
    case 'legs.replaced':
      return sortSnapshot({
        ...current,
        legs: event.legs ?? current.legs,
      });
    case 'member.added': {
      const member = event.member;
      if (!member) return current;
      return sortSnapshot({
        ...current,
        members: [...current.members.filter((entry) => entry.memberId !== member.memberId), member],
      });
    }
    case 'member.removed':
      return sortSnapshot({
        ...current,
        members: current.members.filter((entry) => entry.memberId !== event.memberId),
      });
    case 'invite.created': {
      const invite = event.invite;
      if (!invite) return current;
      return sortSnapshot({
        ...current,
        pendingInvites: [
          ...current.pendingInvites.filter((entry) => entry.inviteId !== invite.inviteId),
          invite,
        ],
      });
    }
    case 'invite.removed':
      return sortSnapshot({
        ...current,
        pendingInvites: current.pendingInvites.filter((entry) => entry.inviteId !== event.inviteId),
      });
    case 'snapshot.restored':
      return null;
    default:
      return current;
  }
}

function getTripParticipants(tripId: string): CollaborationParticipant[] {
  return collaborationStore.getRoomSnapshot(tripId).participants;
}

export function RealtimeProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const { user, isAuthenticated, refreshSession } = useAuth();
  const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected');
  const [localConnectionId, setLocalConnectionId] = useState<string | null>(null);
  const [noticesByTrip, setNoticesByTrip] = useState<Record<string, string>>({});
  const socketRef = useRef<WebSocket | null>(null);
  const localConnectionIdRef = useRef<string | null>(null);
  const reconnectTimerRef = useRef<number | null>(null);
  const heartbeatTimerRef = useRef<number | null>(null);
  const heartbeatIntervalMsRef = useRef(HEARTBEAT_INTERVAL_MS);
  const tripRefCountsRef = useRef(new Map<string, number>());
  const tripSubscribeRetryTimersRef = useRef(new Map<string, number>());
  const subscribedTripsRef = useRef(new Set<string>());
  const lastCursorSentRef = useRef(new Map<string, { x: number; y: number; at: number }>());
  const cursorPendingRef = useRef(new Map<string, { x: number; y: number }>());
  const cursorTimersRef = useRef(new Map<string, number>());
  const previewPendingRef = useRef(new Map<string, LiveItemPreviewPayload | null>());
  const previewTimersRef = useRef(new Map<string, number>());
  const lastPreviewPayloadRef = useRef(new Map<string, string | null>());
  const lastSelectionPayloadRef = useRef(new Map<string, string | null>());
  const lastSelectionStateRef = useRef(new Map<string, SelectionPayload | null>());
  const lastViewportSentRef = useRef(new Map<string, { payload: ViewportPayload; at: number }>());
  const lastViewportStateRef = useRef(new Map<string, ViewportPayload | null>());
  const viewportPendingRef = useRef(new Map<string, ViewportPayload | null>());
  const viewportTimersRef = useRef(new Map<string, number>());

  const cleanupSocket = useCallback(() => {
    if (reconnectTimerRef.current !== null) {
      window.clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
    if (heartbeatTimerRef.current !== null) {
      window.clearInterval(heartbeatTimerRef.current);
      heartbeatTimerRef.current = null;
    }
    for (const timerId of tripSubscribeRetryTimersRef.current.values()) {
      window.clearTimeout(timerId);
    }
    tripSubscribeRetryTimersRef.current.clear();
    for (const timerId of cursorTimersRef.current.values()) {
      window.clearTimeout(timerId);
    }
    cursorTimersRef.current.clear();
    for (const timerId of previewTimersRef.current.values()) {
      window.clearTimeout(timerId);
    }
    previewTimersRef.current.clear();
    for (const timerId of viewportTimersRef.current.values()) {
      window.clearTimeout(timerId);
    }
    viewportTimersRef.current.clear();
    if (socketRef.current) {
      socketRef.current.close();
      socketRef.current = null;
    }
  }, []);

  const sendMessage = useCallback((payload: unknown) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify(payload));
    }
  }, []);

  const dismissRemoteEditNotice = useCallback((tripId: string) => {
    setNoticesByTrip((current) => {
      if (!current[tripId]) return current;
      const next = { ...current };
      delete next[tripId];
      return next;
    });
  }, []);

  const clearSubscribeRetry = useCallback((tripId: string) => {
    const timerId = tripSubscribeRetryTimersRef.current.get(tripId);
    if (timerId !== undefined) {
      window.clearTimeout(timerId);
      tripSubscribeRetryTimersRef.current.delete(tripId);
    }
  }, []);

  const scheduleSubscribeRetry = useCallback(
    (tripId: string) => {
      clearSubscribeRetry(tripId);

      const timerId = window.setTimeout(() => {
        tripSubscribeRetryTimersRef.current.delete(tripId);

        if (!tripRefCountsRef.current.has(tripId)) return;
        if (subscribedTripsRef.current.has(tripId)) return;
        if (socketRef.current?.readyState !== WebSocket.OPEN) return;

        sendMessage({ type: 'trip.subscribe', tripId });
        scheduleSubscribeRetry(tripId);
      }, 1000);

      tripSubscribeRetryTimersRef.current.set(tripId, timerId);
    },
    [clearSubscribeRetry, sendMessage],
  );

  const flushCursor = useCallback(
    (tripId: string) => {
      const pending = cursorPendingRef.current.get(tripId);
      if (!pending || !subscribedTripsRef.current.has(tripId)) return;

      const last = lastCursorSentRef.current.get(tripId);
      if (
        last &&
        Math.abs(last.x - pending.x) < CURSOR_EPSILON_NORMALIZED &&
        Math.abs(last.y - pending.y) < CURSOR_EPSILON_NORMALIZED
      ) {
        return;
      }

      sendMessage({
        type: 'presence.cursor',
        tripId,
        x: pending.x,
        y: pending.y,
      });
      lastCursorSentRef.current.set(tripId, {
        x: pending.x,
        y: pending.y,
        at: Date.now(),
      });
    },
    [sendMessage],
  );

  const flushPreview = useCallback(
    (tripId: string) => {
      const preview = previewPendingRef.current.get(tripId);
      const serialized = preview ? JSON.stringify(preview) : null;
      if (lastPreviewPayloadRef.current.get(tripId) === serialized) return;
      lastPreviewPayloadRef.current.set(tripId, serialized);

      if (!subscribedTripsRef.current.has(tripId)) return;

      if (!preview) {
        sendMessage({
          type: 'presence.item-preview.clear',
          tripId,
        });
        return;
      }

      sendMessage({
        type: 'presence.item-preview',
        tripId,
        itemId: preview.itemId,
        dayId: preview.dayId,
        scheduledStart: preview.scheduledStart,
        scheduledEnd: preview.scheduledEnd,
        durationMinutes: preview.durationMinutes,
        mode: preview.mode,
      });
    },
    [sendMessage],
  );

  const flushViewport = useCallback(
    (tripId: string) => {
      const viewport = viewportPendingRef.current.get(tripId);
      if (!subscribedTripsRef.current.has(tripId)) return;

      if (!viewport) {
        sendMessage({
          type: 'presence.viewport.clear',
          tripId,
        });
        lastViewportSentRef.current.delete(tripId);
        return;
      }

      const last = lastViewportSentRef.current.get(tripId);
      const mapCameraMatches =
        (!last?.payload.mapCamera && !viewport.mapCamera) ||
        (Boolean(last?.payload.mapCamera) &&
          Boolean(viewport.mapCamera) &&
          Math.abs((last?.payload.mapCamera?.center.lat ?? 0) - (viewport.mapCamera?.center.lat ?? 0)) <
            VIEWPORT_CENTER_EPSILON &&
          Math.abs((last?.payload.mapCamera?.center.lng ?? 0) - (viewport.mapCamera?.center.lng ?? 0)) <
            VIEWPORT_CENTER_EPSILON &&
          Math.abs((last?.payload.mapCamera?.zoom ?? 0) - (viewport.mapCamera?.zoom ?? 0)) <
            VIEWPORT_ZOOM_EPSILON);
      if (
        last &&
        Math.abs(last.payload.scrollLeft - viewport.scrollLeft) < VIEWPORT_SCROLL_EPSILON_PX &&
        Math.abs(last.payload.scrollTop - viewport.scrollTop) < VIEWPORT_SCROLL_EPSILON_PX &&
        Math.abs(last.payload.zoom - viewport.zoom) < VIEWPORT_ZOOM_EPSILON &&
        last.payload.viewMode === viewport.viewMode &&
        last.payload.focusedDayId === viewport.focusedDayId &&
        last.payload.activeTab === viewport.activeTab &&
        last.payload.workspaceLayout === viewport.workspaceLayout &&
        last.payload.selectedDayId === viewport.selectedDayId &&
        Math.abs((last.payload.itineraryScrollTop ?? 0) - (viewport.itineraryScrollTop ?? 0)) <
          VIEWPORT_SCROLL_EPSILON_PX &&
        last.payload.mapEventFilter === viewport.mapEventFilter &&
        mapCameraMatches
      ) {
        return;
      }

      sendMessage({
        type: 'presence.viewport',
        tripId,
        viewMode: viewport.viewMode,
        focusedDayId: viewport.focusedDayId,
        scrollLeft: viewport.scrollLeft,
        scrollTop: viewport.scrollTop,
        zoom: viewport.zoom,
        activeTab: viewport.activeTab,
        workspaceLayout: viewport.workspaceLayout,
        selectedDayId: viewport.selectedDayId,
        itineraryScrollTop: viewport.itineraryScrollTop,
        mapEventFilter: viewport.mapEventFilter,
        mapCamera: viewport.mapCamera,
      });
      lastViewportSentRef.current.set(tripId, {
        payload: viewport,
        at: Date.now(),
      });
    },
    [sendMessage],
  );

  useEffect(() => {
    if (!isAuthenticated || !user) {
      cleanupSocket();
      setConnectionState('disconnected');
      setLocalConnectionId(null);
      localConnectionIdRef.current = null;
      setRealtimeConnectionId(null);
      subscribedTripsRef.current.clear();
      collaborationStore.clearAll();
      setNoticesByTrip({});
      return;
    }

    let cancelled = false;
    setConnectionState('connecting');

    const connect = () => {
      if (cancelled) return;

      const socket = new WebSocket(buildRealtimeUrl());
      socketRef.current = socket;

      socket.addEventListener('open', () => {
        if (cancelled) return;
        setConnectionState('connected');
        for (const tripId of tripRefCountsRef.current.keys()) {
          collaborationStore.markTripReconnecting(tripId, true);
          sendMessage({ type: 'trip.subscribe', tripId });
          scheduleSubscribeRetry(tripId);
        }
      });

      socket.addEventListener('message', (messageEvent) => {
        try {
          const payload = JSON.parse(messageEvent.data) as RealtimeServerMessage;
          if (payload.type === 'presence.self') {
            setLocalConnectionId(payload.connectionId);
            localConnectionIdRef.current = payload.connectionId;
            setRealtimeConnectionId(payload.connectionId);
            heartbeatIntervalMsRef.current = payload.heartbeatIntervalMs ?? HEARTBEAT_INTERVAL_MS;
            if (heartbeatTimerRef.current !== null) {
              window.clearInterval(heartbeatTimerRef.current);
            }
            heartbeatTimerRef.current = window.setInterval(() => {
              sendMessage({ type: 'presence.heartbeat' });
            }, heartbeatIntervalMsRef.current);
            return;
          }

          if (payload.type === 'presence.snapshot') {
            subscribedTripsRef.current.add(payload.tripId);
            clearSubscribeRetry(payload.tripId);
            collaborationStore.applySnapshot(payload.tripId, payload.participants);

            const selection = lastSelectionStateRef.current.get(payload.tripId);
            if (selection) {
              sendMessage({
                type: 'presence.selection',
                tripId: payload.tripId,
                objectIds: selection.objectIds,
                primaryObjectId: selection.primaryObjectId,
              });
            }

            const viewport = lastViewportStateRef.current.get(payload.tripId);
            if (viewport) {
              viewportPendingRef.current.set(payload.tripId, viewport);
              flushViewport(payload.tripId);
            }

            const preview = previewPendingRef.current.get(payload.tripId);
            if (preview !== undefined) {
              flushPreview(payload.tripId);
            }
            return;
          }

          if (payload.type === 'presence.diff') {
            collaborationStore.applyDiff(
              payload.tripId,
              payload.participantsUpsert,
              payload.removeConnectionIds,
            );
            return;
          }

          if (payload.type === 'trip.event') {
            const { event } = payload;
            const queryKey = getTripQueryKey(event.tripId);
            const current = queryClient.getQueryData<TripSnapshotResponse>(queryKey);
            const isRemoteChange = isRemoteTripEvent(event, user.id, localConnectionIdRef.current);
            const shouldRefetchTrip = shouldRefetchTripForEvent(event, Boolean(current), isRemoteChange);
            if (event.type !== 'snapshot.restored' && current) {
              queryClient.setQueryData<TripSnapshotResponse>(queryKey, (snapshot) => {
                if (!snapshot) return snapshot;
                return applyTripEvent(snapshot, event) ?? snapshot;
              });
            }
            if (shouldRefetchTrip) {
              void queryClient.invalidateQueries({ queryKey });
            }

            if (event.type !== 'invite.created' && event.type !== 'invite.removed') {
              void queryClient.invalidateQueries({ queryKey: ['trips'] });
            }
          }
        } catch (error) {
          console.error(error);
        }
      });

      socket.addEventListener('close', (event) => {
        if (cancelled) return;
        socketRef.current = null;
        setConnectionState('disconnected');
        setLocalConnectionId(null);
        localConnectionIdRef.current = null;
        setRealtimeConnectionId(null);
        subscribedTripsRef.current.clear();
        lastCursorSentRef.current.clear();
        if (heartbeatTimerRef.current !== null) {
          window.clearInterval(heartbeatTimerRef.current);
          heartbeatTimerRef.current = null;
        }
        for (const tripId of tripRefCountsRef.current.keys()) {
          collaborationStore.markTripReconnecting(tripId, true);
        }
        if (event.code === 4401 || event.code === 4403) {
          void refreshSession();
          return;
        }
        reconnectTimerRef.current = window.setTimeout(() => {
          setConnectionState('connecting');
          connect();
        }, 2000);
      });
    };

    connect();

    return () => {
      cancelled = true;
      cleanupSocket();
      setConnectionState('disconnected');
      setLocalConnectionId(null);
      localConnectionIdRef.current = null;
      setRealtimeConnectionId(null);
      setNoticesByTrip({});
      collaborationStore.clearAll();
    };
  }, [cleanupSocket, clearSubscribeRetry, flushPreview, flushViewport, isAuthenticated, queryClient, refreshSession, scheduleSubscribeRetry, sendMessage, user]);

  const subscribeToTrip = useCallback(
    (tripId: string) => {
      const currentCount = tripRefCountsRef.current.get(tripId) ?? 0;
      tripRefCountsRef.current.set(tripId, currentCount + 1);
      if (currentCount === 0) {
        sendMessage({ type: 'trip.subscribe', tripId });
        if (socketRef.current?.readyState === WebSocket.OPEN) {
          scheduleSubscribeRetry(tripId);
        }
      }
    },
    [scheduleSubscribeRetry, sendMessage],
  );

  const unsubscribeFromTrip = useCallback(
    (tripId: string) => {
      const currentCount = tripRefCountsRef.current.get(tripId) ?? 0;
      if (currentCount <= 1) {
        tripRefCountsRef.current.delete(tripId);
        subscribedTripsRef.current.delete(tripId);
        clearSubscribeRetry(tripId);
        sendMessage({ type: 'trip.unsubscribe', tripId });
        collaborationStore.clearTrip(tripId);
        lastCursorSentRef.current.delete(tripId);
        cursorPendingRef.current.delete(tripId);
        previewPendingRef.current.delete(tripId);
        lastPreviewPayloadRef.current.delete(tripId);
        lastSelectionPayloadRef.current.delete(tripId);
        lastSelectionStateRef.current.delete(tripId);
        lastViewportSentRef.current.delete(tripId);
        lastViewportStateRef.current.delete(tripId);
        viewportPendingRef.current.delete(tripId);
        return;
      }
      tripRefCountsRef.current.set(tripId, currentCount - 1);
    },
    [clearSubscribeRetry, sendMessage],
  );

  const sendCursor = useCallback(
    (tripId: string, x: number, y: number) => {
      if (!subscribedTripsRef.current.has(tripId)) {
        if (socketRef.current?.readyState === WebSocket.OPEN) {
          sendMessage({ type: 'trip.subscribe', tripId });
          scheduleSubscribeRetry(tripId);
        }
        return;
      }

      cursorPendingRef.current.set(tripId, { x, y });
      const last = lastCursorSentRef.current.get(tripId);
      const now = Date.now();

      if (!last || now - last.at >= CURSOR_SEND_INTERVAL_MS) {
        flushCursor(tripId);
        return;
      }

      if (cursorTimersRef.current.has(tripId)) return;

      const timerId = window.setTimeout(() => {
        cursorTimersRef.current.delete(tripId);
        flushCursor(tripId);
      }, CURSOR_SEND_INTERVAL_MS - (now - last.at));
      cursorTimersRef.current.set(tripId, timerId);
    },
    [flushCursor, scheduleSubscribeRetry, sendMessage],
  );

  const clearCursor = useCallback(
    (tripId: string) => {
      if (!subscribedTripsRef.current.has(tripId)) return;
      cursorPendingRef.current.delete(tripId);
      lastCursorSentRef.current.delete(tripId);
      sendMessage({
        type: 'presence.cursor.clear',
        tripId,
      });
    },
    [sendMessage],
  );

  const sendItemPreview = useCallback(
    (tripId: string, preview: LiveItemPreviewPayload | null) => {
      previewPendingRef.current.set(tripId, preview);

      if (!subscribedTripsRef.current.has(tripId)) {
        if (socketRef.current?.readyState === WebSocket.OPEN) {
          sendMessage({ type: 'trip.subscribe', tripId });
          scheduleSubscribeRetry(tripId);
        }
        return;
      }

      if (!preview) {
        flushPreview(tripId);
        return;
      }

      const existingTimer = previewTimersRef.current.get(tripId);
      if (existingTimer !== undefined) return;

      const timerId = window.setTimeout(() => {
        previewTimersRef.current.delete(tripId);
        flushPreview(tripId);
      }, ITEM_PREVIEW_SEND_INTERVAL_MS);
      previewTimersRef.current.set(tripId, timerId);
    },
    [flushPreview, scheduleSubscribeRetry, sendMessage],
  );

  const sendSelection = useCallback(
    (tripId: string, selection: SelectionPayload | null) => {
      const serialized = selection ? JSON.stringify(selection) : null;
      if (lastSelectionPayloadRef.current.get(tripId) === serialized) return;
      lastSelectionPayloadRef.current.set(tripId, serialized);
      lastSelectionStateRef.current.set(tripId, selection);

      if (!subscribedTripsRef.current.has(tripId)) return;

      if (!selection || selection.objectIds.length === 0) {
        sendMessage({
          type: 'presence.selection.clear',
          tripId,
        });
        return;
      }

      sendMessage({
        type: 'presence.selection',
        tripId,
        objectIds: selection.objectIds,
        primaryObjectId: selection.primaryObjectId,
      });
    },
    [sendMessage],
  );

  const sendViewport = useCallback(
    (tripId: string, viewport: ViewportPayload | null) => {
      lastViewportStateRef.current.set(tripId, viewport);
      viewportPendingRef.current.set(tripId, viewport);

      if (!subscribedTripsRef.current.has(tripId)) return;

      if (!viewport) {
        flushViewport(tripId);
        return;
      }

      const last = lastViewportSentRef.current.get(tripId);
      const now = Date.now();
      if (!last || now - last.at >= VIEWPORT_SEND_INTERVAL_MS) {
        flushViewport(tripId);
        return;
      }

      if (viewportTimersRef.current.has(tripId)) return;

      const timerId = window.setTimeout(() => {
        viewportTimersRef.current.delete(tripId);
        flushViewport(tripId);
      }, VIEWPORT_SEND_INTERVAL_MS - (now - last.at));
      viewportTimersRef.current.set(tripId, timerId);
    },
    [flushViewport],
  );

  const getTripParticipantsValue = useCallback((tripId: string) => getTripParticipants(tripId), []);
  const getTripCursors = useCallback(
    (tripId: string) => participantsToCursors(getTripParticipants(tripId)),
    [],
  );
  const getTripItemPreviews = useCallback(
    (tripId: string) => participantsToItemPreviews(getTripParticipants(tripId)),
    [],
  );
  const getTripSelections = useCallback(
    (tripId: string) => participantsToSelections(getTripParticipants(tripId)),
    [],
  );
  const getTripViewports = useCallback(
    (tripId: string) => participantsToViewports(getTripParticipants(tripId)),
    [],
  );
  const getRemoteEditNotice = useCallback(
    (tripId: string) => noticesByTrip[tripId] ?? null,
    [noticesByTrip],
  );

  const value = useMemo<RealtimeContextValue>(
    () => ({
      connectionState,
      localConnectionId,
      subscribeToTrip,
      unsubscribeFromTrip,
      sendCursor,
      clearCursor,
      sendItemPreview,
      sendSelection,
      sendViewport,
      getTripParticipants: getTripParticipantsValue,
      getTripCursors,
      getTripItemPreviews,
      getTripSelections,
      getTripViewports,
      getRemoteEditNotice,
      dismissRemoteEditNotice,
    }),
    [
      clearCursor,
      connectionState,
      dismissRemoteEditNotice,
      getRemoteEditNotice,
      getTripCursors,
      getTripItemPreviews,
      getTripParticipantsValue,
      getTripSelections,
      getTripViewports,
      localConnectionId,
      sendCursor,
      sendItemPreview,
      sendSelection,
      sendViewport,
      subscribeToTrip,
      unsubscribeFromTrip,
    ],
  );

  return <RealtimeContext.Provider value={value}>{children}</RealtimeContext.Provider>;
}

export function useRealtime(): RealtimeContextValue {
  const context = useContext(RealtimeContext);
  if (!context) {
    throw new Error('useRealtime must be used within <RealtimeProvider>.');
  }
  return context;
}
