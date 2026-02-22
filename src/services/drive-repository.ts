import { validateSchema } from '@/lib/schema';

const DRIVE_FILES_ENDPOINT = 'https://www.googleapis.com/drive/v3/files';
const GOOGLE_SHEETS_MIME_TYPE = 'application/vnd.google-apps.spreadsheet';

interface DriveFileListResponse {
  files?: Array<{
    id?: string;
    name?: string;
    modifiedTime?: string;
    webViewLink?: string;
  }>;
  nextPageToken?: string;
}

export interface LoadableTripSummary {
  spreadsheetId: string;
  name: string;
  modifiedTime?: string;
  webViewLink?: string;
}

async function listAccessibleSpreadsheets(accessToken: string): Promise<LoadableTripSummary[]> {
  const q = `mimeType='${GOOGLE_SHEETS_MIME_TYPE}' and trashed=false`;
  const files: LoadableTripSummary[] = [];
  let pageToken: string | null = null;
  let pageCount = 0;

  do {
    const params = new URLSearchParams({
      q,
      pageSize: '100',
      orderBy: 'modifiedTime desc',
      fields: 'nextPageToken,files(id,name,modifiedTime,webViewLink)',
      supportsAllDrives: 'true',
      includeItemsFromAllDrives: 'true',
    });
    if (pageToken) {
      params.set('pageToken', pageToken);
    }

    const response = await fetch(`${DRIVE_FILES_ENDPOINT}?${params.toString()}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Unable to list Google Sheets (${response.status})`);
    }

    const data = (await response.json()) as DriveFileListResponse;
    for (const file of data.files ?? []) {
      if (!file.id) continue;
      files.push({
        spreadsheetId: file.id,
        name: file.name?.trim() || 'Untitled spreadsheet',
        modifiedTime: file.modifiedTime,
        webViewLink: file.webViewLink,
      });
    }

    pageToken = data.nextPageToken ?? null;
    pageCount += 1;
  } while (pageToken && pageCount < 20);

  // Drive pagination can theoretically return duplicates across pages after
  // live edits; de-duplicate by spreadsheet ID.
  const deduped = new Map<string, LoadableTripSummary>();
  for (const file of files) {
    if (!deduped.has(file.spreadsheetId)) {
      deduped.set(file.spreadsheetId, file);
    }
  }

  return [...deduped.values()];
}

export async function discoverLoadableTrips(
  accessToken: string,
): Promise<LoadableTripSummary[]> {
  const candidates = await listAccessibleSpreadsheets(accessToken);
  if (candidates.length === 0) return [];

  const validTrips: LoadableTripSummary[] = [];
  let nextIndex = 0;
  const workerCount = Math.min(4, candidates.length);

  const workers = Array.from({ length: workerCount }, async () => {
    while (true) {
      const currentIndex = nextIndex;
      nextIndex += 1;
      if (currentIndex >= candidates.length) return;

      const candidate = candidates[currentIndex];
      try {
        // Use raw validation so the discovery pass never mutates files.
        const validation = await validateSchema(candidate.spreadsheetId, false);
        if (validation.valid) {
          validTrips.push(candidate);
        }
      } catch {
        // Ignore sheets the app cannot read/validate and continue scanning.
      }
    }
  });

  await Promise.all(workers);

  return validTrips.sort((a, b) =>
    (b.modifiedTime ?? '').localeCompare(a.modifiedTime ?? ''),
  );
}
