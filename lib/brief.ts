// The morning brief: a server-side Claude agent that investigates the PayPal account with PayPal's
// own Agent Toolkit (read-only tools) and returns a short, structured cash-collection briefing.
import 'server-only';
import Anthropic from '@anthropic-ai/sdk';
import type { BetaMessageParam, BetaToolResultBlockParam, BetaToolUnion } from '@anthropic-ai/sdk/resources/beta/messages/messages';
import { PayPalAgentToolkit } from '@paypal/agent-toolkit/bedrock';
import { getLedger, isLive } from './ledger';

export interface Brief {
  headline: string;
  points: string[];
  focus: { client: string; why: string; suggestedAction: string }[];
  generatedAt: string;
  toolCalls: string[];
  mode: 'live' | 'demo';
}

const BRIEF_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['headline', 'points', 'focus'],
  properties: {
    headline: { type: 'string', description: 'One sentence, under 20 words: the single most important thing today.' },
    points: { type: 'array', items: { type: 'string' }, description: '2-4 short factual observations with dollar amounts.' },
    focus: {
      type: 'array',
      description: 'Up to 3 clients to act on today, most urgent first.',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['client', 'why', 'suggestedAction'],
        properties: { client: { type: 'string' }, why: { type: 'string' }, suggestedAction: { type: 'string' } },
      },
    },
  },
} as const;

const SYSTEM = `You prepare a morning cash-collection brief for the owner of a small design studio that bills clients through PayPal invoices.
Be concrete and brief: dollar amounts, client names, days overdue. No pleasantries. Suggested actions are things the owner can do in Owed today (e.g. "approve a firm reminder", "call them", "pause new work", "send this month's invoice").`;

const client = new Anthropic();
let cached: Brief | undefined;

export async function getBrief(force = false): Promise<Brief> {
  const today = new Date().toISOString().slice(0, 10);
  if (cached && !force && cached.generatedAt.slice(0, 10) === today) return cached;

  const toolCalls: string[] = [];
  let tools: BetaToolUnion[] = [];
  let toolkit: PayPalAgentToolkit | undefined;
  const messages: BetaMessageParam[] = [];

  if (isLive()) {
    // PayPal's Agent Toolkit, restricted to read-only actions: the brief only looks.
    toolkit = new PayPalAgentToolkit({
      clientId: process.env.PAYPAL_CLIENT_ID!,
      clientSecret: process.env.PAYPAL_CLIENT_SECRET!,
      configuration: {
        actions: { invoices: { list: true, get: true, search: true }, transactions: { list: true }, disputes: { list: true }, insights: { get: true } },
        context: { sandbox: process.env.PAYPAL_API_BASE?.includes('sandbox') ?? true },
      },
    });
    tools = toolkit.getTools().map((t) => ({
      name: t.toolSpec.name,
      description: t.toolSpec.description,
      input_schema: t.toolSpec.inputSchema.json,
    }));
    messages.push({
      role: 'user',
      content: `Today is ${today}. Use the PayPal tools to review invoices (and recent transactions and disputes if useful), then write the brief.`,
    });
  } else {
    // Demo mode has no PayPal account to query, so Claude gets the same ledger the dashboard shows.
    const ledger = await getLedger();
    const open = ledger.invoices.filter((i) => i.outstanding > 0);
    messages.push({
      role: 'user',
      content: `Today is ${today}. Open invoices:\n${JSON.stringify(open.map(({ number, client, outstanding, dueDate, daysOverdue, remindersSent }) => ({ number, client, outstanding, dueDate, daysOverdue, remindersSent })))}\n\nClient behaviour:\n${JSON.stringify(ledger.clients.map(({ company, avgDaysLate, onTimeRate, riskLevel, outstanding }) => ({ company, avgDaysLate, onTimeRate, riskLevel, outstanding })))}\n\nWrite the brief.`,
    });
  }

  for (let turn = 0; turn < 12; turn++) {
    const response = await client.beta.messages.create({
      model: 'claude-opus-5-5',
      max_tokens: 16000,
      system: SYSTEM,
      messages,
      tools: tools.length ? tools : undefined,
      output_config: { effort: 'low', format: { type: 'json_schema', schema: BRIEF_SCHEMA } },
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
    });
    messages.push({ role: 'assistant', content: response.content });

    if (response.stop_reason === 'tool_use' && toolkit) {
      const results: BetaToolResultBlockParam[] = [];
      for (const block of response.content) {
        if (block.type !== 'tool_use') continue;
        toolCalls.push(block.name);
        try {
          const result = await toolkit.handleToolCall({ toolUseId: block.id, name: block.name, input: block.input });
          const text = result.content.map((c) => c.text).join('\n').slice(0, 60_000);
          results.push({ type: 'tool_result', tool_use_id: block.id, content: text });
        } catch (err) {
          results.push({ type: 'tool_result', tool_use_id: block.id, is_error: true, content: err instanceof Error ? err.message : String(err) });
        }
      }
      messages.push({ role: 'user', content: results });
      continue;
    }

    if (response.stop_reason === 'refusal') throw new Error('Claude declined to write the brief.');
    const text = response.content.flatMap((b) => (b.type === 'text' ? [b.text] : [])).join('');
    const parsed = JSON.parse(text) as Omit<Brief, 'generatedAt' | 'toolCalls' | 'mode'>;
    cached = { ...parsed, generatedAt: new Date().toISOString(), toolCalls, mode: isLive() ? 'live' : 'demo' };
    return cached;
  }
  throw new Error('The brief agent did not finish in 12 turns.');
}
