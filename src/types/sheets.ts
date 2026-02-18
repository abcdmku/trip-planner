// ---------------------------------------------------------------------------
// Google-Sheets schema definitions used by the schema validator and the
// sheets repository to guarantee structural consistency.
// ---------------------------------------------------------------------------

/** Describes a single tab (worksheet) within the spreadsheet. */
export interface SheetTab {
  /** Display name of the tab. */
  name: string;
  /** Ordered list of column headers (row 1). */
  columns: string[];
}

/** Versioned schema that describes the full spreadsheet layout. */
export interface SheetSchema {
  version: number;
  tabs: SheetTab[];
}

/**
 * Canonical schema for a Trip Planner spreadsheet.
 *
 * When `version` is bumped the `initializeSheet` / `validateSchema` helpers in
 * `src/lib/schema.ts` should be updated to handle migrations.
 */
export const TRIP_SCHEMA: SheetSchema = {
  version: 1,
  tabs: [
    {
      name: 'Trip',
      columns: [
        'id',
        'name',
        'baseTimezone',
        'startDate',
        'endDate',
        'defaultMode',
        'startLat',
        'startLng',
        'startName',
        'startAddress',
      ],
    },
    {
      name: 'Days',
      columns: [
        'dayId',
        'date',
        'label',
        'colorHex',
        'dayStart',
        'dayEnd',
      ],
    },
    {
      name: 'Items',
      columns: [
        'itemId',
        'dayId',
        'placeId',
        'placeName',
        'lat',
        'lng',
        'address',
        'type',
        'scheduledStart',
        'scheduledEnd',
        'durationMinutes',
        'notesMd',
        'photoUrls',
        'availabilityWindows',
        'isOptional',
        'priority',
        'sortOrder',
        'destLat',
        'destLng',
        'destName',
        'destAddress',
        'transportMode',
        'itemRouteType',
        'itemRoutePathEncoded',
        'itemRouteDistanceMeters',
        'itemRouteDurationMinutes',
        'timelineLocked',
        'travelFromItemId',
        'travelToItemId',
      ],
    },
    {
      name: 'Legs',
      columns: [
        'legId',
        'fromItemId',
        'toItemId',
        'mode',
        'departure',
        'arrival',
        'durationMinutes',
        'distanceMeters',
        'routePathEncoded',
        'routeType',
      ],
    },
    {
      name: 'History',
      columns: [
        'eventId',
        'timestamp',
        'userId',
        'userName',
        'field',
        'oldValue',
        'newValue',
        'itemId',
      ],
    },
    {
      name: 'Meta',
      columns: ['key', 'value'],
    },
  ],
};
