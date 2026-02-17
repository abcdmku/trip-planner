// ---------------------------------------------------------------------------
// Tests for src/lib/schema.ts – validateSchema & initializeSheet
// ---------------------------------------------------------------------------

import { validateSchema, initializeSheet } from '@/lib/schema';
import { TRIP_SCHEMA } from '@/types/sheets';

// ---------------------------------------------------------------------------
// Mock the gapi client returned by getGapiClient
// ---------------------------------------------------------------------------

const mockSpreadsheetsGet = vi.fn();
const mockBatchGet = vi.fn();
const mockBatchUpdate = vi.fn();
const mockSpreadsheetsBatchUpdate = vi.fn();

vi.mock('@/lib/google-api', () => ({
  getGapiClient: () => ({
    spreadsheets: {
      get: mockSpreadsheetsGet,
      batchUpdate: mockSpreadsheetsBatchUpdate,
      values: {
        batchGet: mockBatchGet,
        batchUpdate: mockBatchUpdate,
      },
    },
  }),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build a mock metadata response where all schema tabs exist. */
function metaResponseWith(titles: string[]) {
  return {
    result: {
      sheets: titles.map((title) => ({ properties: { title } })),
    },
  };
}

/** Build a mock batchGet response with proper header rows for all tabs. */
function validHeadersResponse() {
  return {
    result: {
      valueRanges: TRIP_SCHEMA.tabs.map((tab) => ({
        values: [tab.columns],
      })),
    },
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('validateSchema', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns valid for a correct schema', async () => {
    const allTabNames = TRIP_SCHEMA.tabs.map((t) => t.name);
    mockSpreadsheetsGet.mockResolvedValue(metaResponseWith(allTabNames));
    mockBatchGet.mockResolvedValue(validHeadersResponse());

    const result = await validateSchema('spreadsheet-123');

    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it('detects missing tabs', async () => {
    // Only include the first tab, omit the rest.
    mockSpreadsheetsGet.mockResolvedValue(
      metaResponseWith([TRIP_SCHEMA.tabs[0].name]),
    );

    const result = await validateSchema('spreadsheet-123');

    expect(result.valid).toBe(false);
    // Should report one error per missing tab.
    for (const tab of TRIP_SCHEMA.tabs.slice(1)) {
      expect(result.errors).toContainEqual(`Missing tab: "${tab.name}"`);
    }
    // batchGet should NOT have been called because tabs are missing.
    expect(mockBatchGet).not.toHaveBeenCalled();
  });

  it('detects missing columns', async () => {
    const allTabNames = TRIP_SCHEMA.tabs.map((t) => t.name);
    mockSpreadsheetsGet.mockResolvedValue(metaResponseWith(allTabNames));

    // Return header rows that are each missing the first column.
    mockBatchGet.mockResolvedValue({
      result: {
        valueRanges: TRIP_SCHEMA.tabs.map((tab) => ({
          values: [tab.columns.slice(1)], // drop first column
        })),
      },
    });

    const result = await validateSchema('spreadsheet-123');

    expect(result.valid).toBe(false);
    for (const tab of TRIP_SCHEMA.tabs) {
      expect(result.errors).toContainEqual(
        `Tab "${tab.name}" is missing column "${tab.columns[0]}" in the header row`,
      );
    }
  });
});

describe('initializeSheet', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates required tabs that do not exist yet', async () => {
    // Pretend no tabs exist.
    mockSpreadsheetsGet.mockResolvedValue(metaResponseWith([]));
    mockSpreadsheetsBatchUpdate.mockResolvedValue({});
    mockBatchUpdate.mockResolvedValue({});

    const result = await initializeSheet('spreadsheet-123', 'My Trip');

    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);

    // Should have requested creation of every tab.
    const addRequests =
      mockSpreadsheetsBatchUpdate.mock.calls[0][0].resource.requests;
    const createdNames = addRequests.map(
      (r: { addSheet: { properties: { title: string } } }) =>
        r.addSheet.properties.title,
    );

    for (const tab of TRIP_SCHEMA.tabs) {
      expect(createdNames).toContain(tab.name);
    }
  });

  it('skips tabs that already exist', async () => {
    // Pretend all tabs already exist.
    const allTabNames = TRIP_SCHEMA.tabs.map((t) => t.name);
    mockSpreadsheetsGet.mockResolvedValue(metaResponseWith(allTabNames));
    mockBatchUpdate.mockResolvedValue({});

    await initializeSheet('spreadsheet-123', 'My Trip');

    // batchUpdate for adding sheets should NOT have been called.
    expect(mockSpreadsheetsBatchUpdate).not.toHaveBeenCalled();
  });
});
