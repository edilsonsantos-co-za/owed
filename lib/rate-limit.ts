// A small in-memory budget for the hosted demo, so a public URL cannot run up the Claude bill.
// Per-IP and global caps over a rolling day; enough for judges, not for abuse.
import 'server-only';

const DAY = 86_400_000;
const PER_IP = Number(process.env.OWED_TURNS_PER_IP_PER_DAY ?? 300);
const GLOBAL = Number(process.env.OWED_TURNS_PER_DAY ?? 3000);
const hits = new Map<string, number[]>();
let global: number[] = [];

export function allowTurn(request: Request): boolean {
  const now = Date.now();
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'local';
  const mine = (hits.get(ip) ?? []).filter((t) => now - t < DAY);
  global = global.filter((t) => now - t < DAY);
  if (mine.length >= PER_IP || global.length >= GLOBAL) return false;
  mine.push(now);
  global.push(now);
  hits.set(ip, mine);
  return true;
}
