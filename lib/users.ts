// Who has signed in to the hosted Owed: one row per SSO account, for the owner's sign-up list.
import 'server-only';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import type { SessionUser } from './auth';

export interface UserRow {
  sub: string;
  email?: string;
  name?: string;
  firstSeen: string;
  lastSeen: string;
  signIns: number;
}

const FILE = path.join(process.cwd(), '.data', 'users.json');
let queue: Promise<unknown> = Promise.resolve();

export async function listUsers(): Promise<UserRow[]> {
  try {
    const rows = JSON.parse(await fs.readFile(FILE, 'utf8')) as UserRow[];
    return rows.sort((a, b) => b.lastSeen.localeCompare(a.lastSeen));
  } catch {
    return [];
  }
}

export function recordSignIn(user: SessionUser): Promise<void> {
  const run = queue.then(async () => {
    const rows = await listUsers();
    const now = new Date().toISOString();
    const row = rows.find((r) => r.sub === user.sub);
    if (row) {
      Object.assign(row, { email: user.email ?? row.email, name: user.name ?? row.name, lastSeen: now, signIns: row.signIns + 1 });
    } else {
      rows.push({ sub: user.sub, email: user.email, name: user.name, firstSeen: now, lastSeen: now, signIns: 1 });
    }
    await fs.mkdir(path.dirname(FILE), { recursive: true });
    const tmp = `${FILE}.tmp`;
    await fs.writeFile(tmp, JSON.stringify(rows, null, 2));
    await fs.rename(tmp, FILE);
  });
  queue = run.catch(() => undefined);
  return run;
}
