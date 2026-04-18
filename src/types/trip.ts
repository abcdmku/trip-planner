// ---------------------------------------------------------------------------
// Core domain types for the Trip Planner application.
// Every Google-Sheets row maps 1-to-1 to one of these interfaces.
// ---------------------------------------------------------------------------

/** Categorisation of a place / stop on the itinerary. */
export type ItemType =
  | 'attraction'
  | 'restaurant'
  | 'hotel'
  | 'transport'
  | 'activity'
  | 'other';

/** Mode used for leg-by-leg navigation between items. */
export type TransportMode = 'driving' | 'walking' | 'bicycling' | 'transit' | 'flight' | 'other';

// ---------------------------------------------------------------------------
// Row-level interfaces (one row per record in the corresponding Sheet tab)
// ---------------------------------------------------------------------------

/** Top-level trip metadata (exactly one row in the "Trip" tab). */
export interface Trip {
  id: string;
  name: string;
  baseTimezone: string;
  startDate: string; // ISO date  e.g. "2025-08-01"
  endDate: string;   // ISO date
  defaultMode: TransportMode;
  startLat: number;
  startLng: number;
  startName: string;
  startAddress: string;
  version?: number;
  createdAt?: string;
  updatedAt?: string;
  updatedByUserId?: string | null;
}

/** A single calendar day within the trip ("Days" tab). */
export interface Day {
  dayId: string;
  date: string;      // ISO date
  label: string;
  colorHex: string;  // e.g. "#3B82F6"
  dayStart: string;  // HH:mm  e.g. "08:00"
  dayEnd: string;    // HH:mm
  version?: number;
  createdAt?: string;
  updatedAt?: string;
  updatedByUserId?: string | null;
}

/** A stop / place on the itinerary ("Items" tab). */
export interface Item {
  itemId: string;
  dayId: string;
  placeId: string;
  placeName: string;
  lat: number;
  lng: number;
  address: string;
  type: ItemType;
  scheduledStart: string;   // ISO datetime
  scheduledEnd: string;     // ISO datetime
  durationMinutes: number;
  notesMd: string;
  photoUrls: string[];
  availabilityWindows: string; // JSON-encoded availability payload (legacy weekly/date or v3 mixed entries)
  isOptional: boolean;
  priority: number;
  sortOrder: number;
  /** Optional destination (e.g. arrival airport for a flight). */
  destLat: number;
  destLng: number;
  destName: string;
  destAddress: string;
  /** Item-level transport mode used for origin->destination travel rendering. */
  transportMode: TransportMode;
  /** Item-level route style between origin and destination. */
  itemRouteType: RouteType;
  /** Cached encoded polyline for item-level route (when route type is directions). */
  itemRoutePathEncoded: string;
  /** Cached distance for item-level route. */
  itemRouteDistanceMeters: number;
  /** Cached duration for item-level route. */
  itemRouteDurationMinutes: number;
  /** When true, item cannot be dragged/resized from the timeline. */
  timelineLocked: boolean;
  /** Optional source item for explicit transport events created from connectors. */
  travelFromItemId: string;
  /** Optional destination item for explicit transport events created from connectors. */
  travelToItemId: string;
  version?: number;
  createdAt?: string;
  updatedAt?: string;
  updatedByUserId?: string | null;
}

/** Route type for a leg: routed directions or straight line. */
export type RouteType = 'directions' | 'straight';

/** A travel leg connecting two items ("Legs" tab). */
export interface Leg {
  legId: string;
  fromItemId: string;
  toItemId: string;
  mode: TransportMode;
  otherModeLabel?: string; // Custom label when mode is 'other' (e.g., "Ferry", "Uber")
  departure: string;       // ISO datetime
  arrival: string;         // ISO datetime
  durationMinutes: number;
  distanceMeters: number;
  routePathEncoded: string; // encoded polyline
  routeType: RouteType;
  version?: number;
  createdAt?: string;
  updatedAt?: string;
  updatedByUserId?: string | null;
}

/** An audit-trail entry for collaborative editing ("History" tab). */
export interface HistoryEvent {
  eventId: string;
  timestamp: string;  // ISO datetime
  userId: string;
  userName: string;
  entityType?: 'trip' | 'day' | 'item' | 'leg' | 'member' | 'invite';
  entityId?: string;
  field: string;
  oldValue: string;
  newValue: string;
  itemId: string;
}

// ---------------------------------------------------------------------------
// Aggregate - the full dataset we materialise for a trip snapshot
// ---------------------------------------------------------------------------

export interface TripData {
  trip: Trip;
  days: Day[];
  items: Item[];
  legs: Leg[];
  history: HistoryEvent[];
  meta: Record<string, string>;
}
