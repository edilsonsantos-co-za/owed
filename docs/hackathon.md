# PayPal AI Hackathon: what matters for Owed

Distilled from the Devpost site, official rules, FAQ, resources page, all ten sponsor pages and the
PayPal / AG Studio docs they link to (crawled 26 Oct 2026). Raw page dumps live in `.context/raw/`
(gitignored, third-party content).

## Key dates

| What | When |
| --- | --- |
| Submissions close | **12 Nov 2026, 12:00 PST** (21:00 / 22:00 SAST) |
| Judging | 1–15 Dec 2026 |
| Winners announced | 21 Dec 2026 |

## Hard requirements (Stage One is pass/fail on these)

- Meaningfully use **at least one PayPal technology** (sandbox is fine) **and AI**.
- Working prototype: judges must be able to run it (setup instructions in the repo) **or** use a hosted demo URL.
  A mockup or non-functional demo fails. If hosted behind a login, give credentials in the testing notes.
- Text description of features, plus which AI tools/models were used and how.
- **Public repo** (GitHub/GitLab/Bitbucket) with all source, assets, instructions, and an **open-source licence
  detectable in the About section**.
- **Demo video under 3 minutes**, on **YouTube, public**, showing the project working on its target device.
  No third-party trademarks or copyrighted music without permission.
- English (or translated). Project new, or significantly updated during 1 Oct – 12 Nov 2026.
- Third-party APIs must be used within their terms (AG Studio trial licence, Claude API, PayPal sandbox).

## Judging (Stage Two, equally weighted)

1. **Technological implementation** – how thoroughly and skilfully PayPal + AI are used; non-trivial, working.
2. **Design** – a complete, coherent product, not just a proof of concept.
3. **Potential impact** – a credible, specific problem for a real audience, solved by what is shown.
4. **Innovation** – novel, different from existing concepts.
5. **Presentation** – video shows it working end to end; says what problem, for whom, why it matters.

Judges include PayPal DevRel (Jo Franchetti, Eddie Jaoude, Marco Podien), PayPal engineering/product, and one
judge per sponsor (AG Grid: Sylwia Vargas; APIMatic; Bryntum; Channel3; Elastic; Postman; Render).

## Prizes and stacking

- Grand: $12k / $8k / $5k. Honourable mentions $5k each: Most Creative, Most Impactful, Best Demo Delivery,
  Best Use of PayPal + AI, Best Use of Agentic Commerce.
- Sponsor: **AG Grid $5k / $2k / 3×$1k** (largest), APIMatic 3×$1k (+6 months Business), Bryntum 3×$1k,
  Channel3 $1.5k, Render credits ($1k/$750/$500).
- **A project can win at most one sponsor prize plus one grand prize or one honourable mention** (FAQ, rules §8).
  Using several sponsor tools makes you eligible for each, but you only collect one.

**Owed targets:** Best Use of AG Grid (primary sponsor prize) + Most Impactful / Best Use of PayPal + AI.

## What the AG Grid judges asked for

"Best Use of AG Grid" covers how the dashboard looks *and* how it is built: polish (custom widgets, theming,
layout), and the **Studio Agent Framework**: "a custom agent talking to Studio's built-in agents, or a swapped-in
harness". Their idea list literally includes a *nudge-bot that reads unpaid invoices and drafts friendly nudges,
with a widget showing who still owes what* and a *natural-language finance agent*. Owed does both, with a custom
Claude adapter and a custom `collections` agent the built-in lead delegates to.

Free 45-day AG Studio trial licence (removes watermark; needed for AI features in production). Boilerplate:
github.com/paypaldev/hackathon-paypal-ag-grid-boilerplate (no licence file, so Owed does not copy from it).

## PayPal pieces Owed uses

- **Invoicing v2 REST**: list/get invoices, create + send, **remind** (`POST /v2/invoicing/invoices/{id}/remind`),
  record payment (seed script), cancel.
- **Transaction Search** (`/v1/reporting/transactions`, max 31 days per call; needs the app's Transaction search
  feature enabled in the developer dashboard).
- **PayPal Agent Toolkit** (`@paypal/agent-toolkit`, Bedrock-shaped tools mapped onto Claude tool use) for the
  read-only morning-brief agent: `list_invoices`, `get_invoice`, `search_invoices`, `list_transactions`,
  `list_disputes`, `get_merchant_insights`.
- Other toolkit capabilities, if we extend: invoice reminders scheduling (`setupReminders`), QR codes, disputes,
  subscriptions. PayPal also runs a sandbox MCP server (SSE) and an AI-Toolkit Claude Code plugin
  (`/plugin install paypal@claude-plugins-official`) that helps while coding.

## Sponsor tools at a glance

| Sponsor | What | Free access | Fit for Owed |
| --- | --- | --- | --- |
| AG Grid | AG Studio embedded dashboards + Agent Framework | 45-day trial | **Core** |
| APIMatic | Context plugin giving coding agents PayPal API context | free, no creds | Optional dev aid |
| Astropods | Agent OS: deploy/monitor agents from a spec | free account | No |
| Bryntum | Gantt / Scheduler / Calendar components | 45-day trial | Possible: collections calendar |
| Channel3 | 100M-product search API / MCP | 20k credits, code `PAYPAL-HACKATHON-2026` | No |
| Elastic | Search/vector, Agent Builder | 14-day trial (+30) | No |
| KERNEL | Cloud browsers for agents | $50 credits | No |
| Postman | PayPal API collection | free | Testing aid |
| Render | Hosting + Workflows | $50 credits (claim link on sponsor page) | **Hosting** |
| Zapier | MCP to 9,000 apps incl. PayPal | 14-day Pro trial | No |

## Community / help

- PayPal Discord (all sponsor teams there): discord.gg/sJ2G6DyvSK
- Forum topics worth knowing: international sandbox sign-up issues, `NOT_ENABLED_TO_VAULT_PAYMENT_SOURCE`,
  "API key for judges" (give judges sandbox creds or a hosted demo).
- Webinar recordings: "Start building with PayPal" (bit.ly/paypalai26recue), APIMatic context plugins,
  AG Grid "Build a payments dashboard without building a dashboard" (Livestorm), Bryntum intro.

## Inspiration categories from the organisers

AI agents that actually transact; money movement; business tools for merchants/freelancers/creators; consumer
money tools; social impact. Their own examples include "a dashboard that shows freelancers every payment they've
received across clients" – Owed sits squarely in the *business solutions* bucket for freelancers.

## Full link index

All 424 URLs found across the site and sponsor pages: `.context/raw/all-links.txt`.
