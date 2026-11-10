## Inspiration

Every freelancer I know has the same awkward moment: the work is delivered, the invoice went out through PayPal, and three weeks later it is still unpaid. Then come the questions. Do I nudge? How hard? Will a firm email cost me the client?

Chasing money is not hard work, but it is draining, and most of us either put it off or send the same polite note to everyone. Yet clients are not all the same. One always pays two days early; another pays seven weeks late, every time. I wanted a tool that knows the difference and does the chasing for me, **without ever sending anything on my behalf without my say-so.**

That became **Owed**: an AI collections copilot for freelancers and small studios who bill through PayPal.

## What it does

- **Reads your PayPal invoices** (Invoicing v2 and Transaction Search) and turns them into a live receivables dashboard: what is outstanding, what is overdue, how old it is, and when the cash should actually land.
- **Builds a payment profile for every client** from their real history: average days late, on-time rate and a risk score.
- **Writes a morning brief.** A Claude agent investigates the account with the **PayPal Agent Toolkit** (read-only tools) and names the one thing that matters today.
- **Lets you chat with a team of agents.** AG Studio's built-in agents and Owed's own *collections agent* all run on Claude. Ask *"chase everyone more than 30 days late"* and they draft a reminder for each client, in the right tone.
- **Approval queue.** Every draft lands in Approvals with its tone (friendly, firm or final) and a one-line reason. You edit, approve, and Owed sends a real PayPal reminder with a pay button.
- **Audit trail.** Activity records every draft, approval and PayPal call, and who did it: you, an agent, or the system.
- **First-visit walkthrough.** It opens each page in turn and spotlights what it explains.

## How I built it

| Layer | What I used |
| --- | --- |
| App | Next.js 16 (App Router), React, Tailwind CSS v4 |
| Dashboard | **AG Studio** embedded dashboards, themed to the brand, with a full-screen *Customize* editor |
| Agents | **AG Studio Agent Framework** with a custom **Claude adapter**, plus a custom `collections` agent the built-in lead agent can delegate to |
| AI model | **Claude** (Anthropic API) for the chat agents, the collections agent and the morning brief |
| PayPal | **Invoicing v2** (list, get, create, send, remind), **Transaction Search**, **PayPal Agent Toolkit** (`list_invoices`, `search_invoices`, `list_transactions`, `get_merchant_insights` …) |
| Auth | Logto (OIDC + PKCE), with an `owed-admin` role gating the admin page |
| Hosting | Docker on my own VPS, deployed on every push to `main` |

### Approval is structural, not a prompt

The most important design decision: **agents cannot send anything.** Their tools can only *queue drafts*. The only code path that calls PayPal's `remind` or `send` endpoints is the approval button, which needs a signed-in human. A prompt can be talked out of a rule; a missing tool cannot be.

### The payment-behaviour model

For each client $c$ with settled invoices $S_c$, the average lateness is

$$
\bar{L}_c = \frac{1}{|S_c|} \sum_{i \in S_c} \left( t^{\text{paid}}_i - t^{\text{due}}_i \right)
$$

and the on-time rate counts invoices paid within two days of the due date:

$$
r_c = \frac{\left|\{\, i \in S_c : t^{\text{paid}}_i - t^{\text{due}}_i \le 2 \,\}\right|}{|S_c|}
$$

The risk score blends habit, the worst open invoice ($W_c$ days overdue) and reliability:

$$
\text{risk}_c = \min\!\Big(100,\; 1.2\,\bar{L}_c + 0.9\,W_c + 25\,(1 - r_c) + 10\cdot\mathbb{1}[\text{overdue}_c > 0]\Big)
$$

The **cash forecast** does not trust due dates. An open invoice is expected on

$$
\hat{t}_i = \max\!\left( t^{\text{due}}_i + \bar{L}_c,\; t_{\text{today}} + 3 \right)
$$

with confidence falling as risk rises. The **tone** of each reminder follows the worst overdue invoice: *final* beyond 45 days, *firm* beyond 20 days (or for high-risk clients), otherwise *friendly*. The agent explains its choice in plain words on every draft.

## Challenges

- **Making agents useful but harmless.** Getting the built-in AG Studio lead agent to hand collections work to my custom agent, while making sure no agent could ever reach a "send" path, took several iterations of the tool design.
- **A custom Claude adapter for AG Studio.** The Agent Framework expects its own model interface, so I wrote an adapter that maps its messages and tool calls onto Claude's tool use, including streaming.
- **PayPal's real-world edges.** Transaction Search only covers 31 days per call and must be enabled per app, and sandbox invoices need seeding with believable payment histories. I built a seed script and a full demo scenario, so the app works out of the box even without keys.
- **Running behind a reverse proxy.** Sign-in first redirected to `localhost` and then to `0.0.0.0:3000`, the container's own address. I fixed it by building every redirect from the public base URL.
- **Design.** I rebuilt the visual language several times, from a generic SaaS look to "paper and ink" invoice slips, rubber stamps and perforated receipts, so the product feels like the thing it manages.
- **The demo video.** It is recorded by a script: Playwright drives the real app through the walkthrough while a local neural voice reads each line, and ffmpeg stitches the shots. Keeping the voice and the screen in step, with no silent gaps, took more care than expected.

## What I learned

- **Human-in-the-loop is a product feature, not a disclaimer.** Freelancers trust Owed *because* it cannot act alone, and showing the agent's reasoning on every draft builds that trust.
- **Small, explainable models beat clever ones.** A transparent lateness average, which a user can check against their own memory, is more convincing than a black-box prediction.
- **Agent frameworks shine when agents specialise.** A narrow collections agent with three or four tools behaved far better than one big agent with everything.
- **The PayPal Agent Toolkit** made the read-only investigation agent almost trivial; the work was in choosing *which* tools to expose.

## What's next

- Scheduled reminders using PayPal's reminder settings, so approved cadences run themselves.
- Dispute awareness: pause chasing when a client opens a dispute.
- Multi-currency forecasting and a weekly digest email.

*The voice-over and parts of the video were generated with AI tools.*
