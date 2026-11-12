// Sessions are signed cookies (7 days), so deleting or removing an account must also end the sessions it
// already holds: a session issued before the account's revocation time is refused (lib/auth.ts readSession).
import { promises as fs } from 'node:fs';
import path from 'node:path';

const FILE = path.join(process.cwd(), '.data', 'revoked.json');
type Revoked = Record<string, string>; // sub -> ISO time sessions were revoked
let queue: Promise<unknown> = Promise.resolve();

async function read(): Promise<Revoked> {
  try {
    return JSON.parse(await fs.readFile(FILE, 'utf8')) as Revoked;
  } catch {
    return {};
  }
}

/** Ends every session this account holds now; a later sign-in (a new account) works again. */
export function revokeSessions(sub: string): Promise<void> {
  const run = queue.then(async () => {
    const all = await read();
    all[sub] = new Date().toISOString();
    await fs.mkdir(path.dirname(FILE), { recursive: true });
    await fs.writeFile(`${FILE}.tmp`, JSON.stringify(all, null, 2));
    await fs.rename(`${FILE}.tmp`, FILE);
  });
  queue = run.catch(() => undefined);
  return run;
}

/** True when the session (issued at issuedAtMs) predates a revocation of this account. */
export async function isRevoked(sub: string, issuedAtMs: number): Promise<boolean> {
  const at = (await read())[sub];
  return !!at && issuedAtMs <= Date.parse(at);
}
