/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_APP_BASE_PATH?: string;
  readonly VITE_GOOGLE_MAPS_API_KEY?: string;
  readonly VITE_GOOGLE_OAUTH_CLIENT_ID?: string;
  readonly VITE_GOOGLE_SHEETS_SCOPES?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
