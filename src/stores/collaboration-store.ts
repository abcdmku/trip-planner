import type { CollaborationParticipant, CollaborationRoomSnapshot } from '@/types/collaboration';
import { cloneParticipant } from '@/lib/collaboration/state';

interface CollaborationStoreState {
  rooms: Map<string, CollaborationRoomSnapshot>;
}

type Listener = () => void;

const EMPTY_PARTICIPANTS: CollaborationParticipant[] = [];
const EMPTY_ROOM: CollaborationRoomSnapshot = {
  participants: EMPTY_PARTICIPANTS,
  isReconnecting: false,
};

class CollaborationStore {
  private state: CollaborationStoreState = {
    rooms: new Map(),
  };

  private readonly listeners = new Set<Listener>();

  subscribe = (listener: Listener): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  getRoomSnapshot = (tripId: string): CollaborationRoomSnapshot => {
    return this.state.rooms.get(tripId) ?? EMPTY_ROOM;
  };

  applySnapshot = (tripId: string, participants: CollaborationParticipant[]): void => {
    const rooms = new Map(this.state.rooms);
    rooms.set(tripId, {
      participants: participants.map(cloneParticipant),
      isReconnecting: false,
    });
    this.state = { rooms };
    this.emit();
  };

  applyDiff = (
    tripId: string,
    participantsUpsert: CollaborationParticipant[],
    removeConnectionIds: string[],
  ): void => {
    const current = this.getRoomSnapshot(tripId);
    const next = new Map(
      current.participants.map((participant) => [participant.connectionId, cloneParticipant(participant)]),
    );

    for (const connectionId of removeConnectionIds) {
      next.delete(connectionId);
    }
    for (const participant of participantsUpsert) {
      next.set(participant.connectionId, cloneParticipant(participant));
    }

    const rooms = new Map(this.state.rooms);
    rooms.set(tripId, {
      participants: [...next.values()],
      isReconnecting: current.isReconnecting,
    });
    this.state = { rooms };
    this.emit();
  };

  markTripReconnecting = (tripId: string, isReconnecting: boolean): void => {
    const current = this.getRoomSnapshot(tripId);
    const rooms = new Map(this.state.rooms);
    rooms.set(tripId, {
      participants: current.participants.map(cloneParticipant),
      isReconnecting,
    });
    this.state = { rooms };
    this.emit();
  };

  clearTrip = (tripId: string): void => {
    if (!this.state.rooms.has(tripId)) return;
    const rooms = new Map(this.state.rooms);
    rooms.delete(tripId);
    this.state = { rooms };
    this.emit();
  };

  clearAll = (): void => {
    if (this.state.rooms.size === 0) return;
    this.state = {
      rooms: new Map(),
    };
    this.emit();
  };

  private emit(): void {
    for (const listener of this.listeners) {
      listener();
    }
  }
}

export const collaborationStore = new CollaborationStore();
