# Testing Owed

Owed runs in three stages. Each one adds a key and switches on more of the app, so test them in order.
Put the keys in `.env.local` (copy `.env.example`) and restart `npm run dev` after each change.
The **Connections** card in the sidebar, and the last step of **How Owed works**, show which ones are on.

| Stage | Keys | What it switches on |
| --- | --- | --- |
| 1. Demo | none | Dashboard, focus list, approvals and activity on built-in demo data |
| 2. Agents | `ANTHROPIC_API_KEY` | **Ask Owed** chat, the collections and invoicing agents, the written morning brief |
| 3. Live PayPal | `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET` | Real sandbox invoices and payments; approvals send real PayPal reminders and invoices |

`AG_STUDIO_LICENSE_KEY` is optional at every stage. It only removes the trial watermark.

## Stage 1: demo data, no keys

- [ ] First visit opens **How Owed works**. Step through it; **Start using Owed** closes it and it does not come back on reload.
      Reopen it from **How Owed works** in the sidebar.
- [ ] **Overview**: four totals, **Today's focus** (rule-based without a key), Aging and Cash forecast charts, and the open-invoices table.
- [ ] **Clients**: risk and days-to-pay charts, client table.
- [ ] **Customize** opens the full-screen editor. Remove a chart, **Undo** it, drag a chart type from **Compose** onto the canvas,
      then **Cancel**: the dashboard is back as it was. Make a change and **Save**: it survives a reload.
      **Reset to default**, then **Save**, puts the original back.
- [ ] **Approvals** is empty ("No drafts yet"). **Ask Owed** is greyed out until stage 2.

## Stage 2: add `ANTHROPIC_API_KEY`

Get it from console.anthropic.com → API keys. Usage is billed to that account; a full test run costs cents.

- [ ] **Connections** shows Claude agents on. **Today's focus** becomes **Morning brief**, written by Claude.
- [ ] **Ask Owed** opens the chat beside the dashboard. Try **"Chase everyone more than 30 days late"**.
      A toast says drafts are waiting; **Review** opens **Approvals**.
- [ ] Each draft shows the agent's reason and a friendly / firm / final tone. Edit one, **Approve & send (demo)**.
      **Activity** records it and the invoice's reminder count goes up. **Discard** another.
- [ ] **"Invoice Fernhill Yoga for this month's social content pack, same as last time"** produces an invoice draft with line items.
- [ ] **"Add a chart of overdue amount by client"** adds a chart to the dashboard.

## Stage 3: add PayPal sandbox credentials

1. developer.paypal.com → **Apps & Credentials** → **Sandbox** → create a REST app (or use the default one).
2. On the app, make sure **Invoicing** and **Transaction search** are ticked under features.
3. Copy the client id and secret into `.env.local`, then run `npm run seed`. It creates about 29 invoices across
   7 clients and records payments on the paid ones (`npm run seed -- --reset` starts over).
4. Restart `npm run dev`.

- [ ] The **Demo data** badge is gone and the workspace says **PayPal sandbox account**. The numbers match the seeded invoices.
- [ ] Approving a reminder sends it through PayPal. Log in to sandbox.paypal.com with the sandbox **business** account
      (developer dashboard → **Sandbox accounts**) and check the invoice under Invoicing. Sandbox never emails real people.
- [ ] Approving a new invoice creates and sends it in the sandbox. **Refresh** in Owed shows it.
- [ ] A PayPal error (for example, a wrong secret) shows as a red banner or on the draft, not a blank page.

Set `OWED_MODE=demo` to go back to demo data without removing the PayPal keys.
