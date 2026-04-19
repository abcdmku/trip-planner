import type { Day, HistoryEvent, Item, Leg, Trip } from './trip';
import type {
  CollaborationParticipant,
  PresenceCursor,
  PresenceItemPreview,
  PresenceMapCamera,
  PresenceMapEventFilter,
  PresenceActiveTab,
  PresenceWorkspaceLayout,
  PresenceSelection,
  PresenceViewport,
  PresencePreviewMode,
} from './collaboration';

export type {
  CollaborationParticipant,
  PresenceCursor,
  PresenceItemPreview,
  PresenceMapCamera,
  PresenceMapEventFilter,
  PresenceActiveTab,
  PresenceWorkspaceLayout,
  PresenceSelection,
  PresenceViewport,
} from './collaboration';

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
  actorConnectionId?: string | null;
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
      type: 'presence.cursor.clear';
      tripId: string;
    }
  | {
      type: 'presence.item-preview';
      tripId: string;
      itemId: string;
      dayId: string;
      scheduledStart: string;
      scheduledEnd: string;
      durationMinutes: number;
      mode?: PresencePreviewMode;
    }
  | {
      type: 'presence.item-preview.clear';
      tripId: string;
    }
  | {
      type: 'presence.selection';
      tripId: string;
      objectIds: string[];
      primaryObjectId: string | null;
    }
  | {
      type: 'presence.selection.clear';
      tripId: string;
    }
  | {
      type: 'presence.viewport';
      tripId: string;
      viewMode: 'day' | 'multi' | 'map' | 'canvas';
      focusedDayId: string | null;
      scrollLeft: number;
      scrollTop: number;
      zoom: number;
      activeTab?: PresenceActiveTab;
      workspaceLayout?: PresenceWorkspaceLayout;
      selectedDayId?: string | null;
      itineraryScrollTop?: number;
      mapEventFilter?: PresenceMapEventFilter;
      mapCamera?: PresenceMapCamera | null;
    }
  | {
      type: 'presence.viewport.clear';
      tripId: string;
    }
  | {
      type: 'presence.heartbeat';
    };

export type RealtimeServerMessage =
  | {
      type: 'presence.self';
      connectionId: string;
      heartbeatIntervalMs?: number;
      stalePresenceTtlMs?: number;
    }
  | {
      type: 'trip.event';
      event: TripEventEnvelope;
    }
  | {
      type: 'presence.snapshot';
      tripId: string;
      participants: CollaborationParticipant[];
      cursors: PresenceCursor[];
      itemPreviews: PresenceItemPreview[];
    }
  | {
      type: 'presence.diff';
      tripId: string;
      participantsUpsert: CollaborationParticipant[];
      upsert: PresenceCursor[];
      removeConnectionIds: string[];
      previewUpsert: PresenceItemPreview[];
      previewRemoveConnectionIds: string[];
    }
  | {
      type: 'presence.selection';
      tripId: string;
      selection: PresenceSelection;
    }
  | {
      type: 'presence.viewport';
      tripId: string;
      viewport: PresenceViewport;
    };
