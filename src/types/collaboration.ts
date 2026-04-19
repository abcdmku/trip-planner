export type CollaborationStatus = 'active' | 'reconnecting';

export type PresencePreviewMode = 'move' | 'resize' | 'append' | 'point' | 'create' | 'edit' | 'transform';
export type PresenceActiveTab = 'map' | 'itinerary' | 'timeline';
export type PresenceMapEventFilter = 'all' | 'committed';
export type PresenceWorkspaceLayout = 'split' | 'tabbed';

export type CollaborationManipulationKind = 'move' | 'resize' | 'rotate' | 'edit' | 'transform';

export interface PresenceMapCamera {
  center: {
    lat: number;
    lng: number;
  };
  zoom: number;
}

export interface PresenceMapOpenLocation {
  placeId: string | null;
  position: {
    lat: number;
    lng: number;
  };
  name?: string;
  address?: string;
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
  mode?: PresencePreviewMode;
  updatedAt: string;
}

export interface PresenceSelection {
  connectionId: string;
  tripId: string;
  userId: string;
  objectIds: string[];
  primaryObjectId: string | null;
  updatedAt: string;
}

export interface PresenceViewport {
  connectionId: string;
  tripId: string;
  userId: string;
  viewMode: 'day' | 'multi' | 'map' | 'canvas';
  focusedDayId: string | null;
  scrollLeft: number;
  scrollTop: number;
  zoom: number;
  activeTab?: PresenceActiveTab;
  workspaceLayout?: PresenceWorkspaceLayout;
  leftPanelWidth?: number;
  selectedDayId?: string | null;
  itineraryScrollTop?: number;
  mapEventFilter?: PresenceMapEventFilter;
  mapCamera?: PresenceMapCamera | null;
  mapOpenLocation?: PresenceMapOpenLocation | null;
  updatedAt: string;
}

export interface PresenceManipulation {
  connectionId: string;
  tripId: string;
  userId: string;
  objectId: string;
  kind: CollaborationManipulationKind;
  label: string;
  updatedAt: string;
}

export interface CollaborationParticipant {
  connectionId: string;
  tripId: string;
  userId: string;
  name: string;
  picture: string;
  color: string;
  status: CollaborationStatus;
  joinedAt: string;
  lastSeenAt: string;
  cursor: PresenceCursor | null;
  itemPreview: PresenceItemPreview | null;
  selection: PresenceSelection | null;
  viewport: PresenceViewport | null;
  manipulation: PresenceManipulation | null;
}

export interface CollaborationRoomSnapshot {
  participants: CollaborationParticipant[];
  isReconnecting: boolean;
}

export interface RemoteObjectPresence {
  connectionId: string;
  userId: string;
  name: string;
  picture: string;
  color: string;
  kind: 'selection' | CollaborationManipulationKind;
  label: string;
}
