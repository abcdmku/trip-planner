import type { FastifyReply, FastifyRequest } from 'fastify';
import { prisma } from './db';
import { env, isProduction } from './config';
import type { SessionUser } from '../src/types/api';

const SESSION_COOKIE = 'tp_session';
const OAUTH_STATE_COOKIE = 'tp_oauth_state';

interface GoogleTokenResponse {
  access_token: string;
  id_token?: string;
}

interface GoogleUserInfoResponse {
  sub: string;
  email: string;
  name: string;
  picture?: string;
}

function cookieBaseOptions() {
  return {
    path: '/',
    httpOnly: true,
    signed: true,
    sameSite: 'lax' as const,
    secure: isProduction,
  };
}

function oauthRedirectUri(): string {
  return new URL('/api/auth/google/callback', env.APP_URL).toString();
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export async function exchangeGoogleCode(code: string): Promise<GoogleTokenResponse> {
  const body = new URLSearchParams({
    code,
    client_id: env.GOOGLE_CLIENT_ID,
    client_secret: env.GOOGLE_CLIENT_SECRET,
    redirect_uri: oauthRedirectUri(),
    grant_type: 'authorization_code',
  });

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
  });

  if (!response.ok) {
    throw new Error(`Google token exchange failed (${response.status})`);
  }

  return (await response.json()) as GoogleTokenResponse;
}

export async function fetchGoogleUserInfo(accessToken: string): Promise<GoogleUserInfoResponse> {
  const response = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Google userinfo failed (${response.status})`);
  }

  return (await response.json()) as GoogleUserInfoResponse;
}

export async function upsertSessionUser(profile: GoogleUserInfoResponse): Promise<SessionUser> {
  const user = await prisma.user.upsert({
    where: { id: profile.sub },
    update: {
      email: normalizeEmail(profile.email),
      name: profile.name,
      picture: profile.picture ?? '',
    },
    create: {
      id: profile.sub,
      email: normalizeEmail(profile.email),
      name: profile.name,
      picture: profile.picture ?? '',
    },
  });

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    picture: user.picture,
  };
}

export function buildGoogleOauthUrl(state: string): string {
  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  url.searchParams.set('client_id', env.GOOGLE_CLIENT_ID);
  url.searchParams.set('redirect_uri', oauthRedirectUri());
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', 'openid email profile');
  url.searchParams.set('state', state);
  url.searchParams.set('access_type', 'offline');
  url.searchParams.set('prompt', 'select_account');
  return url.toString();
}

export function issueOauthState(reply: FastifyReply, nextPath: string): string {
  const nonce = crypto.randomUUID();
  const state = JSON.stringify({
    nonce,
    nextPath,
  });
  reply.setCookie(OAUTH_STATE_COOKIE, state, {
    ...cookieBaseOptions(),
    maxAge: 60 * 10,
  });
  return nonce;
}

export function readOauthState(
  request: FastifyRequest,
): { nonce: string; nextPath: string } | null {
  const raw = request.cookies[OAUTH_STATE_COOKIE];
  if (!raw) return null;
  const unsigned = request.unsignCookie(raw);
  if (!unsigned.valid) return null;

  try {
    const parsed = JSON.parse(unsigned.value) as { nonce?: string; nextPath?: string };
    if (!parsed.nonce || typeof parsed.nextPath !== 'string') return null;
    return {
      nonce: parsed.nonce,
      nextPath: parsed.nextPath,
    };
  } catch {
    return null;
  }
}

export function clearOauthState(reply: FastifyReply): void {
  reply.clearCookie(OAUTH_STATE_COOKIE, cookieBaseOptions());
}

export function setSessionCookie(reply: FastifyReply, userId: string): void {
  reply.setCookie(SESSION_COOKIE, userId, {
    ...cookieBaseOptions(),
    maxAge: 60 * 60 * 24 * 14,
  });
}

export function clearSessionCookie(reply: FastifyReply): void {
  reply.clearCookie(SESSION_COOKIE, cookieBaseOptions());
}

export async function resolveSessionUser(
  request: FastifyRequest,
): Promise<SessionUser | null> {
  const raw = request.cookies[SESSION_COOKIE];
  if (!raw) return null;

  const unsigned = request.unsignCookie(raw);
  if (!unsigned.valid || !unsigned.value) {
    return null;
  }

  const user = await prisma.user.findUnique({
    where: { id: unsigned.value },
  });

  if (!user) return null;

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    picture: user.picture,
  };
}

export async function requireSessionUser(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<SessionUser | null> {
  const user = await resolveSessionUser(request);
  if (!user) {
    reply.code(401).send({ error: 'Authentication required' });
    return null;
  }
  return user;
}
