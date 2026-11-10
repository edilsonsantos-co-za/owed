# Getting the keys

Paste each value into `.env.local` in the repo root (git-ignored), then tell Claude "keys are in".
The same values are copied to the server's `.env` for the live site. Nothing here is ever committed.

## 1. `ANTHROPIC_API_KEY` (required: AI chat, agents, morning brief)

1. Go to <https://console.anthropic.com> and sign in.
2. **Settings → Billing**: make sure there is credit (USD 5–10 is plenty for judging; the app caps usage per day).
3. **Settings → API keys → Create key**, name it `owed-hackathon`.
4. Copy the key (starts with `sk-ant-`) into `ANTHROPIC_API_KEY=`. It is only shown once.

## 2. `PAYPAL_CLIENT_ID` and `PAYPAL_CLIENT_SECRET` (required: live PayPal sandbox)

1. Go to <https://developer.paypal.com> and log in with your PayPal account.
2. Top right, make sure the toggle is on **Sandbox**.
3. **Apps & Credentials → Create App**: name `Owed`, type **Merchant**, and keep the default sandbox business account.
4. Open the app. Copy **Client ID** → `PAYPAL_CLIENT_ID=` and **Secret key 1** (click *Show*) → `PAYPAL_CLIENT_SECRET=`.
5. Scroll to **Features** and tick **Invoicing** and **Transaction search** (if listed), then **Save changes**.
6. Leave `PAYPAL_API_BASE=https://api-m.sandbox.paypal.com`.

Claude then runs `npm run seed` to fill the sandbox with realistic clients and invoices.

## 3. `AG_STUDIO_LICENSE_KEY` (optional, removes the chart watermark)

1. Go to <https://www.ag-grid.com/license-pricing/> → **Start free trial** (AG Studio / Enterprise trial, 45 days).
   If the hackathon resources page has its own AG Studio trial link, use that one.
2. The key arrives by email. Paste the whole key into `AG_STUDIO_LICENSE_KEY=`.

## 4. YouTube video id (after the video is uploaded)

From `https://www.youtube.com/watch?v=AbCdEf12345`, the id is `AbCdEf12345` → `OWED_YOUTUBE_ID=`.

## Not needed from you

`LOGTO_*`, `SESSION_SECRET` and `OWED_BASE_URL` are set by Claude on the server.
