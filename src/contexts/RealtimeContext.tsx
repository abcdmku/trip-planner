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
  getCommittedPreviewConnectionIds,
  isRemoteTripEvent,
  mergeTripItemPreviewDiff,
  removeTripItemPreviewConnections,
  shouldRefetchTripForEvent,
} from '@/lib/realtime';
import { buildRealtimeUrl, setRealtimeConnectionId } from '@/services/api-client';
import { getTripQueryKey } from '@/stores/trip-store';
import type {
  PresenceCursor,
  PresenceItemPreview,
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
}

interface RealtimeContextValue {
  connectionState: ConnectionState;
  localConnectionId: string | null;
  subscribeToTrip: (tripId: string) => void;
  unsubscribeFromTrip: (tripId: string) => void;
  sendCursor: (tripId: string, x: number, y: number) => void;
  clearCursor: (tripId: string) => void;
  sendItemPreview: (tripId: string, preview: LiveItemPreviewPayload | null) => void;
  getTripCursors: (tripId: string) => PresenceCursor[];
  getTripItemPreviews: (tripId: string) => PresenceItemPreview[];
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

export function RealtimeProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const { user, isAuthenticated, refreshSession } = useAuth();
  const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected');
  const [localConnectionId, setLocalConnectionId] = useState<string | null>(null);
  const [cursorsByTrip, setCursorsByTrip] = useState<Record<string, PresenceCursor[]>>({});
  const [itemPreviewsByTrip, setItemPreviewsByTrip] = useState<Record<string, PresenceItemPreview[]>>({});
  const [noticesByTrip, setNoticesByTrip] = useState<Record<string, string>>({});
  const socketRef = useRef<WebSocket | null>(null);
  const localConnectionIdRef = useRef<string | null>(null);
  const reconnectTimerRef = useRef<number | null>(null);
  const tripRefCountsRef = useRef(new Map<string, number>());
  const tripSubscribeRetryTimersRef = useRef(new Map<string, number>());
  const previewClearTimersRef = useRef(new Map<string, number>());
  const subscribedTripsRef = useRef(new Set<string>());
  const lastCursorPayloadRef = useRef(new Map<string, string>());
  const lastItemPreviewPayloadRef = useRef(new Map<string, string | null>());

  const cleanupSocket = useCallback(() => {
    if (reconnectTimerRef.current !== null) {
      window.clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
    for (const timerId of tripSubscribeRetryTimersRef.current.values()) {
      window.clearTimeout(timerId);
    }
    tripSubscribeRetryTimersRef.current.clear();
    for (const timerId of previewClearTimersRef.current.values()) {
      window.clearTimeout(timerId);
    }
    previewClearTimersRef.current.clear();
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

  const getPreviewTimerKey = useCallback((tripId: string, connectionId: string) => `${tripId}:${connectionId}`, []);

  const removeTripItemPreviews = useCallback((tripId: string, connectionIds: string[]) => {
    if (connectionIds.length === 0) return;

    setItemPreviewsByTrip((current) => {
      const existing = current[tripId] ?? [];
      if (existing.length === 0) return current;

      const next = removeTripItemPreviewConnections(existing, connectionIds);
      if (next.length === existing.length) return current;

      return {
        ...current,
        [tripId]: next,
      };
    });
  }, []);

  const cancelPreviewClear = useCallback(
    (tripId: string, connectionId: string) => {
      const key = getPreviewTimerKey(tripId, connectionId);
      const timerId = previewClearTimersRef.current.get(key);
      if (timerId !== undefined) {
        window.clearTimeout(timerId);
        previewClearTimersRef.current.delete(key);
      }
    },
    [getPreviewTimerKey],
  );

  const schedulePreviewClear = useCallback(
    (tripId: string, connectionId: string) => {
      cancelPreviewClear(tripId, connectionId);

      const key = getPreviewTimerKey(tripId, connectionId);
      const timerId = window.setTimeout(() => {
        previewClearTimersRef.current.delete(key);
        removeTripItemPreviews(tripId, [connectionId]);
      }, 1500);

      previewClearTimersRef.current.set(key, timerId);
    },
    [cancelPreviewClear, getPreviewTimerKey, removeTripItemPreviews],
  );

  const finalizePreviewForTripEvent = useCallback(
    (event: TripEventEnvelope) => {
      const connectionIds = getCommittedPreviewConnectionIds(event);
      if (connectionIds.length === 0) return;

      for (const connectionId of connectionIds) {
        cancelPreviewClear(event.tripId, connectionId);
      }
      removeTripItemPreviews(event.tripId, connectionIds);
    },
    [cancelPreviewClear, removeTripItemPreviews],
  );

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

  useEffect(() => {
    if (!isAuthenticated || !user) {
      cleanupSocket();
      setConnectionState('disconnected');
      setLocalConnectionId(null);
      localConnectionIdRef.current = null;
      setRealtimeConnectionId(null);
        subscribedTripsRef.current.clear();
        setCursorsByTrip({});
        setItemPreviewsByTrip({});
        setNoticesByTrip({});
        lastCursorPayloadRef.current.clear();
        lastItemPreviewPayloadRef.current.clear();
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
        setLocalConnectionId(null);
        localConnectionIdRef.current = null;
        setRealtimeConnectionId(null);
        subscribedTripsRef.current.clear();
        lastCursorPayloadRef.current.clear();
        lastItemPreviewPayloadRef.current.clear();
        for (const tripId of tripRefCountsRef.current.keys()) {
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
            return;
          }

          if (payload.type === 'presence.snapshot') {
            subscribedTripsRef.current.add(payload.tripId);
            clearSubscribeRetry(payload.tripId);
            for (const preview of payload.itemPreviews) {
              cancelPreviewClear(payload.tripId, preview.connectionId);
            }
            setCursorsByTrip((current) => ({
              ...current,
              [payload.tripId]: payload.cursors,
            }));
            setItemPreviewsByTrip((current) => ({
              ...current,
              [payload.tripId]: payload.itemPreviews,
            }));
            return;
          }

          if (payload.type === 'presence.diff') {
            setCursorsByTrip((current) => {
              const existing = current[payload.tripId] ?? [];
              const next = new Map(existing.map((cursor) => [cursor.connectionId, cursor]));
              for (const connectionId of payload.removeConnectionIds) {
                next.delete(connectionId);
              }
              for (const cursor of payload.upsert) {
                next.set(cursor.connectionId, cursor);
              }
              return {
                ...current,
                [payload.tripId]: [...next.values()],
              };
            });
            for (const connectionId of payload.previewRemoveConnectionIds) {
              schedulePreviewClear(payload.tripId, connectionId);
            }
            for (const preview of payload.previewUpsert) {
              cancelPreviewClear(payload.tripId, preview.connectionId);
            }
            setItemPreviewsByTrip((current) => {
              const existing = current[payload.tripId] ?? [];
              const next = mergeTripItemPreviewDiff(existing, payload.previewUpsert);
              return {
                ...current,
                [payload.tripId]: next,
              };
            });
            return;
          }

          if (payload.type === 'trip.event') {
            const { event } = payload;
            finalizePreviewForTripEvent(event);
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
        setCursorsByTrip({});
        setItemPreviewsByTrip({});
        lastCursorPayloadRef.current.clear();
        lastItemPreviewPayloadRef.current.clear();
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
      };
  }, [cancelPreviewClear, cleanupSocket, clearSubscribeRetry, finalizePreviewForTripEvent, isAuthenticated, queryClient, refreshSession, schedulePreviewClear, scheduleSubscribeRetry, sendMessage, user]);

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
        setCursorsByTrip((current) => {
          if (!current[tripId]) return current;
          const next = { ...current };
          delete next[tripId];
          return next;
        });
        setItemPreviewsByTrip((current) => {
          if (!current[tripId]) return current;
          const next = { ...current };
          delete next[tripId];
          return next;
        });
        lastCursorPayloadRef.current.delete(tripId);
        lastItemPreviewPayloadRef.current.delete(tripId);
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
      const normalized = `${x.toFixed(4)}:${y.toFixed(4)}`;
      if (lastCursorPayloadRef.current.get(tripId) === normalized) {
        return;
      }
      lastCursorPayloadRef.current.set(tripId, normalized);
      sendMessage({
        type: 'presence.cursor',
        tripId,
        x,
        y,
      });
    },
    [scheduleSubscribeRetry, sendMessage],
  );

  const clearCursor = useCallback(
    (tripId: string) => {
      if (!subscribedTripsRef.current.has(tripId)) return;
      lastCursorPayloadRef.current.delete(tripId);
      sendMessage({
        type: 'presence.cursor.clear',
        tripId,
      });
    },
    [sendMessage],
  );

  const sendItemPreview = useCallback(
    (tripId: string, preview: LiveItemPreviewPayload | null) => {
      if (!subscribedTripsRef.current.has(tripId)) {
        if (socketRef.current?.readyState === WebSocket.OPEN) {
          sendMessage({ type: 'trip.subscribe', tripId });
          scheduleSubscribeRetry(tripId);
        }
        return;
      }
      const serialized = preview ? JSON.stringify(preview) : null;
      if (lastItemPreviewPayloadRef.current.get(tripId) === serialized) {
        return;
      }
      lastItemPreviewPayloadRef.current.set(tripId, serialized);

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
      });
    },
    [scheduleSubscribeRetry, sendMessage],
  );

  const getTripCursors = useCallback(
    (tripId: string) => cursorsByTrip[tripId] ?? [],
    [cursorsByTrip],
  );

  const getTripItemPreviews = useCallback(
    (tripId: string) => itemPreviewsByTrip[tripId] ?? [],
    [itemPreviewsByTrip],
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
      getTripCursors,
      getTripItemPreviews,
      getRemoteEditNotice,
      dismissRemoteEditNotice,
    }),
    [
      connectionState,
      localConnectionId,
      dismissRemoteEditNotice,
      getRemoteEditNotice,
      getTripCursors,
      getTripItemPreviews,
      clearCursor,
      sendItemPreview,
      sendCursor,
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
