export interface SpreadsheetClient {
  spreadsheets: {
    get: (request: { spreadsheetId: string }) => Promise<unknown>;
    batchUpdate: (request: { spreadsheetId: string; resource: { requests: unknown[] } }) => Promise<unknown>;
    values: {
      batchGet: (request: { spreadsheetId: string; ranges: string[] }) => Promise<unknown>;
      batchUpdate: (request: {
        spreadsheetId: string;
        resource: { valueInputOption: string; data: Array<{ range: string; values: string[][] }> };
      }) => Promise<unknown>;
    };
  };
}

export function getGapiClient(): SpreadsheetClient {
  throw new Error('Google API client is not configured in this environment.');
}
