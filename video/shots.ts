// The demo video, shot by shot. Each shot has the narration spoken over it and the browser actions
// that happen on screen. `fast` shots may be sped up to fit their narration (agents thinking);
// every other shot holds its last frame until the narration ends. Target length: under 2:50.
import type { Page } from 'playwright';

export interface Shot {
  id: string;
  narration: string;
  fast?: boolean;
  run: (page: Page, ctx: { baseUrl: string }) => Promise<void>;
}

const card = (title: string, subtitle: string, foot = '') => `<!doctype html><html><body style="margin:0;height:100vh;display:grid;place-items:center;background:#0b1f33;color:#fff;font-family:Inter,Helvetica,Arial,sans-serif">
<div style="text-align:center;max-width:1300px;padding:0 60px">
<div style="font-size:120px;font-weight:800;letter-spacing:-4px">${title}</div>
<div style="font-size:40px;color:#c8d6e5;margin-top:18px;line-height:1.35">${subtitle}</div>
<div style="font-size:26px;color:#8aa4c0;margin-top:48px">${foot}</div></div></body></html>`;

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

export const SHOTS: Shot[] = [
  {
    id: 'title',
    narration:
      'If you freelance, you know the feeling. The work is done, the invoice went out through PayPal, and now it is three weeks late. Do you nudge? How hard? This is Owed.',
    run: async (page) => {
      await page.setContent(card('owed', 'An AI collections copilot for freelancers who bill with PayPal', 'Claude agents · AG Studio · PayPal Invoicing & Agent Toolkit'));
      await pause(1500);
    },
  },
  {
    id: 'dashboard',
    narration:
      'Owed reads every invoice in your PayPal account and turns it into a live receivables dashboard: what is outstanding, what is overdue, how old it is, and when the cash will realistically land, based on how each client actually pays.',
    run: async (page, { baseUrl }) => {
      await page.goto(baseUrl);
      await page.getByText('Open invoices, most overdue first').waitFor({ timeout: 60_000 });
      await pause(2500);
      await page.mouse.move(700, 420, { steps: 25 });
      await pause(1500);
      await page.mouse.move(1200, 420, { steps: 25 });
    },
  },
  {
    id: 'clients',
    narration:
      'Every client gets a payment profile from their real history. Northwind pays early. Vantage Robotics pays seven weeks late, every time. That history decides how Owed chases them.',
    run: async (page) => {
      await page.getByRole('button', { name: 'Clients' }).click();
      await pause(2500);
      await page.mouse.move(900, 650, { steps: 30 });
    },
  },
  {
    id: 'brief',
    narration:
      'Each morning a Claude agent investigates the account with PayPal\'s own Agent Toolkit and writes a three-line brief: the one thing that matters today.',
    run: async (page) => {
      await page.getByRole('button', { name: 'Overview' }).click();
      await page.getByText('Checked with PayPal Agent Toolkit').waitFor({ timeout: 120_000 }).catch(() => {});
      await page.mouse.move(500, 95, { steps: 20 });
      await pause(1500);
    },
  },
  {
    id: 'chase',
    narration:
      'Now the fun part. Inside the dashboard sits a team of agents. AG Studio\'s built-in agents, plus Owed\'s collections agent, all running on Claude. I ask who owes me money. The lead hands it to the collections agent, which pulls the overdue invoices, checks each client\'s habits, and drafts a reminder for each one.',
    fast: true,
    run: async (page) => {
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
  },
  {
    id: 'approve',
    narration:
      'Nothing is sent. Every draft lands in my approval queue with its tone and a one-line reason. Friendly for a good client who slipped. Final for Vantage, at forty-eight days. I tweak a line, approve, and Owed sends the reminder through PayPal\'s Invoicing API. The audit log shows the agent drafted it, and I sent it.',
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
  },
  {
    id: 'build',
    narration:
      'The same chat rebuilds the dashboard. Ask for a chart of overdue amounts by client, and Studio\'s own planning and widget agents add it, live.',
    fast: true,
    run: async (page) => {
      await openChat(page);
      await ask(page, 'Add a bar chart of overdue amount by client to this page.');
      await pause(2000);
    },
  },
  {
    id: 'how',
    narration:
      'Under the hood: a custom Claude adapter for AG Studio\'s Agent Framework, a collections agent the built-in lead can delegate to, PayPal Invoicing for reading and reminding, and the PayPal Agent Toolkit for the brief. Agents can only draft. Sending takes a human.',
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
  },
  {
    id: 'close',
    narration:
      'Owed. Get paid on time, without the awkward emails. The code is open source on GitHub, and you can run it on demo data in a minute.',
    run: async (page) => {
      await page.setContent(card('owed', 'Get paid on time, without the awkward emails.', 'github.com/edilsonsantos-co-za/owed'));
      await pause(1500);
    },
  },
];
