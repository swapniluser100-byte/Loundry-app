# Deployment Guide - Cloudflare Pages + Workers + D1 + R2

Follow this in order. Total first-time setup: roughly 45-60 minutes.

## 0. Prerequisites

- A Cloudflare account (free) - https://dash.cloudflare.com/sign-up
- Node.js 18+ and npm installed locally
- A free Resend account (https://resend.com) - recommended default - or a
  free Brevo account (https://brevo.com) as an alternative
- A domain name you control (even a cheap `.in`, ~₹700-900/year), needed to
  verify a "from" address with your email provider (see step 6 - a random
  Gmail/Yahoo address cannot be used to send transactional email)
- Your shop's UPI ID (VPA), e.g. `shopname@okhdfcbank`, `shopname@ybl`, etc.
  Get this from your bank's UPI app or ask your bank for a static VPA.

Install Wrangler (Cloudflare's CLI) once, globally or via npx:

```bash
npm install -g wrangler
wrangler login
```

## 1. Create the D1 database

```bash
cd backend
wrangler d1 create laundry_db
```

Copy the `database_id` from the output into `backend/wrangler.toml` under
`[[d1_databases]]`.

## 2. Create the R2 bucket

```bash
wrangler r2 bucket create laundry-qr-codes
```

The binding name (`QR_BUCKET`) is already set in `wrangler.toml` - no change
needed unless you rename the bucket.

**Optional but recommended**: enable a public URL for the bucket so QR images
load fast directly from R2 instead of through the Worker:

1. Cloudflare dashboard → R2 → `laundry-qr-codes` → Settings → Public access
   → enable the `r2.dev` subdomain (or attach your own custom domain).
2. Copy that URL into `wrangler.toml` as `R2_PUBLIC_URL`.

If you skip this, leave `R2_PUBLIC_URL = ""` - the Worker will serve QR
images itself at `/qr/:key`, which works fine for a single shop's volume.

## 3. Run the database migrations

```bash
cd backend
npm install
npm run db:migrate:local   # creates local SQLite for `wrangler dev` testing
npm run db:migrate:remote  # applies to the real, deployed D1 database
```

This creates all tables and seeds:
- a starter rate card (edit `migrations/0002_seed_rate_card.sql` and re-run,
  or update the `rate_card` table directly, to match your actual prices)
- one admin login: **username `admin`, password `Laundry@123`**

**Change the default admin password immediately**:

```bash
node scripts/hash-password.mjs "YourNewStrongPassword"
# copy the printed hash, then:
wrangler d1 execute laundry_db --remote --command \
  "UPDATE staff_users SET password_hash = '<paste hash here>' WHERE username = 'admin';"
```

To add more staff logins later, use the same `hash-password.mjs` script and
`INSERT INTO staff_users (username, password_hash, role) VALUES (...)`.

## 4. Configure `backend/wrangler.toml`

Edit the `[vars]` block:

| Variable | What to put |
|---|---|
| `SHOP_NAME` | Your shop's name, used in email text |
| `UPI_ID` | Your shop's UPI VPA (e.g. `shreelaundry@okhdfcbank`) |
| `UPI_PAYEE_NAME` | Name shown in the customer's UPI app |
| `EMAIL_PROVIDER` | `resend` (default), `brevo`, or `console` for testing |
| `FROM_EMAIL` | A verified sender address on your domain, e.g. `orders@yourlaundry.in` |
| `FROM_NAME` | Display name shown to customers, e.g. `Shree Laundry` |
| `PUBLIC_BASE_URL` | Your Pages frontend URL, e.g. `https://laundry.pages.dev` |
| `WORKER_BASE_URL` | Your Worker's own URL (shown after first `wrangler deploy`) |
| `R2_PUBLIC_URL` | From step 2, or leave blank |

You will deploy once to learn your Worker's `*.workers.dev` URL, then update
`WORKER_BASE_URL` and `PUBLIC_BASE_URL` and redeploy - this is normal for a
first setup.

## 5. Set secrets (never put these in wrangler.toml)

```bash
wrangler secret put JWT_SECRET
# paste a long random string, e.g. output of: openssl rand -base64 48

wrangler secret put RESEND_API_KEY
# paste your Resend API key (Dashboard -> API Keys -> Create API Key)

# Only if EMAIL_PROVIDER = "brevo":
wrangler secret put BREVO_API_KEY
```

## 6. Verify your sending domain (email deliverability)

Both Resend and Brevo require you to prove you own the domain you send
from, by adding a few DNS records (SPF, DKIM, and usually a tracking CNAME).
Without this, mail either fails to send or lands in spam.

**Resend:**
1. Dashboard → Domains → Add Domain → enter `yourlaundry.in`.
2. Resend shows 3-4 DNS records (TXT/CNAME) to add.
3. Since your domain is on Cloudflare, add them under Cloudflare dashboard →
   your domain → DNS → Records (copy each record's type, name, and value
   exactly as shown).
4. Back in Resend, click "Verify" - this usually completes within minutes.
5. Set `FROM_EMAIL` in `wrangler.toml` to an address on that domain, e.g.
   `orders@yourlaundry.in`.

**Brevo** (alternative): Dashboard → Senders & IP → Domains → Add a domain,
then add the shown DNS records the same way, and add/verify your `FROM_EMAIL`
sender address under Senders & IP → Senders.

**No domain yet / just testing?** Set `EMAIL_PROVIDER = "console"` in
`wrangler.toml` - the app works fully, and emails are simply logged
(`wrangler tail` to watch them) instead of sent, so you're not blocked from
testing the rest of the app while you sort out domain verification. Resend's
sandbox address (`onboarding@resend.dev`) is another option for quick testing,
but it can only deliver to the email address you signed up to Resend with -
not to real customers - so it's not a substitute for domain verification
before going live.

## 7. Deploy the backend Worker

```bash
cd backend
npm run deploy
```

Wrangler prints your Worker's URL, e.g.
`https://laundry-backend.yourname.workers.dev`. Put that into
`WORKER_BASE_URL` in `wrangler.toml`, then run `npm run deploy` once more so
the fallback QR-serving route (`/qr/:key`) knows its own URL.

## 8. Deploy the frontend to Cloudflare Pages

```bash
cd frontend
npm install
cp .env.example .env
# edit .env -> VITE_API_BASE_URL=https://laundry-backend.yourname.workers.dev
npm run build
```

Then either:

**Option A - dashboard (simplest for a first deploy):**
Cloudflare dashboard → Workers & Pages → Create → Pages → Upload assets →
select the `frontend/dist` folder.

**Option B - CLI:**
```bash
npx wrangler pages deploy dist --project-name=laundry-app
```

**Option C - Git integration (recommended for ongoing updates):** push this
repo to GitHub/GitLab, then in the Pages dashboard connect the repo with:
- Build command: `npm run build`
- Build output directory: `dist`
- Root directory: `frontend`

Copy the resulting Pages URL (e.g. `https://laundry-app.pages.dev`) into
`PUBLIC_BASE_URL` in `backend/wrangler.toml`, redeploy the Worker
(`npm run deploy` in `backend/`), and rebuild/redeploy the frontend if you
changed `.env`.

## 9. Smoke test

1. Open the Pages URL → log in with `admin` / your new password.
2. New Order → enter a mobile number → add a customer with an email address
   you can check → add 1-2 items → create the order. Confirm the email
   arrives (or check `wrangler tail` if `EMAIL_PROVIDER=console`).
3. Open the tracking link from the email (or `PUBLIC_BASE_URL/o/<order id>`)
   on your phone - confirm the QR and status show correctly.
4. Dashboard → advance the order to "Processing" then "Ready" - confirm an
   email for each.
5. Scan QR Kara → point the camera at the QR from step 3 (or use manual
   Order ID entry) → enter a final amount → Generate Payment QR → scan with
   any UPI app to confirm the amount and payee name are correct → mark
   Handed Over → confirm the final email.

## 10. Custom domain for the app itself (optional, ~₹700-900/year)

You already needed a domain in step 6 to verify a sending address for
email - this step is about additionally pointing that same domain at your
Pages site and Worker (optional; the free `*.pages.dev` and `*.workers.dev`
subdomains work fine on their own):

- Pages → your project → Custom domains → add e.g. `app.yourlaundry.in`
- Workers → your worker → Triggers → Custom domain → add e.g.
  `api.yourlaundry.in`
- Update `PUBLIC_BASE_URL` / `WORKER_BASE_URL` / `VITE_API_BASE_URL`
  accordingly and redeploy both.

Since a domain is now needed anyway for email verification, most shops will
find it worth also using it here for a cleaner-looking app URL - see
`docs/COST_BREAKDOWN.md` for how the ~₹700-900/year domain factors into the
monthly total.
