// ---------------------------------------------------------------------------
// Google API (gapi) initialisation helper.
//
// We use the classic `gapi.client` loaded via a <script> tag (added lazily the
// first time `initGapiClient` is called) so that we can talk to the Sheets API
// through its typed discovery-doc interface.
// ---------------------------------------------------------------------------

const SHEETS_DISCOVERY_DOC =
  'https://sheets.googleapis.com/$discovery/rest?version=v4';
const GAPI_SCRIPT_URL = 'https://apis.google.com/js/api.js';

/** Resolves once the `gapi` global is available on `window`. */
function loadGapiScript(): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    // Already loaded?
    if (typeof window.gapi !== 'undefined') {
      resolve();
      return;
    }

    const existing = document.querySelector(
      `script[src="${GAPI_SCRIPT_URL}"]`,
    );
    if (existing) {
      // Script tag exists but gapi may still be loading.
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () =>
        reject(new Error('Failed to load gapi script')),
      );
      return;
    }

    const script = document.createElement('script');
    script.src = GAPI_SCRIPT_URL;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load gapi script'));
    document.head.appendChild(script);
  });
}

/** Promisified wrapper around `gapi.load`. */
function gapiLoad(library: string): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    window.gapi.load(library, {
      callback: () => resolve(),
      onerror: () => reject(new Error(`gapi.load("${library}") failed`)),
    });
  });
}

// ---------------------------------------------------------------------------
// Module state
// ---------------------------------------------------------------------------

let _initialised = false;

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Returns `true` when `gapi.client.sheets` is ready to use.
 */
export function isGapiReady(): boolean {
  return _initialised;
}

/**
 * Load the gapi client library, authenticate it with the supplied OAuth
 * `accessToken`, and load the Sheets v4 discovery document.
 *
 * This is **idempotent** -- calling it again with a fresh token simply updates
 * the token on the already-initialised client.
 */
export async function initGapiClient(accessToken: string): Promise<void> {
  // 1. Ensure the <script> tag has loaded.
  await loadGapiScript();

  // 2. Load gapi.client if it has not been loaded yet.
  if (!window.gapi.client) {
    await gapiLoad('client');
  }

  // 3. Set the API key (used for quota attribution, not auth).
  const apiKey = import.meta.env.VITE_GOOGLE_API_KEY ?? '';
  if (apiKey) {
    window.gapi.client.setApiKey(apiKey);
  }

  // 4. Apply the OAuth2 access token.
  window.gapi.client.setToken({ access_token: accessToken });

  // 5. Load the Sheets discovery document (only the first time).
  if (!_initialised) {
    await window.gapi.client.load(SHEETS_DISCOVERY_DOC);
    _initialised = true;
  }
}

/**
 * Returns `gapi.client.sheets` or throws if {@link initGapiClient} has not
 * been called yet.
 */
export function getGapiClient(): typeof gapi.client.sheets {
  if (!_initialised || !window.gapi?.client?.sheets) {
    throw new Error(
      'Google API client is not initialised. Call initGapiClient() first.',
    );
  }
  return window.gapi.client.sheets;
}

/**
 * Create a new Google Spreadsheet and return its ID.
 *
 * With the `drive.file` scope, the app automatically gains access to any
 * spreadsheets it creates.
 */
export async function createSpreadsheet(title: string): Promise<string> {
  if (!_initialised || !window.gapi?.client?.sheets) {
    throw new Error(
      'Google API client is not initialised. Call initGapiClient() first.',
    );
  }

  const response = await window.gapi.client.sheets.spreadsheets.create({
    resource: {
      properties: { title },
    },
  });

  const spreadsheetId = response.result.spreadsheetId;
  if (!spreadsheetId) {
    throw new Error('Failed to create spreadsheet: no ID returned');
  }

  return spreadsheetId;
}
