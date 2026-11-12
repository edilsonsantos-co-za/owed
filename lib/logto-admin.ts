// Owed's own email + password sign-up. Logto's hosted sign-up only takes an email with a verification
// code, and prod mail cannot reach the public yet, so Owed creates the account through the Logto
// Management API (M2M app owed-webapp-m2m) and signs the person in with a one-time token. No email is sent.
import 'server-only';
import { authConfig } from './auth';

const RESOURCE = 'https://default.logto.app/api';

function m2m() {
  const config = authConfig();
  const id = process.env.LOGTO_M2M_APP_ID;
  const secret = process.env.LOGTO_M2M_APP_SECRET;
  return config && id && secret ? { base: config.internal, id, secret } : null;
}

export const signUpEnabled = () => m2m() !== null;

let cached: { token: string; until: number } | null = null;
async function token(c: NonNullable<ReturnType<typeof m2m>>): Promise<string> {
  if (cached && cached.until > Date.now()) return cached.token;
  const res = await fetch(`${c.base}/oidc/token`, {
    method: 'POST',
    headers: {
      'content-type': 'application/x-www-form-urlencoded',
      authorization: `Basic ${Buffer.from(`${encodeURIComponent(c.id)}:${encodeURIComponent(c.secret)}`).toString('base64')}`,
    },
    body: new URLSearchParams({ grant_type: 'client_credentials', resource: RESOURCE, scope: 'all' }),
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`M2M token failed (${res.status})`);
  const body = (await res.json()) as { access_token: string; expires_in: number };
  cached = { token: body.access_token, until: Date.now() + (body.expires_in - 60) * 1000 };
  return body.access_token;
}

async function api(path: string, body?: unknown, method = 'POST') {
  const c = m2m();
  if (!c) throw new Error('Sign-up is not configured');
  return fetch(`${c.base}/api${path}`, {
    method,
    headers: { 'content-type': 'application/json', authorization: `Bearer ${await token(c)}` },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    cache: 'no-store',
  });
}

/** Roles that can never be removed from Owed's admin page (the platform owner and Owed admins). */
const PROTECTED_ROLES = ['es-owner', 'owed-admin'];

export type RemoveResult = 'removed' | 'not-found' | 'protected' | 'failed';

/**
 * Deletes the person's DataSparkLab account in Logto (their sign-in for every DataSparkLab app), unless they
 * hold an owner/admin role. 'not-found' means Logto has no such user any more, so only Owed's record remains.
 */
export async function removeLogtoUser(sub: string): Promise<RemoveResult> {
  const id = encodeURIComponent(sub);
  const roles = await api(`/users/${id}/roles`, undefined, 'GET');
  if (roles.status === 404) return 'not-found';
  if (!roles.ok) {
    console.error('[owed] could not read roles before removing a user', roles.status);
    return 'failed';
  }
  const names = ((await roles.json()) as { name: string }[]).map((r) => r.name);
  if (names.some((n) => PROTECTED_ROLES.includes(n))) return 'protected';
  const res = await api(`/users/${id}`, undefined, 'DELETE');
  if (res.status === 404) return 'not-found';
  if (!res.ok) {
    console.error('[owed] Logto refused to delete a user', res.status);
    return 'failed';
  }
  return 'removed';
}

export type SignUpResult = { ok: true; oneTimeToken: string } | { ok: false; error: 'exists' | 'password' | 'failed'; message?: string };

/** Creates the Logto user (email unverified, no mail sent) and returns a one-time sign-in token for it. */
export async function createAccount(email: string, password: string, name?: string): Promise<SignUpResult> {
  const created = await api('/users', { primaryEmail: email, password, ...(name ? { name } : {}) });
  if (!created.ok) {
    const err = (await created.json().catch(() => ({}))) as { code?: string; message?: string };
    if (err.code === 'user.email_already_in_use') return { ok: false, error: 'exists' };
    if (err.code?.startsWith('password.')) return { ok: false, error: 'password', message: err.message };
    console.error('[owed] sign-up failed', created.status, err.code);
    return { ok: false, error: 'failed' };
  }
  const ott = await api('/one-time-tokens', { email, expiresIn: 600 });
  if (!ott.ok) {
    console.error('[owed] one-time token failed', ott.status);
    return { ok: false, error: 'failed' };
  }
  const { token: oneTimeToken } = (await ott.json()) as { token: string };
  return { ok: true, oneTimeToken };
}
