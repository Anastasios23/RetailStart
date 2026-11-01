# Client delivery next steps (post–ponytail audit)

**Business model (locked for this roadmap):** copy-the-folder per business — one Medusa + Next.js + PostgreSQL stack per client folder/deploy. For a new business, clone the codebase and change only brand/presentation (+ client data, Stripe/email secrets, shipping/tax). Functional commerce features stay as-is. Matches `CONTEXT.md`, ADR-0004, ADR-0013, and ADR-0017. Multi-tenant Shopify-like SaaS is **out of scope**.

Source audit: [ponytail-audit-v1.md](ponytail-audit-v1.md).

## Priority order

Do these in order. Do not start client branding work until P0 is done.

### P0 — Must fix before first paying client

| # | Item | Outcome | Primary locations |
| --- | --- | --- | --- |
| 1 | Real transactional email | Order confirmation, admin new-order, and payment-failed messages leave the test sink | `apps/backend/medusa-config.ts`, notification module / provider adapter |
| 2 | Refund / fulfill / restock path decision | Either durable idempotency + safe wiring, or explicit “Medusa Admin only” docs and no automation calling custom workflows | `apps/backend/src/workflows/refunds/`, `fulfillment/`, `returns/` — Kayia soft launch: Admin-only in `docs/clients/katerina-kayia-admin-soft-launch-runbook.md` |
| 3 | Reconciliation stance | Durable records hooked to payment mismatch / complete failures **or** a written runbook that Stripe Dashboard + Medusa Admin are the only authority | `apps/backend/src/modules/recovery/` — Kayia soft launch: Stripe+Admin runbook section in `docs/clients/katerina-kayia-admin-soft-launch-runbook.md` |
| 4 | Stale PaymentIntent / cart-total drift | Refresh or invalidate sessions when cart totals change; reduce charge-without-order cases; surface mismatches to the chosen reconcile path | `apps/storefront/src/lib/medusa/checkout-payment.ts`, Stripe form, payment-session workflow |

### P1 — Should fix for repeatable launches

| # | Item | Outcome |
| --- | --- | --- |
| 5 | Webhook reliability + `pending_authorization` UX | Production Stripe→Medusa webhooks verified; shopper not stuck on “refresh only” without a poll/finalize path |
| 6 | Minimal per-client deploy recipe | Repeatable host recipe (containers or PaaS) for backend + storefront + Postgres + secrets; bind to `0.0.0.0:$PORT` where required |
| 7 | Phase-module honesty | Wire gates operators will run, or mark deployment/lifecycle/recovery/bulk/media libraries as non-runtime until needed |
| 8 | Money-path tests | At least one Stripe webhook integration check and one happy-path `cart.complete` HTTP coverage |
| 9 | Guest cart hygiene | Rate limits / log redaction for cart IDs; keep HttpOnly cookie model |

### P2 — Nice to have

- Stronger pre-add inventory checks if low-SKU clients oversell in practice.
- Trim unused jobs / unused custom ops APIs after the Admin-only vs custom decision in P0 #2.
- Browser E2E later if manual checkout QA is insufficient.

## First-client launch checklist (after P0)

1. Provision isolated Postgres + object storage + env secrets (JWT, cookie, Stripe live keys, webhook secret, email provider).
2. Deploy backend and storefront; confirm liveness/readiness and Stripe webhook delivery.
3. Configure Medusa: sales channel, regions, shipping zones/fees, tax, admin user.
4. Load catalog (products, variants, inventory) and presentation/branding bundle.
5. Run a live-mode smoke purchase; confirm order in Admin, charge in Stripe, and emails to customer + admin.
6. Practice one refund and one fulfillment in Admin (or the chosen wired path).
7. Record the payment-mismatch runbook contact and steps for support.

## Explicitly not in this roadmap

- Multi-tenant tenant registry, provisioning, platform billing, or super-admin.
- Customer accounts, marketing automation, analytics dashboards, marketplace/B2B.
- Silent change to the isolated-deploy architecture.

## Suggested next implementation slice

Start with **P0 #1 (email provider)** alone: smallest change that unblocks real client ops, keeps ADR-0006 (backend-owned notifications), and does not widen deployment architecture.
