# Status and handoff

Last updated 11 Nov 2026. Submitted to Devpost: <https://devpost.com/software/owed-mi23or>
(deadline 12 Nov 2026, 12:00 PST; judging 1–15 Dec; see [hackathon.md](hackathon.md)).

## Where things stand

| Area | State |
| --- | --- |
| Hosted app | <https://owed.edilsonsantos.co.za>, deployed on every push to `main` |
| Keys in production | Anthropic, PayPal sandbox (seeded: 29 invoices, 7 clients), AG Studio trial (until 10 Dec 2026), YouTube ID. Set with `console repo:secrets owed --deploy` |
| Claude | Key valid; the Anthropic account needs credit before the agents and brief work |
| Sign-in | DataSparkLab SSO (Logto). Self sign-up needs an emailed code; mail is Mailgun sandbox (authorized recipients only), so judges use a test account |
| App | Landing, dashboard (Overview, Clients, Approvals, Activity), Ask Owed, Customize, `/admin` (`owed-admin` role) |
| Walkthrough | 11 steps on first visit (`owed.tour.v2`), opens each page and spotlights it; on the hosted demo the last step shows connection status |
| Video | <https://www.youtube.com/watch?v=ZhHI00SAyu8> (2:27, re-uploaded 11 Nov with the full-stack intro; recorded by `npm run video` on demo data; agent shots need a Claude key) |
| Submission assets | Moved out of the repo to `~/Desktop/Owed hackathon submission/` (Devpost text, gallery, brief, YouTube assets, rendered video) |

## After judging

- Rotate the Anthropic, PayPal and AG Studio keys (they were shared in chat), and delete the judge test account.
- Optionally re-record the video with the agent shots once Claude has credit.

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
- Clear `owed.tour.v2` / `owed.dashboard.v1` in the browser's localStorage to see the first-visit guide or the default layout again.
