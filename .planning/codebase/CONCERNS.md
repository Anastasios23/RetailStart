# Codebase Concerns

**Analysis Date:** 2026-11-01

## Tech Debt

**Transactional email still a test sink:**
- Issue: Production notification provider is `notification-test-sink`; order confirmation, admin new-order, payment-failed, and “ready for pickup” emails never leave the process.
- Files: `apps/backend/medusa-config.ts`, `apps/backend/src/modules/notification-test-sink/`, Kayia shipping design note in `docs/clients/katerina-kayia-shipping-design.md`
- Impact: First paying client ops fail silently — shoppers and pharmacy staff get no email after successful checkout or fulfillment readiness.
- Fix approach: Wire a real provider adapter behind the existing notification module / idempotency helpers (`docs/client-delivery-next-steps.md` P0 #1). Keep ADR-0006 backend ownership.

**Refund / fulfill / restock workflows not HTTP-wired; idempotency not loaded:**
- Issue: Custom workflows accept `existingRefund` for short-circuit, but the Medusa step never loads prior records; no store/admin API routes invoke these workflows. Ops today rely on Medusa Admin.
- Files: `apps/backend/src/workflows/refunds/process-order-refund.ts`, `apps/backend/src/workflows/fulfillment/manage-order-fulfillment.ts`, `apps/backend/src/workflows/returns/receive-and-restock.ts`
- Impact: Safe only while unused; automation that calls them later can double-refund or double-adjust stock.
- Fix approach: Persist and load idempotency keys before provider/inventory calls, **or** delete unused custom paths and document Admin-only (`docs/client-delivery-next-steps.md` P0 #2).

**Reconciliation and lifecycle state are process-local Maps:**
- Issue: `ReconciliationService` and `LifecycleActivationService` store records in memory; not hooked into checkout/payment mismatch paths or `medusa-config` modules list.
- Files: `apps/backend/src/modules/recovery/service.ts`, `apps/backend/src/modules/lifecycle/service.ts`, `apps/backend/medusa-config.ts`
- Impact: Paid-without-order and ambiguous payment cases vanish on restart; privacy CAS activation history is not durable at runtime.
- Fix approach: Persist reconciliation records and emit from payment mismatch / complete failures, **or** write an explicit Stripe Dashboard + Medusa Admin runbook and stop claiming runtime recovery (`docs/ponytail-audit-v1.md`).

**Phase libraries tested but not registered at startup:**
- Issue: Deployment gates, presentation schema/projection, bulk-import, media, verification readiness, recovery, and lifecycle modules exist under `apps/backend/src/modules/` and pass unit tests, but only locking, Stripe payment, and notification-test-sink appear in `medusa-config.ts`.
- Files: `apps/backend/medusa-config.ts`, `apps/backend/src/modules/{deployment,presentation,bulk-import,media,verification,recovery,lifecycle}/`
- Impact: Docs/release gates imply production-ready operators can run these paths; operators cannot from the running app. Inflates “production ready” vs wiring reality.
- Fix approach: Wire gates that operators will run, or mark libraries as non-runtime until needed (`docs/client-delivery-next-steps.md` P1 #7).

**Kayia shipping UX coupled into core checkout:**
- Issue: Checkout form and server actions import Kayia-specific helpers (pickup address rewrite, ACS metadata, ETA copy, free-label Greek strings) directly — not behind a generic shipping-presentation interface.
- Files: `apps/storefront/src/app/components/checkout-form.tsx`, `apps/storefront/src/app/actions/checkout-actions.ts`, `apps/storefront/src/lib/presentation/kayia-shipping.ts`
- Impact: Next client clone must edit commerce checkout paths or ship pharmacy-specific UX; contradicts “swap presentation only” copy-folder model in `CONTEXT.md` / `docs/client-delivery-next-steps.md`.
- Fix approach: Extract a client shipping presentation adapter (labels, address rules, metadata fields) selected from `client-bundle.ts`; keep Medusa options as authority.

**Dual presentation systems:**
- Issue: Storefront uses hardcoded `CLIENT_PRESENTATION` / `CLIENT_STORE` in `client-bundle.ts`. Backend has a separate validated presentation schema + safe projection under `apps/backend/src/modules/presentation/` with no runtime API exposing it to Next.js.
- Files: `apps/storefront/src/lib/presentation/client-bundle.ts`, `apps/storefront/src/lib/presentation/config.ts`, `apps/backend/src/modules/presentation/schema.ts`, `apps/backend/src/modules/presentation/projection.ts`
- Impact: Brand/SEO/nav changes require code edits and redeploy; backend validation ADRs are unused at runtime; risk of drift between “approved” bundle rules and live storefront.
- Fix approach: Either load storefront presentation from a versioned bundle validated by backend projection, or document storefront-only config as the intentional copy-folder path and demote backend presentation to library status.

**Demo / Wolt catalog leftovers (~1.1MB):**
- Issue: `wolt-catalog.json` plus `demo-catalog.ts`, `catalog-product-grid.tsx`, `product-card.tsx`, and `category-row.tsx` remain after Medusa-backed grids (`ProductGrid`, `MedusaCategoryRow`) took over browse pages. `catalog-ensure` still models Wolt-style IDs.
- Files: `apps/storefront/src/lib/presentation/wolt-catalog.json`, `apps/storefront/src/lib/presentation/demo-catalog.ts`, `apps/storefront/src/components/catalog-product-grid.tsx`, `apps/storefront/src/components/product-card.tsx`, `apps/storefront/src/components/category-row.tsx`, `apps/storefront/src/lib/medusa/catalog-ensure.ts`, `apps/backend/src/api/store/catalog/ensure/route.ts`
- Impact: Repo weight, confusion for operators about which catalog is live, and a privileged ensure endpoint tied to demo onboarding.
- Fix approach: Remove unused demo UI; retire or gate `POST /store/catalog/ensure` once real catalog import is the only path.

**No app deploy artifacts:**
- Issue: `infra/docker-compose.yml` covers Postgres/MinIO only; no Dockerfile or PaaS blueprint for backend + storefront. Zero Dockerfiles in repo.
- Files: `infra/`, absence of `Dockerfile*`
- Impact: Each client launch stays bespoke; easy to miss `0.0.0.0:$PORT` and secret wiring on PaaS hosts.
- Fix approach: Minimal per-client deploy recipe (`docs/client-delivery-next-steps.md` P1 #6).

**Monolithic checkout UI:**
- Issue: `checkout-form.tsx` (~714 lines) owns contact, shipping method radios, ACS field, summary, payment gates, and pending states in one client component.
- Files: `apps/storefront/src/app/components/checkout-form.tsx`
- Impact: Hard to change shipping UX without regressing payment; Kayia-specific branches increase merge risk.
- Fix approach: Split into contact / shipping-method / payment-status sections with shared progress helpers from `checkout-presentation.ts`.

## Known Bugs

**Stale PaymentIntent can capture without order:**
- Symptoms: Shopper pays an old client secret (other tab / after cart total change); storefront blocks `cart.complete` when session amounts mismatch → money captured, no order until manual reconcile.
- Files: `apps/storefront/src/lib/medusa/checkout-payment.ts`, `apps/storefront/src/app/components/stripe-payment-form.tsx`, `apps/backend/src/workflows/ensure-cart-payment-session.ts`
- Trigger: Concurrent tabs or cart edits after payment session creation while an old Stripe Element secret remains payable.
- Workaround: Support reconciles in Stripe Dashboard + Medusa Admin; storefront detects stale sessions on re-init (`kind: "initialize", reason: "stale"`) but does not invalidate already-issued secrets.

**`pending_authorization` leaves shoppers on refresh-only UI:**
- Symptoms: Greek alert “Η πληρωμή περιμένει έγκριση. Ανανέωσε το checkout…” with no poll/finalize until session becomes `authorized` / `captured`.
- Files: `apps/storefront/src/app/components/checkout-form.tsx`, `apps/storefront/src/lib/medusa/checkout-payment.ts`, `apps/backend/src/workflows/ensure-cart-payment-session-state.ts`
- Trigger: Slow or missed Stripe→Medusa webhooks in production.
- Workaround: Manual page refresh; ensure webhooks configured before launch (`docs/client-delivery-next-steps.md` P1 #5).

**Local delivery postal-zone filter is effectively off:**
- Symptoms: `isPostalCodeInLocalZone` returns `true` for any non-empty TK while `KAYIA_LOCAL_POSTAL_CODES` is empty.
- Files: `apps/storefront/src/lib/presentation/kayia-shipping.ts`, `apps/storefront/src/app/actions/checkout-actions.ts`
- Trigger: Selecting “Τοπική παράδοση (Λευκωσία)” with any Cyprus postal code.
- Workaround: None in UI — pharmacy may accept island-wide “local” orders until the client supplies the greater-Nicosia list (`docs/clients/katerina-kayia-shipping-design.md` open items).

**Home “Νέα” and “Δημοφιλή” show the same products:**
- Symptoms: Both sections use `productPage.products.slice(0, 8)` with no featured/popular ranking.
- Files: `apps/storefront/src/app/page.tsx`
- Trigger: Any catalog with ≥1 product.
- Workaround: Operators cannot curate homepage merchandising without code change.

## Security Considerations

**Guest cart IDOR (Medusa guest model):**
- Risk: Anyone holding a `cart_id` can mutate that cart within sales-channel scope via Store API + publishable key.
- Files: Guest cookie continuity in storefront cart/checkout actions; Medusa store cart endpoints
- Current mitigation: HttpOnly cart cookie; high-entropy IDs; no second commerce authority in browser (`CONTEXT.md`).
- Recommendations: Rate-limit cart mutations; redacted logging of cart IDs; never put cart IDs in client-visible URLs or analytics (`docs/ponytail-audit-v1.md` #9).

**Catalog ensure endpoint with hardcoded tenant resources:**
- Risk: Authenticated-by-shared-secret `POST /store/catalog/ensure` can create products into fixed `SALES_CHANNEL_ID` / `SHIPPING_PROFILE_ID` literals; secret compromise or env reuse across clients creates wrong-tenant catalog pollution.
- Files: `apps/backend/src/api/store/catalog/ensure/route.ts`, `apps/storefront/src/lib/medusa/catalog-ensure.ts`
- Current mitigation: `x-catalog-ensure-secret` required; ID/price payload validation.
- Recommendations: Resolve channel/profile from env per deployment; disable route in production once bulk import or Admin is the only onboarding path; rotate `CATALOG_ENSURE_SECRET` per client.

**Completed-order facts by cart id:**
- Risk: Public completed-order lookup keyed by completed cart id can leak limited order facts if IDs leak.
- Files: `apps/backend/src/api/store/carts/[id]/completed-order/route.ts`
- Current mitigation: Acceptable if cart IDs stay high-entropy and HttpOnly (`docs/ponytail-audit-v1.md` #11).
- Recommendations: Keep confirmation clear-cookie flow; avoid logging cart IDs; do not broaden response fields.

**Presentation secret scanning only in unused backend path:**
- Risk: Live storefront `client-bundle.ts` can embed emails/phones (intentional contact facts) without the backend presentation secret-leak scanner that ADR-0115 describes.
- Files: `apps/storefront/src/lib/presentation/client-bundle.ts`, `apps/backend/src/modules/presentation/schema.ts`
- Current mitigation: Manual review; no credentials in committed presentation (public pharmacy contacts only).
- Recommendations: Keep secrets out of presentation; if backend projection is adopted, run the same scanner on the active bundle.

## Performance Bottlenecks

**Large Wolt catalog JSON in presentation tree:**
- Problem: ~1.1MB `wolt-catalog.json` sits under storefront presentation.
- Files: `apps/storefront/src/lib/presentation/wolt-catalog.json`, `apps/storefront/src/lib/presentation/demo-catalog.ts`
- Cause: Demo scrape retained after Medusa became browse authority.
- Improvement path: Delete or move to scripts-only; ensure no production import path remains.

**Checkout page force-dynamic + multi-round trips:**
- Problem: Checkout loads cart, shipping options, and payment session on each refresh; payment pending UX encourages full page reloads.
- Files: `apps/storefront/src/lib/medusa/checkout.ts`, `apps/storefront/src/app/checkout/page.tsx`, `apps/storefront/src/app/components/checkout-form.tsx`
- Cause: Authoritative Medusa reads + refresh-as-sync for payment status.
- Improvement path: Short-poll payment session status client-side instead of full navigation; keep totals authoritative on server.

**Basic keyword search only:**
- Problem: Search is keyword/aliases over product fields — no facets, typo tolerance, or autocomplete (`CONTEXT.md` search boundary).
- Files: `apps/storefront/src/app/search/page.tsx`, storefront Medusa search helpers
- Cause: V1 scope.
- Improvement path: Accept for SMB; add faceting only if pharmacy catalog size makes keyword search fail shoppers.

## Fragile Areas

**Checkout money path (payment session + Stripe Element + finalize):**
- Files: `apps/storefront/src/lib/medusa/checkout-payment.ts`, `apps/storefront/src/app/components/stripe-payment-form.tsx`, `apps/storefront/src/app/components/checkout-finalize-order.tsx`, `apps/backend/src/api/store/carts/[id]/payment-session/route.ts`, `apps/backend/src/workflows/ensure-cart-payment-session.ts`
- Why fragile: Multi-status state machine (`pending`, `pending_authorization`, `authorized`, `captured`, stale re-init); webhook timing; amount-match gates; concurrent tabs.
- Safe modification: Change one status transition at a time; run `checkout-phase7.test.mjs` and payment-session unit tests; never skip amount match before `cart.complete`.
- Test coverage: Strong unit coverage for locking/state; missing Stripe webhook integration and full `cart.complete` HTTP happy path (`docs/ponytail-audit-v1.md` #8).

**Kayia shipping method resolution:**
- Files: `apps/storefront/src/lib/presentation/kayia-shipping.ts`, `scripts/setup-kayia-shipping.mjs`
- Why fragile: Method identity depends on Medusa option `data.kayia_method` or type codes matching setup script; misconfigured Admin options fall through to null method and lose ETA/ACS/pickup UX.
- Safe modification: Always run `scripts/setup-kayia-shipping.mjs` (or dry-run) after shipping changes; keep storefront resolution and script DESIRED list in sync.
- Test coverage: `kayia-shipping.test.mjs` covers helpers; no E2E per method family yet (design calls for manual happy paths).

**Client presentation / brand swap:**
- Files: `apps/storefront/src/lib/presentation/client-bundle.ts`, `apps/storefront/src/app/layout.tsx`, store header/footer
- Why fragile: Pharmacy identity, hours, hero, and theme are scattered across `CLIENT_STORE`, `CLIENT_PRESENTATION`, Kayia shipping constants, and hardcoded home copy (“Λατσιά · Home delivery”).
- Safe modification: Treat `client-bundle.ts` + `kayia-shipping.ts` + home page literals as one client surface when swapping brands.
- Test coverage: `presentation.test.mjs` covers config merge; no visual regression suite.

**Mixed Greek / English shopper errors:**
- Files: `apps/storefront/src/app/actions/checkout-actions.ts`, `apps/storefront/src/lib/medusa/checkout-errors.ts`, `apps/storefront/src/lib/medusa/cart-errors.ts`
- Why fragile: UI chrome is Greek (`el-CY`) but many action/cart errors remain English (“This guest cart is no longer available…”).
- Safe modification: Localize error builders to Greek for Kayia demo, or introduce a message catalog before multi-locale clients.
- Test coverage: Message strings asserted in English in places — changing locale breaks tests.

## Scaling Limits

**Single Medusa process + one PostgreSQL per client:**
- Current capacity: Designed for ~10–50 concurrent shoppers SMB (`docs/ponytail-audit-v1.md`).
- Limit: In-memory reconciliation/lifecycle Maps; no horizontal session affinity story for those modules; guest cart volume is DB-bound.
- Scaling path: Persist recovery/lifecycle; scale Medusa vertically first; keep isolated deploy model (multi-tenant SaaS out of scope).

**Manual fulfillment / pharmacy ops:**
- Current capacity: Admin marks fulfill / ready for pickup; ACS point is free-text metadata.
- Limit: Wrong ACS point resolved by phone; no labels/tracking APIs (ADR-0137/0138 boundary).
- Scaling path: Accept for V1 volume; courier APIs are explicit non-goals until new scope.

**Copy-folder multi-client reuse:**
- Current capacity: One branded codebase instance per business.
- Limit: Kayia-specific shipping and presentation leaked into shared checkout; cloning without surgery ships pharmacy UX.
- Scaling path: Finish presentation/shipping adapter isolation before second paying client.

## Dependencies at Risk

**Medusa 2.21 + Stripe automatic capture:**
- Risk: Payment session status vocabulary and webhook timing are tightly coupled to storefront finalize rules; Medusa minor upgrades can shift session fields.
- Impact: Checkout stalls or double-init of PaymentIntents.
- Migration plan: Pin versions in workspace; re-run payment-session + phase7 tests on upgrades; verify webhook secret env on each deploy.

**pnpm 10.11.1 / Node 22.x workspace:**
- Risk: Engines require `>=22.12.0 <23`; host drift breaks CI/`ci:verify`.
- Impact: Install/build failures on mismatched Node.
- Migration plan: Document Node pin in deploy recipe; keep `packageManager` field authoritative.

**Notification test sink as default:**
- Risk: Easy to ship “working” commerce with sink still configured.
- Impact: Silent notification failure in production.
- Migration plan: Fail readiness if sink is active when `NODE_ENV=production` (or require explicit override).

## Missing Critical Features

**Real transactional email:**
- Problem: No customer/admin email egress.
- Blocks: First-client launch checklist item 5 (`docs/client-delivery-next-steps.md`); Kayia “ready for pickup” email.

**Durable payment-mismatch runbook / reconciliation:**
- Problem: No durable queue for charge-without-order.
- Blocks: Safe production ops under stale PaymentIntent cases.

**Greater-Nicosia postal list + confirmed cutoff:**
- Problem: Client open items before Kayia shipping launch.
- Blocks: Honest local-delivery zone enforcement and same-day ETA trust (`docs/clients/katerina-kayia-shipping-design.md`).

**Per-client deploy recipe:**
- Problem: No Dockerfile/PaaS template for apps.
- Blocks: Repeatable first paying client launch (P1 #6).

**Customer accounts / order history:**
- Problem: Guest-only checkout; no post-purchase self-serve status beyond confirmation page.
- Blocks: Shoppers calling pharmacy for status; acceptable V1 deferral (`docs/scope-v1.md`) but increases support load.

**Homepage merchandising:**
- Problem: Featured/popular are identical slices; no CMS/curation.
- Blocks: Marketing differentiation vs Wolt channel without code edits.

## Test Coverage Gaps

**Stripe webhook + cart.complete HTTP:**
- What's not tested: Live webhook→session status→finalize path; end-to-end `cart.complete` HTTP happy path.
- Files: Payment session route tests exist; missing webhook integration and complete HTTP coverage called out in `docs/ponytail-audit-v1.md`
- Risk: Regressions land only under production Stripe.
- Priority: High

**Browser E2E for Kayia shipping methods:**
- What's not tested: Pickup address rewrite, ACS required field, free-shipping ≥ €40 matrix, cutoff ETA copy, door delivery — design lists manual checks only.
- Files: `apps/storefront/src/lib/presentation/kayia-shipping.test.mjs` (unit), `docs/clients/katerina-kayia-shipping-design.md`
- Risk: Checkout UX breaks for pharmacy operators/shoppers unnoticed.
- Priority: High for first-client launch; Medium after manual QA process exists

**Custom refund/fulfill workflow HTTP:**
- What's not tested: No API calling custom workflows; unit tests pass `existingRefund` explicitly.
- Files: `apps/backend/src/workflows/refunds/__tests__/process-order-refund.unit.spec.ts`
- Risk: False confidence if workflows are wired later without loading prior refunds.
- Priority: Medium (High if automation starts calling them)

**Runtime wiring of phase modules:**
- What's not tested: Readiness checker evidence vs actual `medusa-config` registration.
- Files: `apps/backend/src/modules/verification/readiness-checker.ts`, `apps/backend/medusa-config.ts`
- Risk: Release docs oversell live capabilities.
- Priority: Medium

**Storefront inventory advisory only:**
- What's not tested / enforced: Pre-add checks are advisory; oversell races deferred to `cart.complete` (`docs/ponytail-audit-v1.md` #10).
- Files: Cart add actions, product purchase form
- Risk: Low-SKU pharmacy oversell under concurrent checkout.
- Priority: Low–Medium depending on inventory levels

---

*Concerns audit: 2026-11-01*
