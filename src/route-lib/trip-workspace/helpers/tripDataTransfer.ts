import type { Day, Item, Leg, Trip, TripData } from '@/types/trip';

export const TRIP_DATA_EXPORT_SCHEMA = 'trip-planner.trip-data';
export const TRIP_DATA_EXPORT_VERSION = 1;

export interface TripDataExportFile {
  schema: typeof TRIP_DATA_EXPORT_SCHEMA;
  version: typeof TRIP_DATA_EXPORT_VERSION;
  exportedAt: string;
  sourceTripId: string;
  data: TripData;
}

export interface RestorableTripSnapshot {
  trip: Trip;
  days: Day[];
  items: Item[];
  legs: Leg[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function sanitizeFilenamePart(value: string): string {
  return (
    value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 64) || 'trip-data'
  );
}

export function buildTripDataExportFile(
  data: TripData,
  exportedAt = new Date().toISOString(),
): TripDataExportFile {
  return {
    schema: TRIP_DATA_EXPORT_SCHEMA,
    version: TRIP_DATA_EXPORT_VERSION,
    exportedAt,
    sourceTripId: data.trip.id,
    data,
  };
}

export function createTripDataFilename(tripName: string | null | undefined, date = new Date()): string {
  const name = sanitizeFilenamePart(tripName ?? 'trip-data');
  const datePart = date.toISOString().slice(0, 10);
  return `${name}-trip-data-${datePart}.json`;
}

export function parseTripDataImport(jsonText: string, targetTripId: string): RestorableTripSnapshot {
  let parsed: unknown;

  try {
    parsed = JSON.parse(jsonText);
  } catch {
    throw new Error('Choose a valid trip data JSON file.');
  }

  const candidate =
    isRecord(parsed) &&
    parsed.schema === TRIP_DATA_EXPORT_SCHEMA &&
    isRecord(parsed.data)
      ? parsed.data
      : parsed;

  if (!isRecord(candidate)) {
    throw new Error('Choose a valid trip data JSON file.');
  }

  const { trip, days, items, legs } = candidate;
  if (!isRecord(trip) || !Array.isArray(days) || !Array.isArray(items) || !Array.isArray(legs)) {
    throw new Error('Choose a valid trip data JSON file.');
  }

  return {
    trip: {
      ...(trip as unknown as Trip),
      id: targetTripId,
    },
    days: days as Day[],
    items: items as Item[],
    legs: legs as Leg[],
  };
}
