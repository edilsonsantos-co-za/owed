Owed integrates the PayPal developer platform (sandbox) with Anthropic's Claude models. PayPal is both where the data comes from and how the work gets done: Claude reads PayPal invoices and payments to decide who to chase and how, and every approved reminder or invoice goes out through PayPal.

PAYPAL TOOLS (all in the PayPal sandbox)

1. PayPal REST API authentication (OAuth 2.0 client credentials, /v1/oauth2/token)
Gets the access token for every call below, from a sandbox REST app's client ID and secret.

2. PayPal Invoicing API v2 (/v2/invoicing/invoices)
The core of Owed.
- List and get invoices, with line items and payments: this is the receivables ledger behind the dashboard (outstanding, overdue, aging, cash forecast) and every client's payment profile.
- Remind (POST /invoices/{id}/remind): when you approve a reminder the agent drafted, Owed sends it through PayPal, so the client gets a real PayPal reminder with a pay button.
- Create and send (POST /invoices, POST /invoices/{id}/send): when you approve an invoice draft ("invoice Fernhill Yoga for this month's content pack"), Owed creates and sends a real PayPal invoice.
- Record payment and cancel: used by the seed script (npm run seed) to build a realistic sandbox history of seven clients with different payment habits.

3. PayPal Transaction Search API (/v1/reporting/transactions)
Pulls recent payments, in 31-day windows, so the dashboard's "collected in the last 30 days" and payment timing reflect what actually landed.

4. PayPal Agent Toolkit (@paypal/agent-toolkit)
Gives Claude PayPal tools for the morning brief. Owed enables read-only actions only: list, get and search invoices, list transactions, list disputes, and get merchant insights. Claude investigates the account with these tools and writes "Today's focus": who to chase first and how firmly.

AI TOOLS

1. Claude Opus 5.5 (Anthropic Messages API, model claude-opus-5-5)
The default model for every agent in Owed. Claude Sonnet 5.5 and Haiku 5.5 can be picked in the chat.
- Dashboard chat ("Ask Owed"): six agents run in the AG Studio chat, all on Claude. Owed's custom Claude adapter translates each AG Studio agent turn into a streaming Claude call with tool use and adaptive thinking, and streams Claude's reply back into the dashboard.
- Collections agent: Owed's own agent, which AG Studio's built-in lead agent can hand work to. Its tools are get_receivables, get_client_profile, draft_reminder and draft_invoice. It judges each client's tone (friendly, firm or final) from their PayPal payment history and writes the reminder, with a one-line reason.
- Morning brief: an agentic, read-only investigation of the PayPal account through the Agent Toolkit (above), returning a short structured brief.
- Safety: Claude's tools can only queue drafts in Owed's approval queue. The only code path that calls PayPal's send or remind endpoints is the Approve button, which needs a signed-in person.

2. AG Studio Agent Framework (AG Grid)
Hosts the dashboard and the in-browser team of agents (lead, data, page, widget agents and more). Owed plugs Claude in through the custom adapter and adds the collections agent, so the built-in agents can also rebuild the dashboard on request (for example, "add a chart of overdue amounts by client").

3. Kokoro TTS (open-weight neural text-to-speech, run locally)
Used only to make the demo video's voice-over, not inside the app.

HOW IT FITS TOGETHER

PayPal Invoicing + Transaction Search → Owed's receivables model → Claude agents (with the PayPal Agent Toolkit for the brief) draft reminders and invoices → you approve → PayPal Invoicing sends them → every step is logged in Activity.

Without keys, Owed runs on a built-in demo scenario so anyone can try it; with sandbox credentials and an Anthropic key, everything above runs live.
