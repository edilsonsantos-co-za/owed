// The demo video, shot by shot. Each shot has the narration spoken over it and the browser actions
// that happen on screen. `fast` shots may be sped up to fit their narration (agents thinking);
// every other shot holds its last frame until the narration ends. Target length: under 2:50.
// The product tour is the app's own first-visit walkthrough: one shot per step, so a guide is on screen
// and a line is spoken the whole way through.
import type { Page } from 'playwright';

export interface Shot {
  id: string;
  narration: string;
  fast?: boolean;
  /** Needs a live Claude key (Ask Owed, agent drafts); skipped without one. */
  needsAi?: boolean;
  /** Runs before the shot's footage starts: page loads and waits that should not be on screen. */
  prep?: (page: Page, ctx: { baseUrl: string }) => Promise<void>;
  run: (page: Page, ctx: { baseUrl: string }) => Promise<void>;
}

const card = (title: string, subtitle: string, foot = '') => `<!doctype html><html><head><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;800&display=swap"></head><body style="margin:0;height:100vh;display:grid;place-items:center;background:radial-gradient(120% 70% at 0% 0%,rgba(61,220,151,.16),transparent 60%),radial-gradient(90% 60% at 100% 100%,rgba(90,63,224,.2),transparent 60%),#10201a;color:#f4f1ea;font-family:'Plus Jakarta Sans',Helvetica,Arial,sans-serif">
<div style="text-align:center;max-width:1300px;padding:0 60px">
<div style="font-size:120px;font-weight:800;letter-spacing:-5px">${title}</div>
<div style="font-size:40px;color:rgba(244,241,234,.78);margin-top:18px;line-height:1.35">${subtitle}</div>
<div style="font-size:26px;color:#3ddc97;margin-top:48px">${foot}</div></div></body></html>`;

export const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const pause = (ms: number) => sleep(ms);

/** Opens the dashboard chat panel and sends a prompt, then waits for the agents to go quiet. */
async function ask(page: Page, prompt: string, settleMs = 150_000) {
  const box = page.getByRole('textbox').last();
  await box.click();
  await box.pressSequentially(prompt, { delay: 18 });
  await page.keyboard.press('Enter');
  // The run is finished when the composer accepts input again and nothing is streaming.
  await sleep(4000);
  await page.waitForFunction(() => !document.querySelector('[aria-busy="true"]'), undefined, { timeout: settleMs }).catch(() => {});
  await sleep(1500);
}

/** Opens the Owed AI panel (AG Studio's chat) from the header. */
async function openChat(page: Page) {
  await page.getByRole('button', { name: 'Ask Owed' }).first().click();
  await pause(1200);
}

/** One step of the app's walkthrough: press its button, then hold while the line is spoken. */
const tourStep = (id: string, button: RegExp, narration: string): Shot => ({
  id,
  narration,
  run: async (page) => {
    await page.getByRole('dialog').getByRole('button', { name: button }).click();
  },
});

/** Closes the walkthrough before the agent shots. */
const closeTour = async (page: Page) => {
  if (await page.getByRole('dialog').isVisible().catch(() => false)) await page.keyboard.press('Escape');
};

export const SHOTS: Shot[] = [
  {
    id: 'title',
    narration:
      "You did the work. You sent the invoice through PayPal. And now it's three weeks late, and you're wondering how hard to push. That's what Owed is for.",
    run: async (page) => {
      await page.setContent(card('owed', 'An AI collections copilot for freelancers who bill with PayPal', 'Claude agents · AG Studio · PayPal Invoicing & Agent Toolkit'));
      await pause(1500);
    },
  },  {
    id: 'welcome',
    narration:
      "Owed is a collections copilot. It reads your PayPal invoices, works out who's late and who's about to be, and drafts the reminders for you. The first time you sign in, it shows you around.",
    prep: async (page, { baseUrl }) => {
      await page.goto(`${baseUrl}/app`);
      await page.getByText('Open invoices, most overdue first').waitFor({ timeout: 60_000 });
      await pause(1500);
    },
    run: async (page) => {
      await page.getByRole('button', { name: 'How Owed works' }).first().click();
    },
  },
  tourStep('nav', /Show me around/, "There are four pages, and they follow one workflow: see what you're owed, understand your clients, approve what the agents draft, and keep a record of it all."),
  tourStep('kpis', /Next/, "Up top, your money at a glance. What's outstanding, how much of it is overdue, and what should actually land in the next two weeks, based on how each client really pays."),
  tourStep('focus', /Next/, "Today's focus tells you who to chase first, and how firmly. Vantage Robotics is forty-eight days late, so that one gets a final notice."),
  tourStep('charts', /Next/, "Aging shows how late the money is. The cash forecast shows when it should arrive, shifted by each client's habits, not just the due date."),
  tourStep('clients', /Next/, "On Clients, everyone gets a payment profile from their real history. Northwind pays early. Vantage pays seven weeks late, every single time. That history sets the tone of every reminder."),
  tourStep('ask', /Next/, "Ask Owed opens a chat with a team of Claude agents, right beside the dashboard. Ask them to chase everyone more than thirty days late, and they'll check PayPal and write the drafts."),
  tourStep('approvals', /Next/, "But nothing goes out on its own. Every draft lands here in Approvals, with its tone and the reason behind it. You edit, you approve, and Owed sends a real PayPal reminder with a pay button."),
  tourStep('activity', /Next/, "Activity is the audit trail. Every draft, every approval, every PayPal call, and who did it: you, or an agent."),
  tourStep('customize', /Next/, "And the dashboard is yours to shape. Customize lets you move charts around, change them, or build new ones."),
  tourStep('connect', /Next/, "Owed runs on demo data out of the box. Connect your PayPal account and a Claude key, and it's working on your real invoices."),
  {
    id: 'chase',
    narration:
      'Now the fun part. Inside the dashboard sits a team of agents. AG Studio\'s built-in agents, plus Owed\'s collections agent, all running on Claude. I ask who owes me money. The lead hands it to the collections agent, which pulls the overdue invoices, checks each client\'s habits, and drafts a reminder for each one.',
    fast: true,
    needsAi: true,
    run: async (page) => {
      await closeTour(page);
      await openChat(page);
      const starter = page.getByText('Chase overdue invoices');
      if (await starter.isVisible().catch(() => false)) {
        await starter.click();
        await sleep(4000);
        await page.waitForFunction(() => !document.querySelector('[aria-busy="true"]'), undefined, { timeout: 150_000 }).catch(() => {});
      } else {
        await ask(page, 'Who owes me money right now? Draft reminders for everything overdue, in the right tone for each client.');
      }
      // New drafts raise a toast with a Review button.
      await page.getByText(/waiting for your approval/).waitFor({ timeout: 60_000 }).catch(() => {});
      await pause(2000);
    },
  },  {
    id: 'approve',
    narration:
      'Nothing is sent. Every draft lands in my approval queue with its tone and a one-line reason. Friendly for a good client who slipped. Final for Vantage, at forty-eight days. I tweak a line, approve, and Owed sends the reminder through PayPal\'s Invoicing API. The audit log shows the agent drafted it, and I sent it.',
    needsAi: true,
    run: async (page) => {
      const review = page.getByRole('button', { name: 'Review' });
      if (await review.isVisible().catch(() => false)) await review.click();
      else await page.getByRole('button', { name: /Approvals/ }).click();
      const cardEl = page.locator('[data-testid="draft-card"]').first();
      await cardEl.waitFor({ timeout: 30_000 });
      await pause(2500);
      const note = cardEl.getByLabel('Message');
      await note.click();
      await page.keyboard.press('End');
      await note.pressSequentially(' Thanks so much!', { delay: 45 });
      await pause(1200);
      await cardEl.getByRole('button', { name: /Approve & send/ }).click();
      await pause(3500);
    },
  },  {
    id: 'build',
    narration:
      'The same chat rebuilds the dashboard. Ask for a chart of overdue amounts by client, and Studio\'s own planning and widget agents add it, live.',
    fast: true,
    needsAi: true,
    run: async (page) => {
      await openChat(page);
      await ask(page, 'Add a bar chart of overdue amount by client to this page.');
      await pause(2000);
    },
  },  {
    id: 'how',
    narration:
      "Under the hood, there's a custom Claude adapter for AG Studio's agent framework, a collections agent the built-in agents can hand work to, and PayPal's Invoicing API and Agent Toolkit. Agents can only ever draft. Sending always takes a person.",
    run: async (page) => {
      await page.setContent(
        card(
          'how it works',
          'AG Studio Agent Framework + custom Claude adapter<br>Collections agent ⇄ built-in lead, data, page & widget agents<br>PayPal Invoicing v2 · Transaction Search · Agent Toolkit',
          'Approval is structural: agent tools can only queue drafts',
        ),
      );
      await pause(1500);
    },
  },  {
    id: 'close',
    narration:
      "Owed. Get paid on time, without the awkward emails. It's open source, and you can try it on demo data in about a minute.",
    run: async (page) => {
      await page.setContent(card('owed', 'Get paid on time, without the awkward emails.', 'github.com/edilsonsantos-co-za/owed'));
      await pause(1500);
    },
  },];
