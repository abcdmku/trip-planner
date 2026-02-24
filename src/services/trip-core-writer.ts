import { getGapiClient } from '@/lib/google-api';
import { TRIP_SCHEMA } from '@/types/sheets';
import { objectToRow } from '@/services/sheets-repository';
import type { TripCoreSnapshot } from '@/stores/undo-store';

export type TripCorePadCounts = {
  days: number;
  items: number;
  legs: number;
};

function columnsFor(tabName: string): string[] {
  const tab = TRIP_SCHEMA.tabs.find((t) => t.name === tabName);
  if (!tab) throw new Error(`Unknown tab: ${tabName}`);
  return tab.columns;
}

function blankRow(headers: string[]): string[] {
  return headers.map(() => '');
}

function buildValues(
  headers: string[],
  rows: string[][],
  padToDataRowCount: number,
): string[][] {
  const values: string[][] = [headers, ...rows];

  const targetDataRows = Math.max(padToDataRowCount, rows.length);
  while (values.length < 1 + targetDataRows) {
    values.push(blankRow(headers));
  }

  return values;
}

export async function overwriteTripCoreTabs(params: {
  spreadsheetId: string;
  snapshot: TripCoreSnapshot;
  padTo?: Partial<TripCorePadCounts>;
}): Promise<void> {
  const { spreadsheetId, snapshot, padTo } = params;
  const sheets = getGapiClient();

  const tripHeaders = columnsFor('Trip');
  const daysHeaders = columnsFor('Days');
  const itemsHeaders = columnsFor('Items');
  const legsHeaders = columnsFor('Legs');

  const tripRows = [
    objectToRow(tripHeaders, snapshot.trip as unknown as Record<string, unknown>),
  ];
  const dayRows = snapshot.days.map((d) =>
    objectToRow(daysHeaders, d as unknown as Record<string, unknown>),
  );
  const itemRows = snapshot.items.map((i) =>
    objectToRow(itemsHeaders, i as unknown as Record<string, unknown>),
  );
  const legRows = snapshot.legs.map((l) =>
    objectToRow(legsHeaders, l as unknown as Record<string, unknown>),
  );

  const data: gapi.client.sheets.ValueRange[] = [
    {
      range: `'Trip'!A1`,
      values: buildValues(tripHeaders, tripRows, 1),
    },
    {
      range: `'Days'!A1`,
      values: buildValues(daysHeaders, dayRows, padTo?.days ?? dayRows.length),
    },
    {
      range: `'Items'!A1`,
      values: buildValues(itemsHeaders, itemRows, padTo?.items ?? itemRows.length),
    },
    {
      range: `'Legs'!A1`,
      values: buildValues(legsHeaders, legRows, padTo?.legs ?? legRows.length),
    },
  ];

  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId,
    resource: {
      valueInputOption: 'RAW',
      data,
    },
  });
}

