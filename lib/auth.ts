// Sign-in through Logto (the shared DataSparkLab SSO), as a plain OIDC authorization-code flow with PKCE.
// The session is a signed, http-only cookie; nothing about the user is kept server-side except the
// sign-up log in lib/users.ts. With LOGTO_* unset (local dev), auth is off and the app is open.
import { SignJWT, createRemoteJWKSet, jwtVerify, type JWTPayload } from 'jose';
import { isRevoked } from './revoked';

export const SESSION_COOKIE = 'owed_session';
export const FLOW_COOKIE = 'owed_oidc';
const SESSION_DAYS = 7;

export interface SessionUser {
  sub: string;
  email?: string;
  name?: string;
  picture?: string;
  roles?: string[];
}

export interface AuthConfig {
  endpoint: string; // public issuer base, e.g. https://sso.datasparklab.com
  internal: string; // where the server reaches Logto (a container name inside milkyway), else endpoint
  appId: string;
  appSecret: string;
  baseUrl: string; // this app's public URL
  secret: Uint8Array;
}

export function authConfig(): AuthConfig | null {
  const endpoint = process.env.LOGTO_ENDPOINT?.replace(/\/$/, '');
  const appId = process.env.LOGTO_APP_ID;
  const appSecret = process.env.LOGTO_APP_SECRET;
  const secret = process.env.SESSION_SECRET;
  if (!endpoint || !appId || !appSecret || !secret) return null;
  return {
    endpoint,
    internal: (process.env.LOGTO_INTERNAL_ENDPOINT || endpoint).replace(/\/$/, ''),
    appId,
    appSecret,
    baseUrl: (process.env.OWED_BASE_URL || 'http://localhost:3311').replace(/\/$/, ''),
    secret: new TextEncoder().encode(secret),
  };
}

export const authEnabled = () => authConfig() !== null;

/**
 * Absolute URL on the public site. Behind the reverse proxy a route handler's request.url is the
 * container's own address (http://0.0.0.0:3000), so redirects use OWED_BASE_URL when it is set.
 */
export function publicUrl(path: string, request: { url: string }): URL {
  const base = process.env.OWED_BASE_URL?.replace(/\/$/, '');
  return new URL(path, base ? `${base}/` : request.url);
}

export const OWNER_ROLE = 'es-owner';
export const isOwner = (user: SessionUser | null) => !!user?.roles?.includes(OWNER_ROLE);

/** Logto role for Owed's admin pages (core-sso-webapp gives it to the es-owner, so only the platform owner has it). */
export const ADMIN_ROLE = 'owed-admin';
export const isAdmin = (user: SessionUser | null) => !!user?.roles?.includes(ADMIN_ROLE);

export async function signSession(user: SessionUser, secret: Uint8Array): Promise<string> {
  return new SignJWT({ ...user })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(user.sub)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DAYS}d`)
    .sign(secret);
}

export const sessionMaxAge = SESSION_DAYS * 86_400;

export async function readSession(token: string | undefined): Promise<SessionUser | null> {
  const config = authConfig();
  if (!config || !token) return null;
  try {
    const { payload } = await jwtVerify(token, config.secret, { algorithms: ['HS256'] });
    // Account deleted or removed by an admin after this session was issued: treat it as signed out
    if (await isRevoked(String(payload.sub), (payload.iat ?? 0) * 1000)) return null;
    return toUser(payload);
  } catch {
    return null;
  }
}

function toUser(p: JWTPayload & Record<string, unknown>): SessionUser {
  return {
    sub: String(p.sub),
    email: typeof p.email === 'string' ? p.email : undefined,
    name: typeof p.name === 'string' ? p.name : typeof p.username === 'string' ? p.username : undefined,
    picture: typeof p.picture === 'string' ? p.picture : undefined,
    roles: Array.isArray(p.roles) ? p.roles.map(String) : undefined,
  };
}

const b64url = (buf: ArrayBuffer | Uint8Array) => Buffer.from(buf instanceof Uint8Array ? buf : new Uint8Array(buf)).toString('base64url');
const random = (bytes = 32) => b64url(crypto.getRandomValues(new Uint8Array(bytes)));

export interface Flow {
  state: string;
  verifier: string;
  returnTo: string;
}

/** The Logto authorize URL plus the state/verifier to keep in a short-lived cookie. */
export async function startFlow(
  config: AuthConfig,
  opts: { register?: boolean; returnTo?: string; oneTimeToken?: string; loginHint?: string },
) {
  const flow: Flow = { state: random(16), verifier: random(32), returnTo: safeReturn(opts.returnTo) };
  const challenge = b64url(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(flow.verifier)));
  const url = new URL(`${config.endpoint}/oidc/auth`);
  url.search = new URLSearchParams({
    client_id: config.appId,
    redirect_uri: `${config.baseUrl}/auth/callback`,
    response_type: 'code',
    scope: 'openid profile email roles custom_data',
    state: flow.state,
    code_challenge: challenge,
    code_challenge_method: 'S256',
    prompt: 'login',
    ...(opts.register ? { first_screen: 'register', interaction_mode: 'signUp' } : {}),
    // Straight after Owed's own sign-up: Logto signs the new account in without a password prompt
    ...(opts.oneTimeToken && opts.loginHint ? { one_time_token: opts.oneTimeToken, login_hint: opts.loginHint } : {}),
  }).toString();
  return { url: url.toString(), flow };
}

export function safeReturn(path?: string | null): string {
  return path && path.startsWith('/') && !path.startsWith('//') ? path : '/app';
}

/** Exchanges the code and verifies the ID token. */
export async function finishFlow(config: AuthConfig, code: string, flow: Flow): Promise<SessionUser> {
  const res = await fetch(`${config.internal}/oidc/token`, {
    method: 'POST',
    headers: {
      'content-type': 'application/x-www-form-urlencoded',
      authorization: `Basic ${Buffer.from(`${encodeURIComponent(config.appId)}:${encodeURIComponent(config.appSecret)}`).toString('base64')}`,
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: `${config.baseUrl}/auth/callback`,
      code_verifier: flow.verifier,
      client_id: config.appId,
    }),
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`Token exchange failed (${res.status}): ${(await res.text()).slice(0, 200)}`);
  const tokens = (await res.json()) as { id_token?: string; access_token?: string };
  if (!tokens.id_token) throw new Error('No ID token in the token response');
  const { payload } = await jwtVerify(tokens.id_token, jwks(config), {
    issuer: `${config.endpoint}/oidc`,
    audience: config.appId,
  });
  const user = toUser(payload);
  user.email ??= tokens.access_token ? await contactEmail(config, tokens.access_token) : undefined;
  return user;
}

/** Sign-up collects an unverified email (Logto custom field contact_email, no code sent); it lives in custom_data. */
async function contactEmail(config: AuthConfig, accessToken: string): Promise<string | undefined> {
  try {
    const res = await fetch(`${config.internal}/oidc/me`, { headers: { authorization: `Bearer ${accessToken}` }, cache: 'no-store' });
    if (!res.ok) return undefined;
    const info = (await res.json()) as { custom_data?: { contact_email?: unknown } };
    const email = info.custom_data?.contact_email;
    return typeof email === 'string' && email.includes('@') ? email.trim().toLowerCase() : undefined;
  } catch {
    return undefined;
  }
}

let cachedJwks: ReturnType<typeof createRemoteJWKSet> | null = null;
function jwks(config: AuthConfig) {
  cachedJwks ??= createRemoteJWKSet(new URL(`${config.internal}/oidc/jwks`));
  return cachedJwks;
}

export function endSessionUrl(config: AuthConfig): string {
  const url = new URL(`${config.endpoint}/oidc/session/end`);
  url.search = new URLSearchParams({ client_id: config.appId, post_logout_redirect_uri: `${config.baseUrl}/` }).toString();
  return url.toString();
}
