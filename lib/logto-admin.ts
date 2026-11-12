// Logto Management API (M2M app owed-webapp-m2m): the profile page (name, username, password) and the
// admin page's "remove". Sign-up itself is Logto's hosted flow (email, emailed code, password).
import 'server-only';
import { authConfig } from './auth';

const RESOURCE = 'https://default.logto.app/api';

function m2m() {
  const config = authConfig();
  const id = process.env.LOGTO_M2M_APP_ID;
  const secret = process.env.LOGTO_M2M_APP_SECRET;
  return config && id && secret ? { base: config.internal, id, secret } : null;
}

export const profileEnabled = () => m2m() !== null;

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
  if (!c) throw new Error('The Logto Management API is not configured');
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

export interface Profile {
  name: string;
  username: string;
  email: string;
  hasPassword: boolean;
}

/** The person's Logto profile, or null when the Management API is off or unreachable. */
export async function getProfile(sub: string): Promise<Profile | null> {
  if (!profileEnabled()) return null;
  const res = await api(`/users/${encodeURIComponent(sub)}`, undefined, 'GET').catch(() => null);
  if (!res?.ok) return null;
  const u = (await res.json()) as { name?: string | null; username?: string | null; primaryEmail?: string | null; hasPassword?: boolean };
  return { name: u.name ?? '', username: u.username ?? '', email: u.primaryEmail ?? '', hasPassword: u.hasPassword ?? true };
}

export type ProfileResult = 'saved' | 'username-taken' | 'username-invalid' | 'username-required' | 'failed';
const USERNAME = /^[A-Z_a-z]\w{2,31}$/;

/** Updates the display name and username. A username can only be cleared when an email can still sign in. */
export async function updateProfile(sub: string, name: string, username: string): Promise<ProfileResult> {
  const current = await getProfile(sub);
  if (!current) return 'failed';
  if (username && !USERNAME.test(username)) return 'username-invalid';
  if (!username && !current.email) return 'username-required';
  const body: Record<string, string | null> = { name: name || null };
  if (username !== current.username) body.username = username || null;
  const res = await api(`/users/${encodeURIComponent(sub)}`, body, 'PATCH');
  if (res.ok) return 'saved';
  const err = (await res.json().catch(() => ({}))) as { code?: string };
  if (err.code === 'user.username_already_in_use') return 'username-taken';
  if (err.code?.startsWith('guard.')) return 'username-invalid';
  console.error('[owed] profile update failed', res.status, err.code);
  return 'failed';
}

export type PasswordResult = 'saved' | 'wrong-current' | 'weak' | 'failed';

/** Changes the password after checking the current one, so a borrowed signed-in browser can't take the account. */
export async function changePassword(sub: string, current: string, next: string): Promise<PasswordResult> {
  const id = encodeURIComponent(sub);
  const check = await api(`/users/${id}/password/verify`, { password: current });
  if (check.status === 422 || check.status === 400) return 'wrong-current';
  if (!check.ok) {
    console.error('[owed] password check failed', check.status);
    return 'failed';
  }
  const res = await api(`/users/${id}/password`, { password: next }, 'PATCH');
  if (res.ok) return 'saved';
  const err = (await res.json().catch(() => ({}))) as { code?: string };
  if (res.status === 422 || err.code?.startsWith('password.')) return 'weak';
  console.error('[owed] password change failed', res.status, err.code);
  return 'failed';
}
