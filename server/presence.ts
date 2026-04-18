import type { WebSocket } from '@fastify/websocket';
import type {
  SessionUser,
  PresenceCursor,
  PresenceItemPreview,
  TripEventEnvelope,
} from '../src/types/api';

interface ConnectionState {
  connectionId: string;
  socket: WebSocket;
  user: SessionUser;
  trips: Set<string>;
  color: string;
}

const PRESENCE_COLORS = [
  '#2563EB',
  '#DC2626',
  '#16A34A',
  '#9333EA',
  '#EA580C',
  '#0891B2',
  '#CA8A04',
  '#DB2777',
];

function safeSend(socket: WebSocket, payload: unknown): void {
  if (socket.readyState !== socket.OPEN) return;
  socket.send(JSON.stringify(payload));
}

function colorForUser(userId: string): string {
  let hash = 0;
  for (let i = 0; i < userId.length; i += 1) {
    hash = (hash * 31 + userId.charCodeAt(i)) >>> 0;
  }
  return PRESENCE_COLORS[hash % PRESENCE_COLORS.length];
}

export class PresenceManager {
  private readonly connections = new Map<WebSocket, ConnectionState>();

  private readonly subscribersByTrip = new Map<string, Set<WebSocket>>();

  private readonly cursorsByTrip = new Map<string, Map<string, PresenceCursor>>();

  private readonly itemPreviewsByTrip = new Map<string, Map<string, PresenceItemPreview>>();

  register(socket: WebSocket, user: SessionUser): ConnectionState {
    const state: ConnectionState = {
      connectionId: crypto.randomUUID(),
      socket,
      user,
      trips: new Set<string>(),
      color: colorForUser(user.id),
    };
    this.connections.set(socket, state);
    return state;
  }

  unregister(socket: WebSocket): void {
    const state = this.connections.get(socket);
    if (!state) return;

    for (const tripId of state.trips) {
      this.unsubscribe(socket, tripId);
    }

    this.connections.delete(socket);
  }

  subscribe(socket: WebSocket, tripId: string): void {
    const state = this.connections.get(socket);
    if (!state) return;

    state.trips.add(tripId);
    let set = this.subscribersByTrip.get(tripId);
    if (!set) {
      set = new Set();
      this.subscribersByTrip.set(tripId, set);
    }
    set.add(socket);

    const snapshot = [...(this.cursorsByTrip.get(tripId)?.values() ?? [])];
    const itemPreviews = [...(this.itemPreviewsByTrip.get(tripId)?.values() ?? [])];
    safeSend(socket, {
      type: 'presence.snapshot',
      tripId,
      cursors: snapshot,
      itemPreviews,
    });
  }

  unsubscribe(socket: WebSocket, tripId: string): void {
    const state = this.connections.get(socket);
    if (!state) return;

    state.trips.delete(tripId);
    const subscribers = this.subscribersByTrip.get(tripId);
    if (subscribers) {
      subscribers.delete(socket);
      if (subscribers.size === 0) {
        this.subscribersByTrip.delete(tripId);
      }
    }

    const removedCursorConnectionIds = this.removeTripCursor(tripId, state.connectionId);
    const removedPreviewConnectionIds = this.removeTripPreview(tripId, state.connectionId);
    if (removedCursorConnectionIds.length > 0 || removedPreviewConnectionIds.length > 0) {
      this.broadcastPresenceDiff(tripId, [], removedCursorConnectionIds, [], removedPreviewConnectionIds);
    }
  }

  updateCursor(socket: WebSocket, tripId: string, x: number, y: number): void {
    const state = this.connections.get(socket);
    if (!state || !state.trips.has(tripId)) return;

    let tripCursors = this.cursorsByTrip.get(tripId);
    if (!tripCursors) {
      tripCursors = new Map();
      this.cursorsByTrip.set(tripId, tripCursors);
    }

    const cursor: PresenceCursor = {
      connectionId: state.connectionId,
      tripId,
      userId: state.user.id,
      name: state.user.name,
      picture: state.user.picture,
      color: state.color,
      x,
      y,
      updatedAt: new Date().toISOString(),
    };
    tripCursors.set(state.connectionId, cursor);
    this.broadcastPresenceDiff(tripId, [cursor], [], [], []);
  }

  updateItemPreview(
    socket: WebSocket,
    tripId: string,
    payload: {
      itemId: string;
      dayId: string;
      scheduledStart: string;
      scheduledEnd: string;
      durationMinutes: number;
    },
  ): void {
    const state = this.connections.get(socket);
    if (!state || !state.trips.has(tripId)) return;

    let tripPreviews = this.itemPreviewsByTrip.get(tripId);
    if (!tripPreviews) {
      tripPreviews = new Map();
      this.itemPreviewsByTrip.set(tripId, tripPreviews);
    }

    const preview: PresenceItemPreview = {
      connectionId: state.connectionId,
      tripId,
      userId: state.user.id,
      name: state.user.name,
      picture: state.user.picture,
      color: state.color,
      itemId: payload.itemId,
      dayId: payload.dayId,
      scheduledStart: payload.scheduledStart,
      scheduledEnd: payload.scheduledEnd,
      durationMinutes: payload.durationMinutes,
      updatedAt: new Date().toISOString(),
    };

    tripPreviews.set(state.connectionId, preview);
    this.broadcastPresenceDiff(tripId, [], [], [preview], []);
  }

  clearItemPreview(socket: WebSocket, tripId: string): void {
    const state = this.connections.get(socket);
    if (!state || !state.trips.has(tripId)) return;

    const removedPreviewConnectionIds = this.removeTripPreview(tripId, state.connectionId);
    if (removedPreviewConnectionIds.length > 0) {
      this.broadcastPresenceDiff(tripId, [], [], [], removedPreviewConnectionIds);
    }
  }

  broadcastTripEvent(tripId: string, event: TripEventEnvelope): void {
    const subscribers = this.subscribersByTrip.get(tripId);
    if (!subscribers) return;

    for (const socket of subscribers) {
      safeSend(socket, {
        type: 'trip.event',
        event,
      });
    }
  }

  removeUserFromTrip(tripId: string, userId: string): void {
    const subscribers = this.subscribersByTrip.get(tripId);
    if (!subscribers) return;

    const removedConnectionIds: string[] = [];

    for (const socket of [...subscribers]) {
      const state = this.connections.get(socket);
      if (!state || state.user.id !== userId) continue;
      state.trips.delete(tripId);
      subscribers.delete(socket);
      removedConnectionIds.push(state.connectionId);
    }

    if (subscribers.size === 0) {
      this.subscribersByTrip.delete(tripId);
    }

    for (const connectionId of removedConnectionIds) {
      this.removeTripCursor(tripId, connectionId);
      this.removeTripPreview(tripId, connectionId);
    }

    if (removedConnectionIds.length > 0) {
      this.broadcastPresenceDiff(tripId, [], removedConnectionIds, [], removedConnectionIds);
    }
  }

  private removeTripCursor(tripId: string, connectionId: string): string[] {
    const cursors = this.cursorsByTrip.get(tripId);
    if (!cursors?.delete(connectionId)) return [];
    if (cursors.size === 0) {
      this.cursorsByTrip.delete(tripId);
    }
    return [connectionId];
  }

  private removeTripPreview(tripId: string, connectionId: string): string[] {
    const previews = this.itemPreviewsByTrip.get(tripId);
    if (!previews?.delete(connectionId)) return [];
    if (previews.size === 0) {
      this.itemPreviewsByTrip.delete(tripId);
    }
    return [connectionId];
  }

  private broadcastPresenceDiff(
    tripId: string,
    upsert: PresenceCursor[],
    removeConnectionIds: string[],
    previewUpsert: PresenceItemPreview[],
    previewRemoveConnectionIds: string[],
  ): void {
    const subscribers = this.subscribersByTrip.get(tripId);
    if (!subscribers) return;

    for (const socket of subscribers) {
      safeSend(socket, {
        type: 'presence.diff',
        tripId,
        upsert,
        removeConnectionIds,
        previewUpsert,
        previewRemoveConnectionIds,
      });
    }
  }
}
