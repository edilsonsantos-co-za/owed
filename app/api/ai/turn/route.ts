import Anthropic from '@anthropic-ai/sdk';
import type { AgLlmRequest } from 'ag-studio';
import { runTurn } from '@/lib/claude-turn';
import { allowTurn } from '@/lib/rate-limit';

// One AG Studio agent turn, answered by Claude. Streams newline-delimited JSON: AG-UI events as they
// happen, then a final `{ "complete": AgLlmResponse }` line. The Anthropic key stays on the server.
export async function POST(request: Request) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return Response.json({ error: 'ANTHROPIC_API_KEY is not set on the server.' }, { status: 503 });
  }
  if (!allowTurn(request)) {
    return Response.json({ error: 'The demo has reached its daily AI budget. Run Owed locally with your own key to keep going.' }, { status: 429 });
  }
  const body = (await request.json()) as AgLlmRequest;
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const write = (value: unknown) => controller.enqueue(encoder.encode(`${JSON.stringify(value)}\n`));
      try {
        const complete = await runTurn(body, (event) => write({ event }), request.signal);
        write({ complete });
      } catch (err) {
        const message =
          err instanceof Anthropic.APIError ? `Claude API error ${err.status ?? ''}: ${err.message}` : err instanceof Error ? err.message : String(err);
        write({ complete: { id: crypto.randomUUID(), createdAt: Date.now(), output: [], status: 'failed', error: { code: 'llm_error', message } } });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, { headers: { 'Content-Type': 'application/x-ndjson', 'Cache-Control': 'no-store' } });
}
