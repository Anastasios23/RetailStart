# Katerina Kayia — Soft-launch hardening design

**Status:** Validated (brainstorm + grill), 2026-11-01  
**Client:** Φαρμακείο Κατερίνα Καγιά (Latsia)  
**Approach:** A — Soft-launch hardening slice  
**Related:** `.planning/codebase/CONCERNS.md`, `docs/client-delivery-next-steps.md`, `docs/clients/katerina-kayia-shipping-design.md`, CONTEXT.md V1 boundaries

---

## Understanding summary

- Improve the Kayia storefront so **soft → public** launch is easy to buy and manageable in Admin.
- Priority order: **(2) checkout / shipping / payment**, **(3) ops readiness**, then **(1) visual polish**.
- Shoppers: guest checkout. Ops: Katerina + 1–2 colleagues, **same Admin login** (no V1 RBAC).
- Soft launch: new orders discovered via **Medusa Admin only** (no mandatory email yet).
- Public gate later: transactional email, verified Stripe webhooks, written runbook practice.
- Current pains: **shipping method confusion** and **Stripe reliability** (errors / refresh / stuck states).
- Volume: design for **low**, with headroom for medium — no new architecture.

## Assumptions

- V1 stays guest checkout + fixed Medusa shipping + Stripe (no courier/Wolt APIs).
- Soft launch can run without real email; public launch cannot.
- Local TK list and 13:00 cutoff remain client TBD until provided.
- Visual redesign of home/catalog is **after** purchase/ops hardening.
- Shared Admin login is enough for soft launch.

## Open questions (deferred)

- Email provider for public gate (e.g. Resend) — TBD.
- Production hosting/domain topology — TBD if not already locked.
- Which Stripe failure modes were seen live vs proactive hardening — tighten during implementation QA.

---

## Decision log

| # | Decision | Alternatives | Why |
| --- | --- | --- | --- |
| 1 | Priority: purchase ease + ops, then visual | Visual-first | Soft→public needs working buy + Admin |
| 2 | Soft then public gates | Public-only / polish-before-open | Faster safe start |
| 3 | Shared Admin login (no RBAC) | Separate roles | V1 boundary |
| 4 | Soft: Admin-only new-order signal | Email/SMS now | Avoid email as soft-launch blocker |
| 5 | Focus shipping UX + Stripe reliability | Form-length-only simplification | Stated pain |
| 6 | Approach **A** — soft-launch hardening | B checkout rewrite / C platform-first | Lowest regression risk; fastest soft launch |
| 7 | Medusa remains commerce authority; Next is UX | Move pricing/rules into storefront | Matches architecture ADRs |
| 8 | Honest local-delivery copy while TK list empty | Fake strict TK filter | Avoid false security; client list TBD |
| 9 | Real email + webhook verify deferred to public gate | Bundle email in this slice | Soft = Admin-only by design |
| 10 | Checkout component split (Approach B) deferred | Rewrite before soft launch | Stabilize money path first |

---

## Final design

### Architecture

No change to the two-app model: **Medusa = commerce authority** (options, prices, cart, payment sessions, orders); **Next storefront = UX + presentation**.

Three work boundaries in this slice:

1. **Shipping presentation** — storefront (`kayia-shipping.ts` + checkout UI). Medusa keeps the four options and free ≥ €40. Goal: clearer choice + correct metadata, not a new rate engine.
2. **Payment continuity** — existing Stripe Payment Element + payment-session workflows. Goal: fewer stuck states and clear next actions; invalidate/re-init stale sessions when totals drift (aligns with delivery P0 #4).
3. **Ops surface** — Medusa Admin + a short written Kayia runbook. Email provider is **out of this slice** (public gate).

**Explicit non-goals:** home/catalog visual redesign, RBAC, courier APIs, WhatsApp, full checkout rewrite (Approach B), durable reconciliation DB (unless required by a chosen P0 #3 runbook stance documented as Admin+Stripe only).

### Components

**Shipping UX**

- Clearer option rows: title · one-line “who it’s for” · ETA · price / «Δωρεάν».
- ACS: required text before save; show on summary; short helper + ACS network link.
- Local: honest copy while `KAYIA_LOCAL_POSTAL_CODES` is empty (greater Nicosia; phone confirm if needed) — do not invent a false zone filter.
- Pickup: pharmacy address visible before pay; avoid confusing with home address.

**Stripe reliability**

- On cart total / shipping change: mark session stale and re-init; do not leave an old client secret payable from the UI.
- `pending_authorization`: light client poll or explicit “check status” control (full webhook verification at public gate).
- Keep amount-match gate before `cart.complete`; on captured-without-order path, clear shopper message + runbook step (Stripe Dashboard + Admin).

**Ops**

- Markdown runbook: new order in Admin → per method (pickup ready / local-door-ACS fulfill) → refund + restock.
- Document Admin-only stance for custom refund/fulfill workflows if they remain unwired (delivery P0 #2).

### Data flow & errors

**Happy path spine (unchanged):** cart cookie → contact → shipping (+ ACS metadata) → payment session → Stripe Element → amount-match → `cart.complete` → confirmation.

| State | Shopper | Ops |
| --- | --- | --- |
| Stale session / total drift | Message + automatic re-init | If charged without order → Stripe + Admin runbook |
| `pending_authorization` | Poll / check-status, not endless refresh-only | Webhook health at public gate |
| Failed / cancelled | Clear Greek error; retry | Admin sees unpaid |
| Captured, complete blocked | Do not re-charge; contact message | Manual reconcile |

**In-scope edges:** two tabs; shipping change after payment init; cart ≥ €40 free labels; pickup address rewrite to pharmacy.

### Testing & acceptance

**Automated:** extend existing `kayia-shipping` and checkout-payment / phase6–7 tests for stale re-init and ACS empty block where gaps remain.

**Manual soft-launch checklist:**

1. Pickup order → visible in Admin → ready / picked up.
2. ACS order with point text → metadata on order.
3. Local or door order → fulfill in Admin.
4. Test-card success → confirmation page.
5. Drift: change shipping/qty after Stripe appears → new session.
6. Optional: two tabs — only one valid secret.

**Public gate (later):** webhook delivery verified; real email; live smoke; refund practice.

### Peer patterns to borrow (not copy)

Clear 3–4 methods with one-line timing; ACS as free-text point; visible free threshold; post-pay “what happens next”. No live maps or Wolt-style slots on the owned site.

### Suggested implementation order

1. Shipping UX clarity + local honest copy + summary ACS/pickup.
2. Stale payment session invalidate / re-init (P0 #4).
3. Pending-authorization poll or check-status UX.
4. Kayia Admin soft-launch runbook + P0 #2/#3 Admin+Stripe stance docs.
5. Manual checklist pass; then backlog Approach B (split checkout) and public gate (email, webhooks, deploy recipe).

---

## Exit criteria (brainstorm)

- [x] Understanding Lock confirmed
- [x] Approach A explicitly accepted
- [x] Major assumptions documented
- [x] Key risks acknowledged (stale PI, pending auth, empty TK list)
- [x] Decision log complete
