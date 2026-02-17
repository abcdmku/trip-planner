// ---------------------------------------------------------------------------
// Ambient type declarations for the Google API client (`gapi`).
//
// These cover the subset of the gapi surface used by this application
// (Sheets v4 via discovery-doc loading).  They are intentionally minimal --
// if you need additional methods, extend the relevant namespace below.
// ---------------------------------------------------------------------------

/* eslint-disable @typescript-eslint/no-explicit-any */

declare namespace gapi {
  function load(
    library: string,
    options: { callback: () => void; onerror: () => void },
  ): void;

  namespace client {
    function setApiKey(apiKey: string): void;
    function setToken(token: { access_token: string }): void;
    function load(discoveryDocUrl: string): Promise<void>;

    namespace sheets {
      namespace spreadsheets {
        function create(params: {
          resource: {
            properties?: { title?: string };
          };
        }): Promise<{
          result: {
            spreadsheetId?: string;
            properties?: { title?: string };
          };
        }>;

        function get(params: {
          spreadsheetId: string;
          fields?: string;
        }): Promise<{
          result: {
            sheets?: Array<{
              properties?: { title?: string; sheetId?: number };
            }>;
          };
        }>;

        function batchUpdate(params: {
          spreadsheetId: string;
          resource: { requests: sheets.Request[] };
        }): Promise<{ result: any }>;

        namespace values {
          function get(params: {
            spreadsheetId: string;
            range: string;
            valueRenderOption?: string;
            dateTimeRenderOption?: string;
          }): Promise<{
            result: { values?: any[][] };
          }>;

          function batchGet(params: {
            spreadsheetId: string;
            ranges: string[];
            valueRenderOption?: string;
            dateTimeRenderOption?: string;
          }): Promise<{
            result: {
              valueRanges?: Array<{ values?: any[][] }>;
            };
          }>;

          function update(params: {
            spreadsheetId: string;
            range: string;
            valueInputOption: string;
            resource: { values: any[][] };
          }): Promise<{ result: any }>;

          function batchUpdate(params: {
            spreadsheetId: string;
            resource: {
              valueInputOption: string;
              data: sheets.ValueRange[];
            };
          }): Promise<{ result: any }>;

          function append(params: {
            spreadsheetId: string;
            range: string;
            valueInputOption: string;
            insertDataOption?: string;
            resource: { values: any[][] };
          }): Promise<{ result: any }>;

          function clear(params: {
            spreadsheetId: string;
            range: string;
          }): Promise<{ result: any }>;
        }
      }
    }
  }
}

declare namespace gapi.client.sheets {
  interface Request {
    addSheet?: {
      properties: { title: string };
    };
    [key: string]: any;
  }

  interface ValueRange {
    range: string;
    values: any[][];
  }
}

interface Window {
  gapi: typeof gapi;
}

// ---------------------------------------------------------------------------
// Google Picker types
// ---------------------------------------------------------------------------

declare namespace google.picker {
  enum ViewId {
    SPREADSHEETS = 'spreadsheets',
  }

  enum Action {
    PICKED = 'picked',
    CANCEL = 'cancel',
  }

  interface Document {
    id: string;
    name: string;
    url: string;
    mimeType?: string;
  }

  interface ResponseObject {
    action: Action | string;
    docs?: Document[];
  }

  class DocsView {
    constructor(viewId?: ViewId);
    setIncludeFolders(include: boolean): DocsView;
    setSelectFolderEnabled(enabled: boolean): DocsView;
    setMimeTypes(mimeTypes: string): DocsView;
  }

  class PickerBuilder {
    addView(view: DocsView): PickerBuilder;
    setOAuthToken(token: string): PickerBuilder;
    setDeveloperKey(key: string): PickerBuilder;
    setCallback(callback: (data: ResponseObject) => void): PickerBuilder;
    build(): Picker;
  }

  interface Picker {
    setVisible(visible: boolean): void;
  }
}
