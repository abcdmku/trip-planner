interface GoogleTokenResponse {
  access_token: string;
  expires_in: number;
  token_type: string;
  scope: string;
  error?: string;
}

interface GoogleUserInfo {
  email: string;
  name: string;
  picture?: string;
}

const GOOGLE_SCRIPT_SRC = 'https://accounts.google.com/gsi/client';

let scriptPromise: Promise<void> | null = null;

function loadScript(): Promise<void> {
  if (window.googleAccountsOauthLoaded) {
    return Promise.resolve();
  }

  if (scriptPromise) {
    return scriptPromise;
  }

  scriptPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${GOOGLE_SCRIPT_SRC}"]`);
    if (existing) {
      existing.addEventListener('load', () => {
        window.googleAccountsOauthLoaded = true;
        resolve();
      });
      existing.addEventListener('error', () => reject(new Error('Failed to load Google Identity script.')));
      return;
    }

    const script = document.createElement('script');
    script.src = GOOGLE_SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      window.googleAccountsOauthLoaded = true;
      resolve();
    };
    script.onerror = () => reject(new Error('Failed to load Google Identity script.'));
    document.head.appendChild(script);
  });

  return scriptPromise;
}

export interface AuthSession {
  accessToken: string;
  expiresAt: number;
  user: GoogleUserInfo;
}

export class GoogleAuthService {
  private readonly clientId: string;
  private readonly scopes: string[];

  constructor(clientId: string, scopes: string[]) {
    this.clientId = clientId;
    this.scopes = scopes;
  }

  isConfigured(): boolean {
    return Boolean(this.clientId);
  }

  async signIn(): Promise<AuthSession> {
    if (!this.clientId) {
      throw new Error('Google OAuth client ID is missing.');
    }

    await loadScript();

    const token = await this.requestAccessToken();

    if (!token.access_token) {
      throw new Error(token.error ?? 'OAuth token request failed.');
    }

    const user = await this.getUserInfo(token.access_token);

    return {
      accessToken: token.access_token,
      expiresAt: Date.now() + token.expires_in * 1000,
      user
    };
  }

  async signOut(accessToken: string): Promise<void> {
    if (!accessToken) {
      return;
    }

    await fetch(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(accessToken)}`, {
      method: 'POST',
      headers: {
        'Content-type': 'application/x-www-form-urlencoded'
      }
    });
  }

  private requestAccessToken(): Promise<GoogleTokenResponse> {
    return new Promise((resolve, reject) => {
      const oauth = window.google?.accounts?.oauth2;

      if (!oauth) {
        reject(new Error('Google Identity Services is not available.'));
        return;
      }

      const tokenClient = oauth.initTokenClient({
        client_id: this.clientId,
        scope: this.scopes.join(' '),
        callback: (response: unknown) => {
          resolve(response as GoogleTokenResponse);
        }
      });

      tokenClient.requestAccessToken({ prompt: 'consent' });
    });
  }

  private async getUserInfo(accessToken: string): Promise<GoogleUserInfo> {
    const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    });

    if (!response.ok) {
      throw new Error('Unable to fetch Google profile.');
    }

    return (await response.json()) as GoogleUserInfo;
  }
}
