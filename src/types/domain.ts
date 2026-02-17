export type TransportMode = 'DRIVING' | 'WALKING' | 'BICYCLING' | 'TRANSIT';

export type OptimizationMode = 'maximize_available_activities' | 'minimize_travel_time';

export type ItemType = 'route' | 'poi' | 'activity' | 'lodging' | 'food' | 'transit';

export type ItemSourceKind = 'google_place' | 'manual' | 'maps_url';

export type SyncState = 'idle' | 'syncing' | 'error';

export interface Trip {
  id: string;
  name: string;
  baseTimezone: string;
  startDate: string;
  endDate: string;
  defaultMode: TransportMode;
  sheetId: string;
}

export interface TripDay {
  dayId: string;
  date: string;
  label: string;
  colorHex: string;
  dayStart: string;
  dayEnd: string;
}

export interface AvailabilityWindow {
  start?: string;
  end?: string;
}

export interface ItineraryItem {
  itemId: string;
  dayId: string;
  sortOrder: number;
  type: ItemType;
  tags: string[];
  title: string;
  sourceKind: ItemSourceKind;
  placeId?: string;
  mapsUrl?: string;
  lat: number;
  lng: number;
  localTimezone?: string;
  openingHours?: string;
  startTime: string;
  endTime: string;
  durationMin: number;
  notesMd: string;
  photoUrls: string[];
  availabilityStart?: string;
  availabilityEnd?: string;
  mode: TransportMode;
  isOptional: boolean;
  priority: number;
}

export interface TravelLeg {
  legId: string;
  dayId: string;
  fromItemId: string;
  toItemId: string;
  mode: TransportMode;
  departureDateTime: string;
  arrivalDateTime: string;
  durationMin: number;
  distanceMeters: number;
  routePathEncoded: string;
  trafficAware: boolean;
  calcStatus: 'ok' | 'error' | 'pending';
  calculatedAt: string;
  timezoneChangeLabel?: string;
}

export interface HistoryEvent {
  eventId: string;
  timestamp: string;
  userEmail: string;
  entityType: 'trip' | 'day' | 'item' | 'leg';
  entityId: string;
  action: 'create' | 'update' | 'delete' | 'reorder' | 'optimize';
  field: string;
  oldValue: string;
  newValue: string;
  clientId: string;
}

export interface MetaRow {
  schemaVersion: string;
  appVersion: string;
  lastUpdatedAt: string;
  lastUpdatedBy: string;
}

export interface TripWorkspace {
  trip: Trip;
  days: TripDay[];
  items: ItineraryItem[];
  legs: TravelLeg[];
  history: HistoryEvent[];
  meta: MetaRow;
}

export interface TemplateValidationResult {
  valid: boolean;
  missingTabs: string[];
  missingColumns: Record<string, string[]>;
}

export interface PlaceSearchResult {
  placeId?: string;
  title: string;
  lat: number;
  lng: number;
  mapsUrl?: string;
  openingHours?: string;
  localTimezone?: string;
}

export interface LegEstimate {
  durationMin: number;
  distanceMeters: number;
  routePathEncoded: string;
  arrivalDateTime: string;
  timezoneChangeLabel?: string;
}

export interface OptimizeResult {
  orderedItems: ItineraryItem[];
  droppedOptionalItemIds: string[];
  conflicts: string[];
}

export interface DayFilter {
  selectedDayIds: string[];
}

export interface ApiUsage {
  mapsCalls: number;
  sheetsCalls: number;
}
