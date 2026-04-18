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
import { buildRealtimeUrl } from '@/services/api-client';
import { clearUndoHistory } from '@/stores/undo-store';
import { getTripQueryKey } from '@/stores/trip-store';
import type {
  PresenceCursor,
  RealtimeServerMessage,
  TripEventEnvelope,
  TripSnapshotResponse,
} from '@/types/api';

type ConnectionState = 'connecting' | 'connected' | 'disconnected';

interface RealtimeContextValue {
  connectionState: ConnectionState;
  subscribeToTrip: (tripId: string) => void;
  unsubscribeFromTrip: (tripId: string) => void;
  sendCursor: (tripId: string, x: number, y: number) => void;
  getTripCursors: (tripId: string) => PresenceCursor[];
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
  const [cursorsByTrip, setCursorsByTrip] = useState<Record<string, PresenceCursor[]>>({});
  const [noticesByTrip, setNoticesByTrip] = useState<Record<string, string>>({});
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<number | null>(null);
  const tripRefCountsRef = useRef(new Map<string, number>());

  const cleanupSocket = useCallback(() => {
    if (reconnectTimerRef.current !== null) {
      window.clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
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

  useEffect(() => {
    if (!isAuthenticated || !user) {
      cleanupSocket();
      setConnectionState('disconnected');
      setCursorsByTrip({});
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
          sendMessage({ type: 'trip.subscribe', tripId });
        }
      });

      socket.addEventListener('message', (messageEvent) => {
        try {
          const payload = JSON.parse(messageEvent.data) as RealtimeServerMessage;
          if (payload.type === 'presence.snapshot') {
            setCursorsByTrip((current) => ({
              ...current,
              [payload.tripId]: payload.cursors,
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
            return;
          }

          if (payload.type === 'trip.event') {
            const { event } = payload;
            const queryKey = getTripQueryKey(event.tripId);
            const current = queryClient.getQueryData<TripSnapshotResponse>(queryKey);
            if (event.type === 'snapshot.restored') {
              void queryClient.invalidateQueries({ queryKey });
            } else if (current) {
              queryClient.setQueryData<TripSnapshotResponse>(queryKey, (snapshot) => {
                if (!snapshot) return snapshot;
                return applyTripEvent(snapshot, event) ?? snapshot;
              });
            }

            if (event.actorUserId !== user.id) {
              clearUndoHistory(event.tripId);
              setNoticesByTrip((currentNotices) => ({
                ...currentNotices,
                [event.tripId]: 'Undo history was cleared because another user edited this trip.',
              }));
            }

            if (
              event.type === 'trip.updated' ||
              event.type === 'member.added' ||
              event.type === 'member.removed'
            ) {
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
    };
  }, [cleanupSocket, isAuthenticated, queryClient, refreshSession, sendMessage, user]);

  const subscribeToTrip = useCallback(
    (tripId: string) => {
      const currentCount = tripRefCountsRef.current.get(tripId) ?? 0;
      tripRefCountsRef.current.set(tripId, currentCount + 1);
      if (currentCount === 0) {
        sendMessage({ type: 'trip.subscribe', tripId });
      }
    },
    [sendMessage],
  );

  const unsubscribeFromTrip = useCallback(
    (tripId: string) => {
      const currentCount = tripRefCountsRef.current.get(tripId) ?? 0;
      if (currentCount <= 1) {
        tripRefCountsRef.current.delete(tripId);
        sendMessage({ type: 'trip.unsubscribe', tripId });
        setCursorsByTrip((current) => {
          if (!current[tripId]) return current;
          const next = { ...current };
          delete next[tripId];
          return next;
        });
        return;
      }
      tripRefCountsRef.current.set(tripId, currentCount - 1);
    },
    [sendMessage],
  );

  const sendCursor = useCallback(
    (tripId: string, x: number, y: number) => {
      sendMessage({
        type: 'presence.cursor',
        tripId,
        x,
        y,
      });
    },
    [sendMessage],
  );

  const getTripCursors = useCallback(
    (tripId: string) => cursorsByTrip[tripId] ?? [],
    [cursorsByTrip],
  );

  const getRemoteEditNotice = useCallback(
    (tripId: string) => noticesByTrip[tripId] ?? null,
    [noticesByTrip],
  );

  const value = useMemo<RealtimeContextValue>(
    () => ({
      connectionState,
      subscribeToTrip,
      unsubscribeFromTrip,
      sendCursor,
      getTripCursors,
      getRemoteEditNotice,
      dismissRemoteEditNotice,
    }),
    [
      connectionState,
      dismissRemoteEditNotice,
      getRemoteEditNotice,
      getTripCursors,
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
