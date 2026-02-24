// ---------------------------------------------------------------------------
// Schema validation, migration & initialisation for a Trip Planner Google Sheet.
//
// The canonical schema is defined in `src/types/sheets.ts` (TRIP_SCHEMA).
// This module checks whether an existing spreadsheet conforms to the schema,
// can bootstrap a new spreadsheet with the correct tabs + headers, and can
// migrate an outdated spreadsheet forward by adding missing tabs/columns.
// ---------------------------------------------------------------------------

import { getGapiClient } from '@/lib/google-api';
import { TRIP_SCHEMA } from '@/types/sheets';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SchemaValidationResult {
  valid: boolean;
  errors: string[];
  /** True when auto-migration was performed during validation. */
  migrated?: boolean;
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

/**
 * Read spreadsheet metadata and verify that all required tabs exist and
 * contain the expected header row.
 *
 * When `autoMigrate` is true (the default), any fixable mismatches (missing
 * tabs or columns) are automatically repaired via `migrateSchema` and the
 * sheet is re-validated afterward.
 */
export async function validateSchema(
  spreadsheetId: string,
  autoMigrate = true,
): Promise<SchemaValidationResult> {
  const result = await _validateSchemaRaw(spreadsheetId);

  if (result.valid || !autoMigrate) return result;

  // Attempt auto-migration.
  const migration = await migrateSchema(spreadsheetId);
  if (!migration.valid) {
    return migration;
  }

  // Re-validate after migration.
  const postMigration = await _validateSchemaRaw(spreadsheetId);
  return { ...postMigration, migrated: true };
}

/**
 * Raw validation without auto-migration (used internally).
 */
async function _validateSchemaRaw(
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
// Migration
// ---------------------------------------------------------------------------

/**
 * Bring an existing spreadsheet up to date with `TRIP_SCHEMA`.
 *
 * This function is fully data-driven from the schema definition — nothing is
 * hardcoded.  It handles two classes of mismatch:
 *
 * 1. **Missing tabs** — created with the correct header row.
 * 2. **Missing columns** — appended to the end of the existing header row.
 *    Existing data rows are back-filled with empty strings so every row
 *    stays the same width as the header.
 *
 * Columns that exist in the sheet but are *not* in the schema are left
 * untouched (the migration is additive-only, never destructive).
 */
export async function migrateSchema(
  spreadsheetId: string,
): Promise<SchemaValidationResult> {
  const sheets = getGapiClient();
  const errors: string[] = [];

  // 1. Fetch existing tab names.
  const metaResponse = await sheets.spreadsheets.get({
    spreadsheetId,
    fields: 'sheets.properties.title',
  });

  const existingTitles = new Set(
    (metaResponse.result.sheets ?? []).map(
      (s) => s.properties?.title ?? '',
    ),
  );

  // 2. Create any missing tabs.
  const missingTabs = TRIP_SCHEMA.tabs.filter((t) => !existingTitles.has(t.name));

  if (missingTabs.length > 0) {
    const addRequests: gapi.client.sheets.Request[] = missingTabs.map((tab) => ({
      addSheet: { properties: { title: tab.name } },
    }));

    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      resource: { requests: addRequests },
    });
  }

  // For newly created tabs, write the full header row.
  if (missingTabs.length > 0) {
    const data: gapi.client.sheets.ValueRange[] = missingTabs.map((tab) => ({
      range: `'${tab.name}'!A1`,
      values: [tab.columns],
    }));

    await sheets.spreadsheets.values.batchUpdate({
      spreadsheetId,
      resource: { valueInputOption: 'RAW', data },
    });
  }

  // 3. For tabs that already existed, check for missing columns.
  const existingTabs = TRIP_SCHEMA.tabs.filter((t) => existingTitles.has(t.name));

  if (existingTabs.length === 0) {
    return { valid: errors.length === 0, errors };
  }

  // Read the full contents of each existing tab so we can append columns
  // without losing data.
  const fullRanges = existingTabs.map((t) => `'${t.name}'!A:ZZ`);

  const fullBatch = await sheets.spreadsheets.values.batchGet({
    spreadsheetId,
    ranges: fullRanges,
    valueRenderOption: 'UNFORMATTED_VALUE',
    dateTimeRenderOption: 'FORMATTED_STRING',
  });

  const fullValueRanges = fullBatch.result.valueRanges ?? [];
  const updateData: gapi.client.sheets.ValueRange[] = [];

  for (let i = 0; i < existingTabs.length; i++) {
    const tab = existingTabs[i];
    const allRows = (fullValueRanges[i]?.values ?? []) as string[][];
    const currentHeaders: string[] = allRows.length > 0 ? [...allRows[0]] : [];

    // Determine which schema columns are missing.
    const currentSet = new Set(currentHeaders);
    const missingCols = tab.columns.filter((col) => !currentSet.has(col));

    if (missingCols.length === 0) continue;

    // Append missing column names to the header.
    const newHeaders = [...currentHeaders, ...missingCols];

    // Rebuild all rows: pad existing data rows with empty strings for the
    // new columns so every row matches the new header width.
    const newRows: string[][] = [newHeaders];

    for (let r = 1; r < allRows.length; r++) {
      const row = [...allRows[r]];
      // Pad to match the new header width.
      while (row.length < newHeaders.length) {
        row.push('');
      }
      newRows.push(row);
    }

    // Overwrite the tab with the updated data.
    updateData.push({
      range: `'${tab.name}'!A1`,
      values: newRows,
    });
  }

  if (updateData.length > 0) {
    try {
      await sheets.spreadsheets.values.batchUpdate({
        spreadsheetId,
        resource: { valueInputOption: 'RAW', data: updateData },
      });
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Unknown error during migration';
      errors.push(message);
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
