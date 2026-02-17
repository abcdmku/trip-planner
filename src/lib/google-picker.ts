// ---------------------------------------------------------------------------
// Google Picker integration for selecting existing Google Sheets.
//
// The Picker grants `drive.file` scope access to any file the user explicitly
// selects, allowing the app to work with sheets it didn't create.
// ---------------------------------------------------------------------------

const PICKER_SCRIPT_URL = 'https://apis.google.com/js/api.js';

let _pickerLoaded = false;

/**
 * Load the Google Picker library.
 */
async function loadPickerApi(): Promise<void> {
  if (_pickerLoaded) return;

  // Ensure gapi script is loaded
  if (typeof window.gapi === 'undefined') {
    await new Promise<void>((resolve, reject) => {
      const existing = document.querySelector(
        `script[src="${PICKER_SCRIPT_URL}"]`,
      );
      if (existing) {
        existing.addEventListener('load', () => resolve());
        existing.addEventListener('error', () =>
          reject(new Error('Failed to load gapi script')),
        );
        return;
      }

      const script = document.createElement('script');
      script.src = PICKER_SCRIPT_URL;
      script.async = true;
      script.defer = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Failed to load gapi script'));
      document.head.appendChild(script);
    });
  }

  // Load the picker module
  await new Promise<void>((resolve, reject) => {
    window.gapi.load('picker', {
      callback: () => {
        _pickerLoaded = true;
        resolve();
      },
      onerror: () => reject(new Error('Failed to load Google Picker')),
    });
  });
}

export interface PickerResult {
  spreadsheetId: string;
  name: string;
  url: string;
}

/**
 * Open the Google Picker to let the user select a Google Sheet.
 *
 * Returns the selected spreadsheet info, or null if cancelled.
 */
export async function openSheetPicker(
  accessToken: string,
): Promise<PickerResult | null> {
  await loadPickerApi();

  const apiKey = import.meta.env.VITE_GOOGLE_API_KEY ?? import.meta.env.VITE_GOOGLE_MAPS_API_KEY ?? '';

  return new Promise((resolve) => {
    const view = new google.picker.DocsView(google.picker.ViewId.SPREADSHEETS)
      .setIncludeFolders(true)
      .setSelectFolderEnabled(false);

    const picker = new google.picker.PickerBuilder()
      .addView(view)
      .setOAuthToken(accessToken)
      .setDeveloperKey(apiKey)
      .setCallback((data: google.picker.ResponseObject) => {
        if (data.action === google.picker.Action.PICKED) {
          const doc = data.docs?.[0];
          if (doc) {
            resolve({
              spreadsheetId: doc.id,
              name: doc.name,
              url: doc.url,
            });
          } else {
            resolve(null);
          }
        } else if (data.action === google.picker.Action.CANCEL) {
          resolve(null);
        }
      })
      .build();

    picker.setVisible(true);
  });
}
