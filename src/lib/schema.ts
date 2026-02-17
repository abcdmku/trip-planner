// ---------------------------------------------------------------------------
// Schema validation & initialisation for a Trip Planner Google Sheet.
//
// The canonical schema is defined in `src/types/sheets.ts` (TRIP_SCHEMA).
// This module checks whether an existing spreadsheet conforms to the schema,
// and can bootstrap a new spreadsheet with the correct tabs + headers.
// ---------------------------------------------------------------------------

import { getGapiClient } from '@/lib/google-api';
import { TRIP_SCHEMA } from '@/types/sheets';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SchemaValidationResult {
  valid: boolean;
  errors: string[];
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

/**
 * Read spreadsheet metadata and verify that all required tabs exist and
 * contain the expected header row.
 */
export async function validateSchema(
  spreadsheetId: string,
): Promise<SchemaValidationResult> {
  const sheets = getGapiClient();
  const errors: string[] = [];

  // 1. Fetch the spreadsheet metadata (sheet titles).
  const metaResponse = await sheets.spreadsheets.get({
    spreadsheetId,
    fields: 'sheets.properties.title',
  });

  const existingTitles = new Set(
    (metaResponse.result.sheets ?? []).map(
      (s) => s.properties?.title ?? '',
    ),
  );

  // 2. Check each required tab exists.
  for (const tab of TRIP_SCHEMA.tabs) {
    if (!existingTitles.has(tab.name)) {
      errors.push(`Missing tab: "${tab.name}"`);
    }
  }

  // If tabs are missing we cannot validate columns — return early.
  if (errors.length > 0) {
    return { valid: false, errors };
  }

  // 3. Read row 1 (headers) of every required tab.
  const ranges = TRIP_SCHEMA.tabs.map((t) => `'${t.name}'!1:1`);

  const batchResponse = await sheets.spreadsheets.values.batchGet({
    spreadsheetId,
    ranges,
  });

  const valueRanges = batchResponse.result.valueRanges ?? [];

  for (let i = 0; i < TRIP_SCHEMA.tabs.length; i++) {
    const tab = TRIP_SCHEMA.tabs[i];
    const headerRow: string[] = (valueRanges[i]?.values?.[0] as string[] | undefined) ?? [];

    for (const col of tab.columns) {
      if (!headerRow.includes(col)) {
        errors.push(
          `Tab "${tab.name}" is missing column "${col}" in the header row`,
        );
      }
    }
  }

  return { valid: errors.length === 0, errors };
}

// ---------------------------------------------------------------------------
// Initialisation
// ---------------------------------------------------------------------------

/**
 * Create all required tabs with their header rows and seed the Meta tab with
 * the schema version.  Any tabs that already exist are skipped.
 *
 * @param tripName  Used to set the initial "Trip" row — can be edited later.
 */
export async function initializeSheet(
  spreadsheetId: string,
  tripName: string,
): Promise<SchemaValidationResult> {
  const sheets = getGapiClient();
  const errors: string[] = [];

  // 1. Determine which tabs already exist.
  const metaResponse = await sheets.spreadsheets.get({
    spreadsheetId,
    fields: 'sheets.properties.title',
  });

  const existingTitles = new Set(
    (metaResponse.result.sheets ?? []).map(
      (s) => s.properties?.title ?? '',
    ),
  );

  // 2. Build batchUpdate requests for missing tabs.
  const addRequests: gapi.client.sheets.Request[] = [];

  for (const tab of TRIP_SCHEMA.tabs) {
    if (!existingTitles.has(tab.name)) {
      addRequests.push({
        addSheet: {
          properties: { title: tab.name },
        },
      });
    }
  }

  if (addRequests.length > 0) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      resource: { requests: addRequests },
    });
  }

  // 3. Write header rows + seed data in a single batchUpdate (values).
  const data: gapi.client.sheets.ValueRange[] = [];

  for (const tab of TRIP_SCHEMA.tabs) {
    // Header row
    data.push({
      range: `'${tab.name}'!A1`,
      values: [tab.columns],
    });
  }

  // Seed the Meta tab with the schema version and trip name.
  data.push({
    range: `'Meta'!A2`,
    values: [
      ['schemaVersion', String(TRIP_SCHEMA.version)],
      ['tripName', tripName],
    ],
  });

  try {
    await sheets.spreadsheets.values.batchUpdate({
      spreadsheetId,
      resource: {
        valueInputOption: 'RAW',
        data,
      },
    });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : 'Unknown error during sheet init';
    errors.push(message);
  }

  return { valid: errors.length === 0, errors };
}
