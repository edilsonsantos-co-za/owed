# Status and handoff

Last updated 27 Oct 2026. Hackathon deadline: **12 Nov 2026, 12:00 PST** (see [hackathon.md](hackathon.md)).

## Where things stand

Owed runs end to end on demo data. Nothing has been tested yet with real Anthropic or PayPal keys.

| Area | State |
| --- | --- |
| App shell | Sidebar app: Overview, Clients, Approvals (pending count), Activity, Connections card |
| Overview | KPI cards, Today's focus / morning brief, themed AG Studio dashboard |
| Ask Owed | Opens Studio's AI chat panel beside the dashboard; disabled until `ANTHROPIC_API_KEY` is set |
| Customize | Full-screen editor: page tabs, undo/redo, Reset to default, Cancel, Save (layout saved in browser localStorage, key `owed.dashboard.v1`) |
| How Owed works | 6-step guide, opens on first visit (`owed.tour.v1` in localStorage), reopen from the sidebar; last step is the setup checklist |
| Approvals | Inbox with agent reasoning, editable subject and message, Approve & send / Discard |
| Activity | Timeline of agent, owner and system actions |
| Dev console | AG Studio's no-licence banner is routed to `console.info`, so the Next.js dev overlay stays at 0 issues |
| Testing | Stage-by-stage checklist in [testing.md](testing.md) |
| Video | Pipeline in `video/` (`npm run video`). On hold until the owner is happy with the app |

## What the owner needs to supply

In this order, in `.env.local` (copy `.env.example`), restarting `npm run dev` after each:

1. `ANTHROPIC_API_KEY`: switches on Ask Owed, the agents and the written morning brief.
2. `PAYPAL_CLIENT_ID` and `PAYPAL_CLIENT_SECRET` (Sandbox REST app with Invoicing and Transaction search), then `npm run seed`.
3. Optional: `AG_STUDIO_LICENSE_KEY` (AG Grid 45-day trial) removes the chart watermark.
4. Later, for submission: a Render account to host the demo (`render.yaml` is ready).

## Agreed order of work

1. Owner tests on demo data, then with each key, using [testing.md](testing.md), and reports issues.
2. Fix and refine until the owner is happy.
3. Only then: deploy, record the video, write the Devpost submission.

## Running it locally

```bash
cd ~/workspace/edilsonsantos-co-za/owed
npm ci                    # only if node_modules is missing
npm run dev -- -p 3311    # http://localhost:3311
```

Gotchas:

- On 26 Oct, `node_modules` and `.next` disappeared while the dev server was running (something cleaned git-ignored files).
  Symptom: localhost:3311 stops answering. Fix: `npm ci`, then start the dev server again.
- Don't run `npm run build` while the dev server is running; both write to `.next`. Stop the server first, or restart it afterwards.
- `.data/owed.json` holds local drafts, reminders and the audit log (git-ignored). It was reset to empty before handoff.
- Clear `owed.tour.v1` / `owed.dashboard.v1` in the browser's localStorage to see the first-visit guide or the default layout again.

## Not yet verified

- AI chat, agents and the Claude-written brief (needs `ANTHROPIC_API_KEY`).
- Live PayPal: seeding, reading the sandbox ledger, and sending reminders and invoices (needs sandbox credentials).
- Hosted deploy on Render.
