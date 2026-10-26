import { connection } from 'next/server';
import { getBrief } from '@/lib/brief';

export async function GET(request: Request) {
  await connection();
  if (!process.env.ANTHROPIC_API_KEY) return Response.json({ error: 'ANTHROPIC_API_KEY is not set.' }, { status: 503 });
  try {
    const force = new URL(request.url).searchParams.has('refresh');
    return Response.json(await getBrief(force));
  } catch (err) {
    return Response.json({ error: err instanceof Error ? err.message : String(err) }, { status: 502 });
  }
}
