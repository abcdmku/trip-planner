export {};

interface GoogleOauthTokenClient {
  requestAccessToken: (options?: { prompt?: string }) => void;
}

interface GoogleOauthInitTokenClient {
  initTokenClient: (config: {
    client_id: string;
    scope: string;
    callback: (response: unknown) => void;
  }) => GoogleOauthTokenClient;
}

declare global {
  interface Window {
    google?: typeof google & {
      accounts?: {
        oauth2?: GoogleOauthInitTokenClient;
      };
    };
    googleAccountsOauthLoaded?: boolean;
  }
}
