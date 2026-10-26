// Server half of Owed's AG Studio <-> Claude bridge. AG Studio's agents speak AG-UI events and an
// OpenAI-style conversation format; this translates one agent turn into a streaming Claude Messages
// API call and translates Claude's stream back into AG-UI events.
import 'server-only';
import Anthropic from '@anthropic-ai/sdk';
import type {
  BetaContentBlockParam,
  BetaMessageParam,
  BetaThinkingBlockParam,
  BetaToolUnion,
} from '@anthropic-ai/sdk/resources/beta/messages/messages';
import type { AgAiEvent, AgAiOutputItem, AgLlmRequest, AgLlmResponse } from 'ag-studio';

export const DEFAULT_MODEL = 'claude-opus-5-5';
export const ALLOWED_MODELS = new Set(['claude-opus-5-5', 'claude-sonnet-5-5', 'claude-haiku-5-5']);
const EFFORTS = new Set(['low', 'medium', 'high', 'xhigh', 'max']);

const client = new Anthropic();

// Thinking blocks must go back to Claude unchanged, signature included, but AG Studio's reasoning
// items have nowhere to carry a signature. Keep the originals here, keyed by the reasoning item id.
const thinkingCache = new Map<string, BetaThinkingBlockParam>();
const rememberThinking = (id: string, block: BetaThinkingBlockParam) => {
  thinkingCache.set(id, block);
  if (thinkingCache.size > 2000) thinkingCache.delete(thinkingCache.keys().next().value!);
};

// Claude needs an object schema at the root of every tool. Studio's command-derived tools can have
// a union root; those are wrapped under `input` here and unwrapped before Studio sees the call.
const WRAP_KEY = 'input';
const isObjectRoot = (schema: Record<string, unknown>) => schema.type === 'object';

function toTools(request: AgLlmRequest, wrapped: Set<string>): BetaToolUnion[] {
  return (request.tools ?? []).map((tool) => {
    if (tool.kind === 'provided') return tool.provider as BetaToolUnion;
    const schema = tool.parameters as Record<string, unknown>;
    if (isObjectRoot(schema)) {
      return { name: tool.name, description: tool.description, input_schema: schema as Anthropic.Tool.InputSchema };
    }
    wrapped.add(tool.name);
    const { $defs, ...inner } = schema;
    return {
      name: tool.name,
      description: tool.description,
      input_schema: { type: 'object', properties: { [WRAP_KEY]: inner }, required: [WRAP_KEY], ...($defs ? { $defs } : {}) },
    };
  });
}

function toMessages(request: AgLlmRequest, keepThinking: boolean): { system: string; messages: BetaMessageParam[] } {
  const systemParts = request.instructions ? [request.instructions] : [];
  const messages: BetaMessageParam[] = [];
  const push = (role: 'user' | 'assistant', block: BetaContentBlockParam) => {
    const last = messages.at(-1);
    if (last && last.role === role) (last.content as BetaContentBlockParam[]).push(block);
    else messages.push({ role, content: [block] });
  };

  for (const item of request.input) {
    switch (item.type) {
      case 'message':
        if (item.role === 'system') {
          systemParts.push(item.content.map((c) => ('text' in c ? c.text : '')).join('\n'));
        } else if (item.role === 'user') {
          const text = item.content.map((c) => (c.type === 'text' ? c.text : '')).join('\n');
          if (text.trim()) push('user', { type: 'text', text });
        } else {
          const text = item.content.map((c) => ('text' in c ? c.text : 'refusal' in c ? c.refusal : '')).join('\n');
          if (text.trim()) push('assistant', { type: 'text', text });
        }
        break;
      case 'reasoning': {
        const block = keepThinking ? thinkingCache.get(item.id) : undefined;
        if (block) push('assistant', block);
        break;
      }
      case 'function_call': {
        let input: unknown = {};
        try {
          input = item.arguments ? JSON.parse(item.arguments) : {};
        } catch {
          input = {};
        }
        // Re-wrap union-root arguments the same way they were advertised.
        const tool = request.tools?.find((t) => t.name === item.name);
        if (tool && !isObjectRoot(tool.parameters as Record<string, unknown>)) input = { [WRAP_KEY]: input };
        push('assistant', { type: 'tool_use', id: item.callId, name: item.name, input });
        break;
      }
      case 'function_call_output':
        push('user', { type: 'tool_result', tool_use_id: item.callId, content: item.output || '(no output)' });
        break;
    }
  }

  // Opus 5.5 and Sonnet 5.5 reject forced tool choice, so "required" becomes an instruction instead.
  const choice = request.toolChoice;
  if (choice === 'required') systemParts.push('You must call at least one tool in this turn.');
  else if (choice && typeof choice === 'object') systemParts.push(`You must call the \`${choice.name}\` tool in this turn.`);
  if (request.responseFormat?.type === 'json') {
    systemParts.push(
      `Reply with only a JSON object (no prose, no code fences) matching this schema:\n${JSON.stringify(request.responseFormat.schema)}`,
    );
  }
  if (messages.length === 0 || messages[0].role !== 'user') messages.unshift({ role: 'user', content: 'Continue.' });
  return { system: systemParts.join('\n\n'), messages };
}

type Emit = (event: AgAiEvent) => void;

/** Runs one turn against Claude, emitting AG-UI events as they stream, and returns the final response. */
export async function runTurn(request: AgLlmRequest, emit: Emit, signal: AbortSignal): Promise<AgLlmResponse> {
  const model = request.model?.id && ALLOWED_MODELS.has(request.model.id) ? request.model.id : DEFAULT_MODEL;
  const effort = (request.model?.effort && EFFORTS.has(request.model.effort) ? request.model.effort : 'medium') as 'medium';
  const wrapped = new Set<string>();
  const tools = toTools(request, wrapped);
  const toolChoice = request.toolChoice === 'none' ? { type: 'none' as const } : { type: 'auto' as const };

  const attempt = async (keepThinking: boolean) => {
    const { system, messages } = toMessages(request, keepThinking);
    const stream = client.beta.messages.stream(
      {
        model,
        max_tokens: 32000,
        system,
        messages,
        tools: tools.length ? tools : undefined,
        tool_choice: tools.length ? toolChoice : undefined,
        thinking: { type: 'adaptive', display: 'summarized' },
        output_config: { effort },
        // Route a safety-classifier refusal to Anthropic's recommended fallback model.
        betas: ['server-side-fallback-2026-07-01'],
        fallbacks: 'default',
      },
      { signal },
    );

    // Stream Claude's content blocks out as AG-UI events. Tool arguments are held back until the
    // block closes so a wrapped union-root call can be unwrapped before Studio parses it.
    const blocks = new Map<number, { kind: 'text' | 'thinking' | 'tool'; id: string; name?: string; args: string }>();
    for await (const event of stream) {
      if (event.type === 'content_block_start') {
        const b = event.content_block;
        const id = `${event.index}-${crypto.randomUUID()}`;
        if (b.type === 'text') {
          blocks.set(event.index, { kind: 'text', id, args: '' });
          emit({ type: 'TEXT_MESSAGE_START', messageId: id, role: 'assistant' });
        } else if (b.type === 'thinking') {
          blocks.set(event.index, { kind: 'thinking', id, args: '' });
          emit({ type: 'REASONING_MESSAGE_START', messageId: id, role: 'reasoning' });
        } else if (b.type === 'tool_use') {
          blocks.set(event.index, { kind: 'tool', id: b.id, name: b.name, args: '' });
          emit({ type: 'TOOL_CALL_START', toolCallId: b.id, toolCallName: b.name });
        }
      } else if (event.type === 'content_block_delta') {
        const open = blocks.get(event.index);
        if (!open) continue;
        if (event.delta.type === 'text_delta') emit({ type: 'TEXT_MESSAGE_CONTENT', messageId: open.id, delta: event.delta.text });
        else if (event.delta.type === 'thinking_delta' && event.delta.thinking)
          emit({ type: 'REASONING_MESSAGE_CONTENT', messageId: open.id, delta: event.delta.thinking });
        else if (event.delta.type === 'input_json_delta') open.args += event.delta.partial_json;
      } else if (event.type === 'content_block_stop') {
        const open = blocks.get(event.index);
        if (!open) continue;
        if (open.kind === 'text') emit({ type: 'TEXT_MESSAGE_END', messageId: open.id });
        else if (open.kind === 'thinking') emit({ type: 'REASONING_MESSAGE_END', messageId: open.id });
        else {
          emit({ type: 'TOOL_CALL_ARGS', toolCallId: open.id, delta: unwrapArgs(open.name!, open.args || '{}', wrapped) });
          emit({ type: 'TOOL_CALL_END', toolCallId: open.id });
        }
      }
    }
    return stream.finalMessage();
  };

  let message;
  try {
    message = await attempt(true);
  } catch (err) {
    // A thinking block Claude no longer accepts (history Studio trimmed, a different model) is not
    // worth failing the turn over: retry once with reasoning dropped from the history.
    if (err instanceof Anthropic.BadRequestError && /thinking/i.test(err.message)) message = await attempt(false);
    else throw err;
  }

  const output: AgAiOutputItem[] = [];
  for (const block of message.content) {
    if (block.type === 'thinking') {
      const id = `rs_${crypto.randomUUID()}`;
      rememberThinking(id, { type: 'thinking', thinking: block.thinking, signature: block.signature });
      output.push({ id, kind: 'output', type: 'reasoning', summary: block.thinking ? [{ type: 'summary', text: block.thinking }] : [] });
    } else if (block.type === 'text') {
      const last = output.at(-1);
      if (last?.type === 'message') last.content.push({ type: 'text', text: block.text, annotations: [] });
      else
        output.push({
          id: `msg_${crypto.randomUUID()}`,
          kind: 'output',
          type: 'message',
          role: 'assistant',
          status: 'completed',
          content: [{ type: 'text', text: block.text, annotations: [] }],
        });
    } else if (block.type === 'tool_use') {
      output.push({
        id: `fc_${block.id}`,
        kind: 'output',
        type: 'function_call',
        callId: block.id,
        name: block.name,
        arguments: unwrapArgs(block.name, JSON.stringify(block.input ?? {}), wrapped),
        status: 'completed',
      });
    }
  }

  const refused = message.stop_reason === 'refusal';
  return {
    id: message.id,
    createdAt: Date.now(),
    model: message.model,
    output,
    status: refused ? 'failed' : message.stop_reason === 'max_tokens' ? 'incomplete' : 'completed',
    ...(refused && { error: { code: 'refusal', message: 'Claude declined this request.' } }),
    ...(message.stop_reason === 'max_tokens' && { incompleteDetails: { reason: 'max_output_tokens' as const } }),
    usage: {
      inputTokens: message.usage.input_tokens,
      outputTokens: message.usage.output_tokens,
      totalTokens: message.usage.input_tokens + message.usage.output_tokens,
      cachedInputTokens: message.usage.cache_read_input_tokens ?? undefined,
      cacheWriteTokens: message.usage.cache_creation_input_tokens ?? undefined,
    },
  };
}

function unwrapArgs(name: string, json: string, wrapped: Set<string>) {
  if (!wrapped.has(name)) return json;
  try {
    return JSON.stringify(JSON.parse(json)[WRAP_KEY] ?? {});
  } catch {
    return json;
  }
}
