import { z } from 'zod';
import { discardDraft, sendDraft } from '@/lib/ledger';

const Body = z.object({
  action: z.enum(['send', 'discard']),
  subject: z.string().max(200).optional(),
  note: z.string().max(4000).optional(),
});

// The only way a drafted action reaches PayPal: a person pressing Send in the approval queue.
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const parsed = Body.safeParse(await request.json());
  if (!parsed.success) return Response.json({ error: parsed.error.message }, { status: 400 });
  const { action, subject, note } = parsed.data;
  try {
    const draft = action === 'send' ? await sendDraft(id, { subject, note }) : await discardDraft(id);
    if (!draft) return Response.json({ error: 'Draft not found' }, { status: 404 });
    return Response.json({ draft });
  } catch (err) {
    return Response.json({ error: err instanceof Error ? err.message : String(err) }, { status: 409 });
  }
}
