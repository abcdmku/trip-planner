import { getGapiClient } from '@/lib/google-api';
import { TRIP_SCHEMA } from '@/types/sheets';

interface ValidationResult {
  valid: boolean;
  errors: string[];
}

function toTitleList(response: unknown): string[] {
  const sheets =
    typeof response === 'object' &&
    response !== null &&
    'result' in response &&
    typeof response.result === 'object' &&
    response.result !== null &&
    'sheets' in response.result &&
    Array.isArray(response.result.sheets)
      ? response.result.sheets
      : [];

  return sheets.flatMap((sheet) => {
    if (
      typeof sheet === 'object' &&
      sheet !== null &&
      'properties' in sheet &&
      typeof sheet.properties === 'object' &&
      sheet.properties !== null &&
      'title' in sheet.properties &&
      typeof sheet.properties.title === 'string'
    ) {
      return [sheet.properties.title];
    }
    return [];
  });
}

function toHeaderRows(response: unknown): string[][] {
  const valueRanges =
    typeof response === 'object' &&
    response !== null &&
    'result' in response &&
    typeof response.result === 'object' &&
    response.result !== null &&
    'valueRanges' in response.result &&
    Array.isArray(response.result.valueRanges)
      ? response.result.valueRanges
      : [];

  return valueRanges.map((entry) => {
    if (
      typeof entry === 'object' &&
      entry !== null &&
      'values' in entry &&
      Array.isArray(entry.values) &&
      Array.isArray(entry.values[0])
    ) {
      return entry.values[0].map(String);
    }
    return [];
  });
}

export async function validateSchema(spreadsheetId: string): Promise<ValidationResult> {
  const client = getGapiClient();
  const metadata = await client.spreadsheets.get({ spreadsheetId });
  const titles = new Set(toTitleList(metadata));
  const errors: string[] = [];

  const missingTabs = TRIP_SCHEMA.tabs.filter((tab) => !titles.has(tab.name));
  for (const tab of missingTabs) {
    errors.push(`Missing tab: "${tab.name}"`);
  }

  if (errors.length > 0) {
    return {
      valid: false,
      errors,
    };
  }

  const headerResponse = await client.spreadsheets.values.batchGet({
    spreadsheetId,
    ranges: TRIP_SCHEMA.tabs.map((tab) => `${tab.name}!1:1`),
  });
  const rows = toHeaderRows(headerResponse);

  TRIP_SCHEMA.tabs.forEach((tab, index) => {
    const headerRow = new Set(rows[index] ?? []);
    for (const column of tab.columns) {
      if (!headerRow.has(column)) {
        errors.push(`Tab "${tab.name}" is missing column "${column}" in the header row`);
      }
    }
  });

  return {
    valid: errors.length === 0,
    errors,
  };
}

export async function initializeSheet(
  spreadsheetId: string,
  _tripName: string,
): Promise<ValidationResult> {
  const client = getGapiClient();
  const metadata = await client.spreadsheets.get({ spreadsheetId });
  const titles = new Set(toTitleList(metadata));
  const missingTabs = TRIP_SCHEMA.tabs.filter((tab) => !titles.has(tab.name));

  if (missingTabs.length > 0) {
    await client.spreadsheets.batchUpdate({
      spreadsheetId,
      resource: {
        requests: missingTabs.map((tab) => ({
          addSheet: {
            properties: {
              title: tab.name,
            },
          },
        })),
      },
    });
  }

  await client.spreadsheets.values.batchUpdate({
    spreadsheetId,
    resource: {
      valueInputOption: 'RAW',
      data: TRIP_SCHEMA.tabs.map((tab) => ({
        range: `${tab.name}!1:1`,
        values: [tab.columns],
      })),
    },
  });

  return {
    valid: true,
    errors: [],
  };
}
