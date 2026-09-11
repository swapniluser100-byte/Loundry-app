# Scaling Plan: 1 Shop → 50+ Shops in Pune

The single-shop architecture (one Worker, one D1 database, one R2 bucket)
comfortably handles one location. Growing to 50+ shops needs multi-tenancy,
a few schema changes, and some operational changes - but it does **not**
require leaving Cloudflare's stack, which is what keeps the per-shop cost low
even at that scale.

## 1. Multi-tenancy model

Add a `shops` table and a `shop_id` column to every tenant-scoped table:

```sql
CREATE TABLE shops (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,        -- e.g. "kothrud-branch"
  upi_id TEXT NOT NULL,
  from_email TEXT NOT NULL,         -- verified sender address for this shop's emails
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

ALTER TABLE customers ADD COLUMN shop_id INTEGER NOT NULL DEFAULT 1 REFERENCES shops(id);
ALTER TABLE orders    ADD COLUMN shop_id INTEGER NOT NULL DEFAULT 1 REFERENCES shops(id);
ALTER TABLE staff_users ADD COLUMN shop_id INTEGER NOT NULL DEFAULT 1 REFERENCES shops(id);
```

- The order-number counter (`order_counters`) becomes keyed by
  `(shop_id, year)` so each shop's `PN-LND-2026-000123` sequence is
  independent (or prefix by a shop code, e.g. `KTH-LND-2026-000123`).
- The JWT payload gains a `shop_id` claim at login; every route filters all
  queries by `WHERE shop_id = ?` from the token - never trust a client-sent
  `shop_id`.
- Staff at Shop A can never see Shop B's customers or orders, even though
  they share infrastructure.

## 2. Database strategy: one D1 database vs. many

Two options, and the right one depends on scale:

- **Shared D1 database with `shop_id` scoping (recommended up to ~50-100
  shops)**: simplest to operate - one migration pipeline, one place to run
  cross-shop reporting/analytics for the SaaS operator. D1's free/paid tier
  limits (5-500 GB storage, millions of reads/day) comfortably cover 50 small
  shops' combined order volume (roughly 15,000-25,000 orders/month total).
- **One D1 database per shop (or per region)**: better isolation and lets
  you shard write load across many small SQLite files if a handful of shops
  become unusually high-volume. Cloudflare Workers can bind many D1
  databases; route by `shop_id -> database binding` in a small lookup table
  kept in a Durable Object or KV. Move to this only if a shared database's
  write throughput becomes a real bottleneck (unlikely at 50 shops given
  laundry order volumes).

Start with the shared-database model; it is a straightforward migration to
split out a heavy shop later if ever needed.

## 3. Custom hostnames per shop (optional, for a branded feel)

Use **Cloudflare for SaaS** to give each shop a friendly hostname (e.g.
`kothrud.laundryos.in`) that all point at the same Pages project and Worker,
with the `shop_id` resolved from the hostname (or from a `?shop=` param /
subpath if you prefer not to manage per-shop domains). This is purely
cosmetic - functionally everything still runs through the same shared
Worker and database.

## 4. Decoupling email sending (reliability + rate limits)

At 50 shops × ~1,200 emails/month each, that's ~60,000 emails/month
system-wide. Sending email synchronously inside the request (as the
single-shop version does) is fine at low volume but risks slowing down
order creation under load or hitting Resend/Brevo rate limits in bursts.
Introduce **Cloudflare Queues**:

- `order/create` and `order/update-status` push a small message
  (`{shop_id, order_number, template_key}`) onto a Queue instead of calling
  Resend/Brevo inline.
- A separate Queue consumer Worker sends the actual email, with built-in
  retries or backoff if the provider briefly rate-limits, and can pick the
  right `from_email` / API key per `shop_id`.
- The customer-facing response (and QR code) is unaffected - it never waited
  on the email call anyway.
- At this volume, also consider Resend's or Brevo's paid tier (both scale
  well past 60,000/month for a modest flat fee - see `COST_BREAKDOWN.md`),
  and per-shop sending domains/subdomains (e.g.
  `kothrud.mail.laundryos.in`) to keep each shop's sending reputation
  isolated from the others.

## 5. Real-time status updates (nice-to-have)

For a shop with several staff on the floor, a **Durable Object per shop**
can broadcast order status changes to all open dashboard tabs via
WebSockets, so pickup counter staff see "Ready for Pickup" the instant
processing staff mark it, without polling. Optional - polling every 15-30s
from the dashboard is perfectly adequate up to 50 shops and is what the
current implementation does (simple `GET /order/list` refresh).

## 6. R2 storage at scale

50 shops × ~500 orders/month × ~5 KB QR SVG ≈ 125 MB/month of new QR images
- trivial against R2's free 10 GB and cheap paid tier ($0.015/GB-month
beyond that). Add an R2 **lifecycle rule** to expire QR objects for orders
handed over more than, say, 180 days ago, since they have no further use
once a customer has picked up - keeps storage flat over time instead of
growing forever.

## 7. Observability and reporting

- Enable **Workers Analytics Engine** (or Logpush to a cheap storage sink)
  to track request volume, error rates, and email delivery success per shop -
  useful both for your own ops and as a per-shop "orders this month"
  dashboard for shop owners.
- A lightweight `GET /admin/shops/:id/stats` endpoint (orders by status,
  revenue this month) run against the shared D1 database covers most owner
  reporting needs without a separate analytics pipeline.

## 8. Cost at 50 shops (rough order of magnitude)

| Item | Estimate |
|---|---|
| Workers + Pages | Cloudflare Workers Paid plan, **$5/month flat** (~₹420), covers far more than 50 shops' combined request volume |
| D1 | Included in Workers Paid plan up to generous limits; likely still ₹0 extra at this scale |
| R2 | A few GB total - a few tens of rupees/month at most |
| Email (the real driver, but a small one) | ~60,000 emails/month is beyond Resend's/Brevo's free tiers; their paid plans at this volume run roughly **$20-35/month (~₹1,700-3,000) total**, i.e. ~₹35-60/shop/month |
| Domains | Each shop needs a verified sending domain/subdomain - ~₹700-900/year per shop if fully independent, or ₹0 extra if using subdomains of one shared domain (`kothrud.laundryos.in`, etc.) |
| Queues (optional) | Free tier covers this volume comfortably |

The headline result: **per-shop cost barely changes as you scale from 1 to
50 shops, and is markedly lower than the SMS-based version was** at the same
scale - because the fixed Cloudflare platform costs are shared across all
tenants, and email's near-zero per-message cost means the one line item that
used to scale with order volume (SMS) now barely registers in the total.
