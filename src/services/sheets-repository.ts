// ---------------------------------------------------------------------------
// Full CRUD repository backed by Google Sheets (via gapi.client.sheets).
//
// Each public method maps directly to one or more Sheets API calls.  The
// helpers `rowToObject` / `objectToRow` handle conversion between the flat
// string[][] world of Sheets and our typed domain objects.
// ---------------------------------------------------------------------------

import { getGapiClient } from '@/lib/google-api';
import { TRIP_SCHEMA } from '@/types/sheets';
import type {
  Day,
  HistoryEvent,
  Item,
  Leg,
  Trip,
  TripData,
  TransportMode,
  ItemType,
} from '@/types/trip';

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Convert a Sheets row (string[]) into a typed object, given the header array.
 *
 * Values that are absent in the row default to `""`.
 */
export function rowToObject<T extends Record<string, unknown>>(
  headers: string[],
  row: string[],
): T {
  const obj: Record<string, unknown> = {};
  for (let i = 0; i < headers.length; i++) {
    obj[headers[i]] = row[i] ?? '';
  }
  return obj as T;
}

/**
 * Convert a typed object back into a Sheets row (string[]).
 *
 * The order matches `headers`.  Non-string values are coerced via
 * `String(value)`.
 */
export function objectToRow(
  headers: string[],
  obj: Record<string, unknown>,
): string[] {
  return headers.map((h) => {
    const val = obj[h];
    if (val === undefined || val === null) return '';
    if (Array.isArray(val)) return JSON.stringify(val);
    if (typeof val === 'boolean') return val ? 'TRUE' : 'FALSE';
    return String(val);
  });
}

/** Look up the column list for a tab from the canonical schema. */
function columnsFor(tabName: string): string[] {
  const tab = TRIP_SCHEMA.tabs.find((t) => t.name === tabName);
  if (!tab) throw new Error(`Unknown tab: ${tabName}`);
  return tab.columns;
}

// ---------------------------------------------------------------------------
// Post-processing: coerce string values into richer JS types
// ---------------------------------------------------------------------------

function parseTrip(raw: Record<string, string>): Trip {
  return {
    id: raw['id'] ?? '',
    name: raw['name'] ?? '',
    baseTimezone: raw['baseTimezone'] ?? 'UTC',
    startDate: raw['startDate'] ?? '',
    endDate: raw['endDate'] ?? '',
    defaultMode: (raw['defaultMode'] as TransportMode) || 'driving',
    startLat: Number(raw['startLat']) || 0,
    startLng: Number(raw['startLng']) || 0,
    startName: raw['startName'] ?? '',
    startAddress: raw['startAddress'] ?? '',
  };
}

function parseDay(raw: Record<string, string>): Day {
  return {
    dayId: raw['dayId'] ?? '',
    date: raw['date'] ?? '',
    label: raw['label'] ?? '',
    colorHex: raw['colorHex'] ?? '#3B82F6',
    dayStart: raw['dayStart'] ?? '08:00',
    dayEnd: raw['dayEnd'] ?? '22:00',
  };
}

function parseItem(raw: Record<string, string>): Item {
  let photoUrls: string[] = [];
  try {
    photoUrls = raw['photoUrls'] ? JSON.parse(raw['photoUrls']) as string[] : [];
  } catch {
    photoUrls = raw['photoUrls'] ? raw['photoUrls'].split(',').map((s) => s.trim()) : [];
  }

  return {
    itemId: raw['itemId'] ?? '',
    dayId: raw['dayId'] ?? '',
    placeId: raw['placeId'] ?? '',
    placeName: raw['placeName'] ?? '',
    lat: Number(raw['lat']) || 0,
    lng: Number(raw['lng']) || 0,
    address: raw['address'] ?? '',
    type: (raw['type'] as ItemType) || 'other',
    scheduledStart: raw['scheduledStart'] ?? '',
    scheduledEnd: raw['scheduledEnd'] ?? '',
    durationMinutes: Number(raw['durationMinutes']) || 0,
    notesMd: raw['notesMd'] ?? '',
    photoUrls,
    availabilityWindows: raw['availabilityWindows'] ?? '[]',
    isOptional: raw['isOptional'] === 'TRUE',
    priority: Number(raw['priority']) || 0,
    sortOrder: Number(raw['sortOrder']) || 0,
    destLat: Number(raw['destLat']) || 0,
    destLng: Number(raw['destLng']) || 0,
    destName: raw['destName'] ?? '',
    destAddress: raw['destAddress'] ?? '',
    transportMode: (raw['transportMode'] as TransportMode) || 'driving',
    itemRouteType: (raw['itemRouteType'] as 'directions' | 'straight') || 'directions',
    itemRoutePathEncoded: raw['itemRoutePathEncoded'] ?? '',
    itemRouteDistanceMeters: Number(raw['itemRouteDistanceMeters']) || 0,
    itemRouteDurationMinutes: Number(raw['itemRouteDurationMinutes']) || 0,
    timelineLocked: raw['timelineLocked'] === 'TRUE',
    travelFromItemId: raw['travelFromItemId'] ?? '',
    travelToItemId: raw['travelToItemId'] ?? '',
  };
}

function parseLeg(raw: Record<string, string>): Leg {
  return {
    legId: raw['legId'] ?? '',
    fromItemId: raw['fromItemId'] ?? '',
    toItemId: raw['toItemId'] ?? '',
    mode: (raw['mode'] as TransportMode) || 'driving',
    departure: raw['departure'] ?? '',
    arrival: raw['arrival'] ?? '',
    durationMinutes: Number(raw['durationMinutes']) || 0,
    distanceMeters: Number(raw['distanceMeters']) || 0,
    routePathEncoded: raw['routePathEncoded'] ?? '',
    routeType: (raw['routeType'] as 'directions' | 'straight') || 'directions',
  };
}

function parseHistory(raw: Record<string, string>): HistoryEvent {
  return {
    eventId: raw['eventId'] ?? '',
    timestamp: raw['timestamp'] ?? '',
    userId: raw['userId'] ?? '',
    userName: raw['userName'] ?? '',
    field: raw['field'] ?? '',
    oldValue: raw['oldValue'] ?? '',
    newValue: raw['newValue'] ?? '',
    itemId: raw['itemId'] ?? '',
  };
}

function parseMeta(rows: string[][]): Record<string, string> {
  const meta: Record<string, string> = {};
  for (const row of rows) {
    const key = row[0];
    const value = row[1] ?? '';
    if (key) meta[key] = value;
  }
  return meta;
}

// ---------------------------------------------------------------------------
// Read helpers
// ---------------------------------------------------------------------------

/**
 * Read *all* data rows (excluding the header) from a given tab.
 *
 * Returns a 2-D string array.  An empty tab yields `[]`.
 */
async function readTab(
  spreadsheetId: string,
  tabName: string,
): Promise<string[][]> {
  const sheets = getGapiClient();
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `'${tabName}'!A:ZZ`,
    valueRenderOption: 'UNFORMATTED_VALUE',
    dateTimeRenderOption: 'FORMATTED_STRING',
  });

  const rows = (response.result.values ?? []) as string[][];
  // Skip the header row.
  return rows.length > 1 ? rows.slice(1) : [];
}

// ---------------------------------------------------------------------------
// Write helpers
// ---------------------------------------------------------------------------

/**
 * Overwrite an entire tab (header + data rows).
 *
 * 1. Clears the tab.
 * 2. Writes headers in row 1.
 * 3. Writes data starting at row 2.
 */
async function writeTab(
  spreadsheetId: string,
  tabName: string,
  headers: string[],
  dataRows: string[][],
): Promise<void> {
  const sheets = getGapiClient();
  const range = `'${tabName}'`;

  // Clear the sheet first so stale rows don't linger.
  await sheets.spreadsheets.values.clear({
    spreadsheetId,
    range,
  });

  const values = [headers, ...dataRows];

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${range}!A1`,
    valueInputOption: 'RAW',
    resource: { values },
  });
}

/**
 * Append rows to the bottom of a tab (does **not** touch existing data).
 */
async function appendRows(
  spreadsheetId: string,
  tabName: string,
  rows: string[][],
): Promise<void> {
  const sheets = getGapiClient();
  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: `'${tabName}'!A:A`,
    valueInputOption: 'RAW',
    insertDataOption: 'INSERT_ROWS',
    resource: { values: rows },
  });
}

// ---------------------------------------------------------------------------
// Public repository API
// ---------------------------------------------------------------------------

/**
 * Load the complete trip dataset from a Google Sheet.
 *
 * Makes a single `batchGet` to fetch all 6 tabs in one round-trip, then
 * parses each tab's rows into strongly typed domain objects.
 */
export async function loadTrip(spreadsheetId: string): Promise<TripData> {
  const sheets = getGapiClient();

  const tabNames = TRIP_SCHEMA.tabs.map((t) => t.name);
  const ranges = tabNames.map((name) => `'${name}'!A:ZZ`);

  const batchResponse = await sheets.spreadsheets.values.batchGet({
    spreadsheetId,
    ranges,
    valueRenderOption: 'UNFORMATTED_VALUE',
    dateTimeRenderOption: 'FORMATTED_STRING',
  });

  const valueRanges = batchResponse.result.valueRanges ?? [];

  // Helper to extract data rows (skip header) for a tab at `index`.
  const dataRows = (index: number): string[][] => {
    const all = (valueRanges[index]?.values ?? []) as string[][];
    return all.length > 1 ? all.slice(1) : [];
  };

  // -- Trip (index 0) --
  const tripHeaders = columnsFor('Trip');
  const tripRows = dataRows(0);
  const trip: Trip =
    tripRows.length > 0
      ? parseTrip(rowToObject(tripHeaders, tripRows[0]))
      : { id: '', name: '', baseTimezone: 'UTC', startDate: '', endDate: '', defaultMode: 'driving', startLat: 0, startLng: 0, startName: '', startAddress: '' };

  // -- Days (index 1) --
  const daysHeaders = columnsFor('Days');
  const days: Day[] = dataRows(1).map((r) =>
    parseDay(rowToObject(daysHeaders, r)),
  );

  // -- Items (index 2) --
  const itemsHeaders = columnsFor('Items');
  const items: Item[] = dataRows(2).map((r) =>
    parseItem(rowToObject(itemsHeaders, r)),
  );

  // -- Legs (index 3) --
  const legsHeaders = columnsFor('Legs');
  const legs: Leg[] = dataRows(3).map((r) =>
    parseLeg(rowToObject(legsHeaders, r)),
  );

  // -- History (index 4) --
  const historyHeaders = columnsFor('History');
  const history: HistoryEvent[] = dataRows(4).map((r) =>
    parseHistory(rowToObject(historyHeaders, r)),
  );

  // -- Meta (index 5) --
  const meta: Record<string, string> = parseMeta(dataRows(5));

  return { trip, days, items, legs, history, meta };
}

/**
 * Overwrite the **Trip** tab with a single trip row.
 */
export async function saveTrip(
  spreadsheetId: string,
  trip: Trip,
): Promise<void> {
  const headers = columnsFor('Trip');
  await writeTab(spreadsheetId, 'Trip', headers, [
    objectToRow(headers, trip as unknown as Record<string, unknown>),
  ]);
}

/**
 * Overwrite the **Days** tab with the supplied days.
 */
export async function saveDays(
  spreadsheetId: string,
  days: Day[],
): Promise<void> {
  const headers = columnsFor('Days');
  await writeTab(
    spreadsheetId,
    'Days',
    headers,
    days.map((d) => objectToRow(headers, d as unknown as Record<string, unknown>)),
  );
}

/**
 * Overwrite the **Items** tab with the supplied items.
 */
export async function saveItems(
  spreadsheetId: string,
  items: Item[],
): Promise<void> {
  const headers = columnsFor('Items');
  await writeTab(
    spreadsheetId,
    'Items',
    headers,
    items.map((item) => objectToRow(headers, item as unknown as Record<string, unknown>)),
  );
}

/**
 * Overwrite the **Legs** tab with the supplied legs.
 */
export async function saveLegs(
  spreadsheetId: string,
  legs: Leg[],
): Promise<void> {
  const headers = columnsFor('Legs');
  await writeTab(
    spreadsheetId,
    'Legs',
    headers,
    legs.map((l) => objectToRow(headers, l as unknown as Record<string, unknown>)),
  );
}

/**
 * **Append** history events to the History tab without touching existing rows.
 */
export async function appendHistory(
  spreadsheetId: string,
  events: HistoryEvent[],
): Promise<void> {
  const headers = columnsFor('History');
  const rows = events.map((e) => objectToRow(headers, e as unknown as Record<string, unknown>));
  await appendRows(spreadsheetId, 'History', rows);
}

// Re-export read helper for use in tests / ad-hoc scripts
export { readTab as _readTab };
