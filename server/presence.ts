import type { WebSocket } from '@fastify/websocket';
import type {
  SessionUser,
  RealtimeServerMessage,
  TripEventEnvelope,
} from '../src/types/api';
import type {
  CollaborationParticipant,
  PresenceItemPreview,
  PresenceViewport,
} from '../src/types/collaboration';
import { buildManipulationFromPreview, cloneParticipant } from '../src/lib/collaboration/state';

interface ConnectionState {
  connectionId: string;
  socket: WebSocket;
  user: SessionUser;
  trips: Set<string>;
  color: string;
  joinedAt: string;
  lastSeenAt: number;
}

interface RoomState {
  participants: Map<string, CollaborationParticipant>;
  subscribers: Set<WebSocket>;
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

const WEBSOCKET_OPEN_STATE = 1;
const HEARTBEAT_TIMEOUT_MS = 25_000;
const HEARTBEAT_SWEEP_MS = 1_000;

function safeSend(socket: WebSocket, payload: RealtimeServerMessage): void {
  if (socket.readyState !== WEBSOCKET_OPEN_STATE) return;
  socket.send(JSON.stringify(payload));
}

function colorForUser(userId: string): string {
  let hash = 0;
  for (let index = 0; index < userId.length; index += 1) {
    hash = (hash * 31 + userId.charCodeAt(index)) >>> 0;
  }
  return PRESENCE_COLORS[hash % PRESENCE_COLORS.length];
}

function cloneParticipants(participants: Map<string, CollaborationParticipant>): CollaborationParticipant[] {
  return [...participants.values()].map(cloneParticipant);
}

export class PresenceManager {
  private readonly connections = new Map<WebSocket, ConnectionState>();

  private readonly roomsByTrip = new Map<string, RoomState>();

  private readonly cleanupHandle: ReturnType<typeof setInterval>;

  constructor() {
    this.cleanupHandle = setInterval(() => {
      this.sweepStaleConnections();
    }, HEARTBEAT_SWEEP_MS);
    this.cleanupHandle.unref?.();
  }

  dispose(): void {
    clearInterval(this.cleanupHandle);
  }

  register(socket: WebSocket, user: SessionUser): ConnectionState {
    const now = Date.now();
    const state: ConnectionState = {
      connectionId: crypto.randomUUID(),
      socket,
      user,
      trips: new Set<string>(),
      color: colorForUser(user.id),
      joinedAt: new Date(now).toISOString(),
      lastSeenAt: now,
    };
    this.connections.set(socket, state);
    return state;
  }

  unregister(socket: WebSocket): void {
    const state = this.connections.get(socket);
    if (!state) return;

    for (const tripId of [...state.trips]) {
      this.unsubscribe(socket, tripId);
    }

    this.connections.delete(socket);
  }

  recordHeartbeat(socket: WebSocket): void {
    const state = this.connections.get(socket);
    if (!state) return;
    state.lastSeenAt = Date.now();

    const nowIso = new Date(state.lastSeenAt).toISOString();
    for (const tripId of state.trips) {
      const participant = this.getParticipant(socket, tripId);
      if (!participant) continue;
      participant.lastSeenAt = nowIso;
      participant.status = 'active';
      this.broadcastPresenceDiff(tripId, [participant], []);
    }
  }

  subscribe(socket: WebSocket, tripId: string): void {
    const state = this.connections.get(socket);
    if (!state) return;

    state.lastSeenAt = Date.now();
    state.trips.add(tripId);

    const room = this.getOrCreateRoom(tripId);
    room.subscribers.add(socket);

    const participant = this.ensureParticipant(state, tripId);
    participant.status = 'active';
    participant.lastSeenAt = new Date(state.lastSeenAt).toISOString();

    safeSend(socket, this.buildSnapshotMessage(tripId, room));
    this.broadcastPresenceDiff(tripId, [participant], []);
  }

  unsubscribe(socket: WebSocket, tripId: string): void {
    const state = this.connections.get(socket);
    if (!state) return;

    state.trips.delete(tripId);
    const room = this.roomsByTrip.get(tripId);
    if (!room) return;

    room.subscribers.delete(socket);

    const participant = room.participants.get(state.connectionId);
    if (participant) {
      room.participants.delete(state.connectionId);
      this.broadcastPresenceDiff(tripId, [], [state.connectionId]);
    }

    if (room.subscribers.size === 0 && room.participants.size === 0) {
      this.roomsByTrip.delete(tripId);
    }
  }

  updateCursor(socket: WebSocket, tripId: string, x: number, y: number): void {
    const participant = this.touchParticipant(socket, tripId);
    if (!participant) return;

    participant.cursor = {
      connectionId: participant.connectionId,
      tripId,
      userId: participant.userId,
      name: participant.name,
      picture: participant.picture,
      color: participant.color,
      x,
      y,
      updatedAt: participant.lastSeenAt,
    };
    this.broadcastPresenceDiff(tripId, [participant], []);
  }

  clearCursor(socket: WebSocket, tripId: string): void {
    const participant = this.touchParticipant(socket, tripId);
    if (!participant) return;

    participant.cursor = null;
    this.broadcastPresenceDiff(tripId, [participant], []);
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
      mode?: PresenceItemPreview['mode'];
    },
  ): void {
    const participant = this.touchParticipant(socket, tripId);
    if (!participant) return;

    participant.itemPreview = {
      connectionId: participant.connectionId,
      tripId,
      userId: participant.userId,
      name: participant.name,
      picture: participant.picture,
      color: participant.color,
      itemId: payload.itemId,
      dayId: payload.dayId,
      scheduledStart: payload.scheduledStart,
      scheduledEnd: payload.scheduledEnd,
      durationMinutes: payload.durationMinutes,
      mode: payload.mode,
      updatedAt: participant.lastSeenAt,
    };
    participant.manipulation = buildManipulationFromPreview(participant.itemPreview);
    this.broadcastPresenceDiff(tripId, [participant], []);
  }

  clearItemPreview(socket: WebSocket, tripId: string): void {
    const participant = this.touchParticipant(socket, tripId);
    if (!participant) return;

    participant.itemPreview = null;
    participant.manipulation = null;
    this.broadcastPresenceDiff(tripId, [participant], []);
  }

  updateSelection(
    socket: WebSocket,
    tripId: string,
    payload: {
      objectIds: string[];
      primaryObjectId: string | null;
    },
  ): void {
    const participant = this.touchParticipant(socket, tripId);
    if (!participant) return;

    participant.selection = {
      connectionId: participant.connectionId,
      tripId,
      userId: participant.userId,
      objectIds: [...payload.objectIds],
      primaryObjectId: payload.primaryObjectId,
      updatedAt: participant.lastSeenAt,
    };
    this.broadcastPresenceDiff(tripId, [participant], []);
  }

  clearSelection(socket: WebSocket, tripId: string): void {
    const participant = this.touchParticipant(socket, tripId);
    if (!participant) return;

    participant.selection = null;
    this.broadcastPresenceDiff(tripId, [participant], []);
  }

  updateViewport(
    socket: WebSocket,
    tripId: string,
    payload: {
      viewMode: PresenceViewport['viewMode'];
      focusedDayId: string | null;
      scrollLeft: number;
      scrollTop: number;
      zoom: number;
      activeTab?: PresenceViewport['activeTab'];
      workspaceLayout?: PresenceViewport['workspaceLayout'];
      leftPanelWidth?: number;
      selectedDayId?: string | null;
      itineraryScrollTop?: number;
      mapEventFilter?: PresenceViewport['mapEventFilter'];
      mapCamera?: PresenceViewport['mapCamera'];
      mapOpenLocation?: PresenceViewport['mapOpenLocation'];
    },
  ): void {
    const participant = this.touchParticipant(socket, tripId);
    if (!participant) return;

    participant.viewport = {
      connectionId: participant.connectionId,
      tripId,
      userId: participant.userId,
      viewMode: payload.viewMode,
      focusedDayId: payload.focusedDayId,
      scrollLeft: payload.scrollLeft,
      scrollTop: payload.scrollTop,
      zoom: payload.zoom,
      activeTab: payload.activeTab,
      workspaceLayout: payload.workspaceLayout,
      leftPanelWidth: payload.leftPanelWidth,
      selectedDayId: payload.selectedDayId,
      itineraryScrollTop: payload.itineraryScrollTop,
      mapEventFilter: payload.mapEventFilter,
      mapCamera: payload.mapCamera,
      mapOpenLocation: payload.mapOpenLocation,
      updatedAt: participant.lastSeenAt,
    };
    this.broadcastPresenceDiff(tripId, [participant], []);
  }

  clearViewport(socket: WebSocket, tripId: string): void {
    const participant = this.touchParticipant(socket, tripId);
    if (!participant) return;

    participant.viewport = null;
    this.broadcastPresenceDiff(tripId, [participant], []);
  }

  broadcastTripEvent(tripId: string, event: TripEventEnvelope): void {
    const room = this.roomsByTrip.get(tripId);
    if (!room) return;

    if (event.actorConnectionId) {
      const participant = room.participants.get(event.actorConnectionId);
      if (participant) {
        participant.itemPreview = null;
        participant.manipulation = null;
        this.broadcastPresenceDiff(tripId, [participant], []);
      }
    }

    for (const socket of room.subscribers) {
      safeSend(socket, {
        type: 'trip.event',
        event,
      });
    }
  }

  removeUserFromTrip(tripId: string, userId: string): void {
    const room = this.roomsByTrip.get(tripId);
    if (!room) return;

    const removedConnectionIds: string[] = [];

    for (const [socket, state] of this.connections) {
      if (state.user.id !== userId || !state.trips.has(tripId)) continue;
      state.trips.delete(tripId);
      room.subscribers.delete(socket);
      if (room.participants.delete(state.connectionId)) {
        removedConnectionIds.push(state.connectionId);
      }
    }

    if (removedConnectionIds.length > 0) {
      this.broadcastPresenceDiff(tripId, [], removedConnectionIds);
    }

    if (room.subscribers.size === 0 && room.participants.size === 0) {
      this.roomsByTrip.delete(tripId);
    }
  }

  private getOrCreateRoom(tripId: string): RoomState {
    let room = this.roomsByTrip.get(tripId);
    if (!room) {
      room = {
        participants: new Map(),
        subscribers: new Set(),
      };
      this.roomsByTrip.set(tripId, room);
    }
    return room;
  }

  private ensureParticipant(state: ConnectionState, tripId: string): CollaborationParticipant {
    const room = this.getOrCreateRoom(tripId);
    const existing = room.participants.get(state.connectionId);
    if (existing) {
      existing.status = 'active';
      existing.lastSeenAt = new Date(state.lastSeenAt).toISOString();
      return existing;
    }

    const participant: CollaborationParticipant = {
      connectionId: state.connectionId,
      tripId,
      userId: state.user.id,
      name: state.user.name,
      picture: state.user.picture,
      color: state.color,
      status: 'active',
      joinedAt: state.joinedAt,
      lastSeenAt: new Date(state.lastSeenAt).toISOString(),
      cursor: null,
      itemPreview: null,
      selection: null,
      viewport: null,
      manipulation: null,
    };
    room.participants.set(state.connectionId, participant);
    return participant;
  }

  private getParticipant(socket: WebSocket, tripId: string): CollaborationParticipant | null {
    const state = this.connections.get(socket);
    if (!state || !state.trips.has(tripId)) return null;
    const room = this.roomsByTrip.get(tripId);
    if (!room) return null;
    return room.participants.get(state.connectionId) ?? null;
  }

  private touchParticipant(socket: WebSocket, tripId: string): CollaborationParticipant | null {
    const state = this.connections.get(socket);
    if (!state || !state.trips.has(tripId)) return null;
    state.lastSeenAt = Date.now();

    const participant = this.ensureParticipant(state, tripId);
    participant.status = 'active';
    participant.lastSeenAt = new Date(state.lastSeenAt).toISOString();
    return participant;
  }

  private buildSnapshotMessage(
    tripId: string,
    room: RoomState,
  ): Extract<RealtimeServerMessage, { type: 'presence.snapshot' }> {
    const participants = cloneParticipants(room.participants);
    return {
      type: 'presence.snapshot',
      tripId,
      participants,
      cursors: participants.flatMap((participant) => (participant.cursor ? [participant.cursor] : [])),
      itemPreviews: participants.flatMap((participant) =>
        participant.itemPreview ? [participant.itemPreview] : [],
      ),
    };
  }

  private broadcastPresenceDiff(
    tripId: string,
    participantsUpsert: CollaborationParticipant[],
    removeConnectionIds: string[],
  ): void {
    const room = this.roomsByTrip.get(tripId);
    if (!room) return;

    const upsertParticipants = participantsUpsert.map(cloneParticipant);
    const message: Extract<RealtimeServerMessage, { type: 'presence.diff' }> = {
      type: 'presence.diff',
      tripId,
      participantsUpsert: upsertParticipants,
      upsert: upsertParticipants.flatMap((participant) => (participant.cursor ? [participant.cursor] : [])),
      removeConnectionIds,
      previewUpsert: upsertParticipants.flatMap((participant) =>
        participant.itemPreview ? [participant.itemPreview] : [],
      ),
      previewRemoveConnectionIds: [],
    };

    for (const socket of room.subscribers) {
      safeSend(socket, message);
    }
  }

  private sweepStaleConnections(): void {
    const now = Date.now();
    for (const [socket, state] of this.connections) {
      if (now - state.lastSeenAt <= HEARTBEAT_TIMEOUT_MS) continue;
      this.unregister(socket);
      if (socket.readyState === WEBSOCKET_OPEN_STATE) {
        socket.close(4000, 'Presence heartbeat timed out');
      }
    }
  }
}
