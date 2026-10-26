import { connection } from 'next/server';
import { getLedger } from '@/lib/ledger';
import { readStore } from '@/lib/store';

export async function GET() {
  await connection();
  try {
    const [ledger, store] = await Promise.all([getLedger(), readStore()]);
    return Response.json({ ledger, drafts: store.drafts.slice(0, 50), audit: store.audit.slice(0, 50) });
  } catch (err) {
    return Response.json({ error: err instanceof Error ? err.message : String(err) }, { status: 502 });
  }
}
