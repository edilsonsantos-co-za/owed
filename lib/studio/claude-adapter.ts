// Browser half of the AG Studio <-> Claude bridge: an AgLlmAdapter that forwards each agent turn to
// /api/ai/turn and replays the streamed AG-UI events to Studio.
import type { AgAiEvent, AgLlmAdapter, AgLlmResponse } from 'ag-studio';

export const claudeAdapter = (endpoint = '/api/ai/turn'): AgLlmAdapter => ({
  executeTurn(request, options) {
    let resolveComplete!: (r: AgLlmResponse) => void;
    const complete = new Promise<AgLlmResponse>((resolve) => (resolveComplete = resolve));
    const failed = (message: string): AgLlmResponse => ({
      id: crypto.randomUUID(),
      createdAt: Date.now(),
      output: [],
      status: 'failed',
      error: { code: 'transport', message },
    });

    async function* events(): AsyncGenerator<AgAiEvent> {
      let settled = false;
      try {
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(request),
          signal: options?.signal,
        });
        if (!res.ok || !res.body) {
          const text = await res.text().catch(() => '');
          resolveComplete(failed(text || `HTTP ${res.status}`));
          settled = true;
          return;
        }
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        for (;;) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          let newline;
          while ((newline = buffer.indexOf('\n')) >= 0) {
            const line = buffer.slice(0, newline).trim();
            buffer = buffer.slice(newline + 1);
            if (!line) continue;
            const msg = JSON.parse(line) as { event?: AgAiEvent; complete?: AgLlmResponse };
            if (msg.event) yield msg.event;
            if (msg.complete) {
              resolveComplete(msg.complete);
              settled = true;
            }
          }
        }
      } catch (err) {
        if (!settled) resolveComplete(failed(err instanceof Error ? err.message : String(err)));
        settled = true;
        if (!(err instanceof DOMException && err.name === 'AbortError')) throw err;
      } finally {
        if (!settled) resolveComplete(failed('Stream ended without a response'));
      }
    }

    return { stream: events(), complete };
  },
});
