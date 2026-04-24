import {
  buildTripDataExportFile,
  createTripDataFilename,
  parseTripDataImport,
  TRIP_DATA_EXPORT_SCHEMA,
} from '@route-lib/trip-workspace/helpers/tripDataTransfer';
import type { Trip, TripData } from '@/types/trip';

const trip = {
  id: 'source-trip',
  name: 'Pacific Coast Sprint',
  baseTimezone: 'America/Los_Angeles',
  startDate: '2026-05-01',
  endDate: '2026-05-03',
  defaultMode: 'driving',
  startLat: 37.7749,
  startLng: -122.4194,
  startName: 'San Francisco',
  startAddress: 'San Francisco, CA',
} satisfies Trip;

const tripData = {
  trip,
  days: [],
  items: [],
  legs: [],
  history: [],
  meta: {},
} satisfies TripData;

describe('trip data transfer helpers', () => {
  it('wraps exported data with schema metadata', () => {
    const exported = buildTripDataExportFile(tripData, '2026-04-24T10:00:00.000Z');

    expect(exported.schema).toBe(TRIP_DATA_EXPORT_SCHEMA);
    expect(exported.sourceTripId).toBe('source-trip');
    expect(exported.exportedAt).toBe('2026-04-24T10:00:00.000Z');
    expect(exported.data.trip.name).toBe('Pacific Coast Sprint');
  });

  it('creates a stable json filename from the trip name', () => {
    const filename = createTripDataFilename(
      'Pacific Coast Sprint!',
      new Date('2026-04-24T10:00:00.000Z'),
    );

    expect(filename).toBe('pacific-coast-sprint-trip-data-2026-04-24.json');
  });

  it('parses an exported file and targets the current trip id', () => {
    const exported = buildTripDataExportFile(tripData, '2026-04-24T10:00:00.000Z');
    const parsed = parseTripDataImport(JSON.stringify(exported), 'current-trip');

    expect(parsed.trip.id).toBe('current-trip');
    expect(parsed.trip.name).toBe('Pacific Coast Sprint');
    expect(parsed.days).toEqual([]);
  });

  it('parses a raw snapshot payload', () => {
    const parsed = parseTripDataImport(
      JSON.stringify({
        trip,
        days: [],
        items: [],
        legs: [],
      }),
      'current-trip',
    );

    expect(parsed.trip.id).toBe('current-trip');
  });

  it('rejects invalid json', () => {
    expect(() => parseTripDataImport('{', 'current-trip')).toThrow(
      'Choose a valid trip data JSON file.',
    );
  });
});
