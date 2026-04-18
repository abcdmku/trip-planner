import type { Day, HistoryEvent, Item, Leg, Trip } from './trip';

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  picture: string;
}

export interface TripListItem {
  id: string;
  name: string;
  baseTimezone: string;
  startDate: string;
  endDate: string;
  updatedAt: string;
  role: 'owner' | 'editor';
}

export interface TripMember {
  memberId: string;
  tripId: string;
  userId: string;
  email: string;
  name: string;
  picture: string;
  role: 'owner' | 'editor';
  createdAt: string;
}

export interface TripInvite {
  inviteId: string;
  tripId: string;
  email: string;
  role: 'owner' | 'editor';
  invitedByUserId: string;
  invitedByName: string;
  createdAt: string;
}

export interface TripSnapshotResponse {
  trip: Trip;
  days: Day[];
  items: Item[];
  legs: Leg[];
  history: HistoryEvent[];
  members: TripMember[];
  pendingInvites: TripInvite[];
  meta: Record<string, string>;
}

export interface PresenceCursor {
  connectionId: string;
  tripId: string;
  userId: string;
  name: string;
  picture: string;
  color: string;
  x: number;
  y: number;
  updatedAt: string;
}

export interface PresenceItemPreview {
  connectionId: string;
  tripId: string;
  userId: string;
  name: string;
  picture: string;
  color: string;
  itemId: string;
  dayId: string;
  scheduledStart: string;
  scheduledEnd: string;
  durationMinutes: number;
  updatedAt: string;
}

export type TripEventType =
  | 'trip.updated'
  | 'day.created'
  | 'day.updated'
  | 'day.deleted'
  | 'item.created'
  | 'item.updated'
  | 'item.deleted'
  | 'items.reordered'
  | 'leg.updated'
  | 'legs.replaced'
  | 'member.added'
  | 'member.removed'
  | 'invite.created'
  | 'invite.removed'
  | 'snapshot.restored';

export interface TripEventEnvelope {
  tripId: string;
  type: TripEventType;
  actorUserId: string;
  timestamp: string;
  trip?: Trip;
  day?: Day;
  dayId?: string;
  item?: Item;
  itemId?: string;
  items?: Item[];
  leg?: Leg;
  legs?: Leg[];
  legId?: string;
  member?: TripMember;
  memberId?: string;
  invite?: TripInvite;
  inviteId?: string;
}

export type RealtimeClientMessage =
  | {
      type: 'trip.subscribe';
      tripId: string;
    }
  | {
      type: 'trip.unsubscribe';
      tripId: string;
    }
  | {
      type: 'presence.cursor';
      tripId: string;
      x: number;
      y: number;
    }
  | {
      type: 'presence.item-preview';
      tripId: string;
      itemId: string;
      dayId: string;
      scheduledStart: string;
      scheduledEnd: string;
      durationMinutes: number;
    }
  | {
      type: 'presence.item-preview.clear';
      tripId: string;
    };

export type RealtimeServerMessage =
  | {
      type: 'presence.self';
      connectionId: string;
    }
  | {
      type: 'trip.event';
      event: TripEventEnvelope;
    }
  | {
      type: 'presence.snapshot';
      tripId: string;
      cursors: PresenceCursor[];
      itemPreviews: PresenceItemPreview[];
    }
  | {
      type: 'presence.diff';
      tripId: string;
      upsert: PresenceCursor[];
      removeConnectionIds: string[];
      previewUpsert: PresenceItemPreview[];
      previewRemoveConnectionIds: string[];
    };
