# Cost Breakdown (Single Shop, Pune)

Assumption: a busy small shop processing **300-500 orders/month**, each
order triggering up to 3 emails (received, ready, handed over) - "in
progress" is optional and shown here as sometimes skipped, since many shops
process same-day. That's roughly **900-1,500 emails/month**.

| Item | Free tier limit | This shop's usage | Monthly cost |
|---|---|---|---|
| Cloudflare Workers (backend API) | 100,000 requests/day free | ~50-100 requests/day | ₹0 |
| Cloudflare Pages (frontend hosting) | Unlimited requests/bandwidth, 500 builds/mo | A handful of page loads/day | ₹0 |
| Cloudflare D1 (database) | 5 GB storage, 5M reads/day, 100k writes/day | A few MB of data, <1,000 reads+writes/day | ₹0 |
| Cloudflare R2 (QR image storage) | 10 GB storage, 1M writes/mo, 10M reads/mo, **zero egress fees** | ~500 new QR SVGs/mo (~5 KB each = ~2.5 MB/mo) | ₹0 |
| Email - Resend (transactional API) | 3,000 emails/month free (100/day) | 900-1,500 emails/mo | ₹0 (within free tier) |
| Email - Brevo (alternative) | 300 emails/day free, no monthly cap | 900-1,500 emails/mo | ₹0 (within free tier) |
| Domain name (**now required** - see below) | N/A | `.in` domain ~₹700-900/year | ~₹60-75/mo |
| **Total** | | | **≈ ₹60-75/month** |

This comes in well under the originally targeted ₹150-350/month range,
because switching from SMS to email removed the one line item that used to
scale with volume - both Resend's and Brevo's free tiers comfortably cover
even a busy single shop's monthly email count at zero cost. The domain is
the only real recurring cost, and it is no longer optional the way it was
in the SMS version: Resend and Brevo both require a verified sending
domain (SPF/DKIM records) before they will deliver mail to real customers
reliably - see `docs/DEPLOYMENT.md` step 6. A shop that already owns a
domain for other reasons effectively runs this app for **₹0/month**.

## Why it stays this cheap

- **Everything except the domain is free at this scale.** Cloudflare's free
  tiers for Workers, Pages, D1, and R2 are sized for hobby/small-business
  traffic; one shop's order volume uses a tiny fraction of any of them.
- **R2 has no egress fees**, unlike S3-style storage - showing QR images to
  customers (in-browser and inline in emails) all day costs nothing extra.
- **No payment gateway fees** - UPI via a static QR/deep-link is free; there
  is no per-transaction MDR because the shop is not using a PSP/aggregator,
  just its own bank UPI ID.
- **Email has no per-message cost at this volume**, unlike SMS. Resend's
  3,000/month free tier and Brevo's 300/day free tier both exceed what a
  single shop needs, so there is no variable cost that grows with order
  count the way SMS pricing did.

## If volume grows well beyond one shop

Once monthly email volume consistently exceeds Resend's free 3,000/month (or
Brevo's ~9,000/month equivalent), their paid tiers start around $20/month
(~₹1,700) for tens of thousands of emails - still far cheaper than SMS at
the same volume would have been. Once a shop consistently exceeds the
D1/Workers free-tier request limits (unlikely for one location), Cloudflare's
paid Workers plan is **$5/month (~₹420)** flat, which raises D1 and Workers
limits by 10-20x. See `SCALING_PLAN.md` for the multi-shop numbers.
