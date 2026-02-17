export const SHEET_TABS = {
  TRIP: 'Trip',
  DAYS: 'Days',
  ITEMS: 'Items',
  LEGS: 'Legs',
  HISTORY: 'History',
  META: 'Meta'
} as const;

export const TRIP_COLUMNS = [
  'id',
  'name',
  'baseTimezone',
  'startDate',
  'endDate',
  'defaultMode',
  'sheetId'
] as const;

export const DAY_COLUMNS = ['dayId', 'date', 'label', 'colorHex', 'dayStart', 'dayEnd'] as const;

export const ITEM_COLUMNS = [
  'itemId',
  'dayId',
  'sortOrder',
  'type',
  'tags',
  'title',
  'sourceKind',
  'placeId',
  'mapsUrl',
  'lat',
  'lng',
  'localTimezone',
  'openingHours',
  'startTime',
  'endTime',
  'durationMin',
  'notesMd',
  'photoUrls',
  'availabilityStart',
  'availabilityEnd',
  'mode',
  'isOptional',
  'priority'
] as const;

export const LEG_COLUMNS = [
  'legId',
  'dayId',
  'fromItemId',
  'toItemId',
  'mode',
  'departureDateTime',
  'arrivalDateTime',
  'durationMin',
  'distanceMeters',
  'routePathEncoded',
  'trafficAware',
  'calcStatus',
  'calculatedAt',
  'timezoneChangeLabel'
] as const;

export const HISTORY_COLUMNS = [
  'eventId',
  'timestamp',
  'userEmail',
  'entityType',
  'entityId',
  'action',
  'field',
  'oldValue',
  'newValue',
  'clientId'
] as const;

export const META_COLUMNS = ['schemaVersion', 'appVersion', 'lastUpdatedAt', 'lastUpdatedBy'] as const;

export const SCHEMA_VERSION = '1.0.0';

export const REQUIRED_SHEET_COLUMNS: Record<string, readonly string[]> = {
  [SHEET_TABS.TRIP]: TRIP_COLUMNS,
  [SHEET_TABS.DAYS]: DAY_COLUMNS,
  [SHEET_TABS.ITEMS]: ITEM_COLUMNS,
  [SHEET_TABS.LEGS]: LEG_COLUMNS,
  [SHEET_TABS.HISTORY]: HISTORY_COLUMNS,
  [SHEET_TABS.META]: META_COLUMNS
};

export const ALL_TAB_NAMES = Object.values(SHEET_TABS);
