<!-- refreshed: 2026-11-01 -->
# Architecture

**Analysis Date:** 2026-11-01

## System Overview

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                         Customer / Operator surfaces                         │
├──────────────────────────────┬──────────────────────────────────────────────┤
│  Next.js storefront          │  Medusa Admin (native dashboard)             │
│  `apps/storefront`           │  shipped with `@medusajs/dashboard`          │
│  App Router + Server Actions │  admin auth / ops UI                         │
└──────────────┬───────────────┴──────────────────┬───────────────────────────┘
               │ public Store API + publishable key│ admin / auth APIs
               ▼                                  ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                     Medusa 2.21 commerce backend                             │
│                     `apps/backend`                                           │
│  API routes · workflows · subscribers · domain libraries (`src/modules/*`)   │
└──────────────┬──────────────────────────┬──────────────────┬────────────────┘
               │                          │                  │
               ▼                          ▼                  ▼
┌──────────────────────┐    ┌─────────────────────┐   ┌──────────────────────┐
│ PostgreSQL           │    │ Object storage      │   │ External providers   │
│ (Medusa-owned DB)    │    │ (media; MinIO local) │   │ Stripe · email sink  │
│ `infra/docker-…`     │    │ `MEDIA_*` env       │   │ `medusa-config.ts`   │
└──────────────────────┘    └─────────────────────┘   └──────────────────────┘
```

## Component Responsibilities

| Component | Responsibility | File |
|-----------|----------------|------|
| Storefront App Router | SEO, pages, layout, guest UX | `apps/storefront/src/app/` |
| Storefront Server Actions | Same-origin cart/checkout mutations | `apps/storefront/src/app/actions/` |
| Medusa JS SDK client | Typed public Store API access | `apps/storefront/src/lib/medusa/client.ts` |
| Presentation bundle | Per-client branding/nav/SEO config | `apps/storefront/src/lib/presentation/client-bundle.ts` |
| Medusa runtime config | DB, CORS, Stripe, notification provider | `apps/backend/medusa-config.ts` |
| Custom Store API routes | Payment session, completed order, catalog ensure, health | `apps/backend/src/api/` |
| Workflows | Checkout payment prep, notifications, fulfillment, refunds, media, bulk import | `apps/backend/src/workflows/` |
| Subscribers | React to commerce events (`order.placed`, payment failures/refunds) | `apps/backend/src/subscribers/` |
| Domain libraries | Media, bulk-import, lifecycle, presentation projection, recovery, deployment, observability, verification | `apps/backend/src/modules/` |
| Local infra | PostgreSQL (+ optional MinIO) | `infra/docker-compose.yml` |

## Pattern Overview

**Overall:** Two-application monorepo with a clear authority split — Medusa owns all commerce state; Next.js owns presentation and guest interaction orchestration over the public Store API.

**Key Characteristics:**
- No general-purpose BFF: storefront talks to Medusa Store API via `@medusajs/js-sdk` from server code (`server-only` cart helpers).
- Guest-only V1: opaque HttpOnly cart cookie (`retail_cart_id`); no customer accounts or reusable post-purchase access.
- Commerce mutations and correctness-sensitive reads revalidate against Medusa; selective caching is for presentation-safe reads only.
- Backend extensions use Medusa file-based API routes, workflows-sdk, and event subscribers — not a separate worker app by default.
- Custom code under `apps/backend/src/modules/` is mostly plain TypeScript domain libraries (barrel exports), not Medusa `Module()` registrations (exception: `notification-test-sink` registered in `medusa-config.ts`).

## Layers

**Presentation (Next.js storefront):**
- Purpose: Branded storefront UI, SEO metadata, forms, Stripe Payment Element embedding
- Location: `apps/storefront/src/app/`, `apps/storefront/src/components/`
- Contains: Pages, layout, UI primitives, checkout/cart forms
- Depends on: `apps/storefront/src/lib/medusa/*`, `apps/storefront/src/lib/presentation/*`
- Used by: Browser (rendered HTML + limited client components)

**Storefront integration / orchestration:**
- Purpose: Map UX intents to Store API calls; validate inputs; project safe outcomes
- Location: `apps/storefront/src/lib/medusa/`, `apps/storefront/src/app/actions/`
- Contains: Cart/checkout/product/category clients, cookie continuity, action state types, error mapping
- Depends on: `@medusajs/js-sdk`, env (`MEDUSA_BACKEND_URL`, publishable key, region/country)
- Used by: App Router pages and Server Actions

**Commerce authority (Medusa backend):**
- Purpose: Catalog, cart, checkout completion, payments, orders, inventory, fulfillment, refunds, admin
- Location: `apps/backend/` (framework + `src/`)
- Contains: Configured Medusa modules (locking, Stripe payment, notification sink), custom routes/workflows/subscribers
- Depends on: PostgreSQL, Stripe, configured notification provider
- Used by: Storefront (Store API), Medusa Admin, webhooks

**Domain / operational libraries:**
- Purpose: Encapsulate non-core-commerce operational concerns (media signing, bulk import, lifecycle CAS, recovery manifests, deployment gates, observability redaction, readiness checks, presentation schema/projection)
- Location: `apps/backend/src/modules/{media,bulk-import,lifecycle,recovery,deployment,observability,verification,presentation,notifications}/`
- Contains: Pure/service-style TypeScript consumed by workflows, routes, or tests
- Depends on: Framework utils / Zod where needed; storage drivers via env
- Used by: Workflows, API routes, unit tests

**Infrastructure:**
- Purpose: Local Postgres (required) and optional MinIO for media experiments
- Location: `infra/`
- Contains: `docker-compose.yml`, operator README
- Depends on: Docker
- Used by: Local development via root `pnpm infra:*` scripts

## Data Flow

### Primary Request Path (catalog browse)

1. Browser hits App Router page (e.g. `apps/storefront/src/app/products/[handle]/page.tsx`) with `dynamic = "force-dynamic"`.
2. Page server component calls `getProductByHandle` in `apps/storefront/src/lib/medusa/products.ts`.
3. `getMedusaClient()` in `apps/storefront/src/lib/medusa/client.ts` issues Store API `product.list` / retrieve with pricing context (`region_id`, `country_code`).
4. Medusa serves catalog from PostgreSQL; page renders product UI and purchase form.

### Guest cart mutation path

1. Form posts to Server Action (e.g. `addItemAction` in `apps/storefront/src/app/actions/cart-actions.ts`).
2. Action validates FormData via `cart-validation.ts`, then calls `addLineItem` in `apps/storefront/src/lib/medusa/cart.ts`.
3. Cart helper reads/writes opaque cart id via `cart-cookie.ts` (`CART_COOKIE_NAME = "retail_cart_id"`) and mutates cart through Store API.
4. Action `revalidatePath("/cart")` and returns structured `CartActionState` success/error (no second cart model in Next.js).

### Checkout and payment path

1. Checkout Server Actions in `apps/storefront/src/app/actions/checkout-actions.ts` update contact, shipping, and drive payment preparation against Medusa.
2. Storefront calls custom Store route `POST /store/carts/:id/payment-session` (`apps/backend/src/api/store/carts/[id]/payment-session/route.ts`).
3. Route runs `ensureCartPaymentSessionWorkflow` (`apps/backend/src/workflows/ensure-cart-payment-session.ts`), which locks, creates/refreshes payment collection/session for Stripe, and returns client-safe session projection (`ready` | `reconcile` | `failed`).
4. Browser Payment Element (`stripe-payment-form.tsx`) uses client secret only; card data never touches app code.
5. After provider success, storefront finalizes via Medusa-owned completion path; confirmation uses `GET /store/carts/:id/completed-order` (`completed-order/route.ts`) for safe public projection.
6. Cookie clear runs via Route Handler `apps/storefront/src/app/checkout/confirmation/clear/route.ts` after authoritative verification (not a Server Action).

### Post-purchase notification path

1. Medusa emits `order.placed`.
2. Subscriber `apps/backend/src/subscribers/order-placed.ts` runs `sendOrderNotificationsWorkflow`.
3. Notification failures are logged and must not roll back the commerce transition (ADR-0124 pattern in subscriber catch).

### Operator fulfillment / refund / restock

1. Authorized Medusa Admin / backend workflows invoke fulfillment (`workflows/fulfillment/manage-order-fulfillment.ts`), refunds (`workflows/refunds/process-order-refund.ts`), or returns/restock (`workflows/returns/receive-and-restock.ts`).
2. Workflows wrap Medusa core-flows with idempotency keys and explicit status records; storefront only displays outcomes.

**State Management:**
- Commerce state: Medusa/PostgreSQL only.
- Guest continuity: HttpOnly opaque cart id cookie on the storefront origin.
- Presentation: Versioned client bundle in `client-bundle.ts` / `config.ts` (not a second commerce catalog).
- No Redux/Zustand or client-side cart reconstruction from localStorage.

## Key Abstractions

**Medusa Store API client singleton:**
- Purpose: One configured SDK instance per process with publishable key
- Examples: `apps/storefront/src/lib/medusa/client.ts`
- Pattern: Lazy module singleton + fail-fast env validation (`StorefrontConfigurationError`)

**Action state discriminated unions:**
- Purpose: Stable, UI-friendly mutation outcomes without leaking provider internals
- Examples: `apps/storefront/src/app/actions/cart-action-state.ts`, `checkout-action-state.ts`
- Pattern: `{ status: "success" | "error", message, fieldErrors? }` returned from Server Actions

**Payment session decision / projection:**
- Purpose: Classify cart payment collection state before exposing client secrets
- Examples: `apps/backend/src/workflows/ensure-cart-payment-session-state.ts`, storefront `checkout-payment.ts`
- Pattern: Explicit state machine (`ready` / `reconcile` / `failed`) with issue codes

**Safe public outcome projection:**
- Purpose: Return only display-safe confirmation fields after completion
- Examples: `apps/backend/src/api/store/carts/[id]/completed-order/route.ts`, `apps/backend/src/modules/presentation/projection.ts`
- Pattern: Remote query + sales-channel / publishable-key checks; omit internal ids/secrets

**Domain library barrels under `src/modules/`:**
- Purpose: Group operational logic with types + unit tests colocated in `__tests__/`
- Examples: `apps/backend/src/modules/media/index.ts`, `lifecycle/index.ts`, `bulk-import/index.ts`
- Pattern: `export * from "./…"` libraries imported by workflows/routes; do not assume Medusa DI registration unless wired in `medusa-config.ts`

**Runtime environment schema:**
- Purpose: Startup validation of required secrets and CORS/DB/Stripe/media settings
- Examples: `apps/backend/src/config/environment.ts`
- Pattern: Zod `parseRuntimeEnvironment()` called from `medusa-config.ts`

## Entry Points

**Storefront HTTP (Next.js):**
- Location: `apps/storefront/src/app/**/page.tsx`, `layout.tsx`
- Triggers: Browser navigation
- Responsibilities: SSR/RSC render, SEO metadata, compose Medusa reads + UI

**Storefront Server Actions:**
- Location: `apps/storefront/src/app/actions/cart-actions.ts`, `checkout-actions.ts`
- Triggers: Form actions / `useActionState`
- Responsibilities: Validate input, call Store API helpers, revalidate paths, return action state

**Storefront Route Handler (cookie clear):**
- Location: `apps/storefront/src/app/checkout/confirmation/clear/route.ts`
- Triggers: Confirmation cleanup request after verified completed order
- Responsibilities: Clear guest cart cookie without Server Action re-render side effects

**Medusa process:**
- Location: `apps/backend` via `medusa develop` / `medusa start` (`package.json` scripts)
- Triggers: Dev/prod process start; loads `medusa-config.ts`
- Responsibilities: HTTP APIs, Admin, workflows, subscribers, provider adapters

**Custom Store API routes:**
- Location: `apps/backend/src/api/store/**/route.ts`, `apps/backend/src/api/health/**/route.ts`
- Triggers: Storefront/SDK or probes
- Responsibilities: Extend Store surface (payment session, completed order, catalog ensure) and separated health signals

**Event subscribers:**
- Location: `apps/backend/src/subscribers/*.ts`
- Triggers: Medusa domain events (`order.placed`, payment failed/refunded)
- Responsibilities: Kick off notification workflows without owning commerce authority

**CLI / scripts:**
- Location: root `scripts/`, `apps/backend/scripts/run-tests.js`
- Triggers: Operator / CI
- Responsibilities: Shipping setup helpers, storefront diagnostics, Jest runner glue

## Architectural Constraints

- **Threading:** Node.js single-threaded event loop per process; Medusa may run server and worker as separate processes from the same codebase when async isolation is required (ADR-0108) — no separate custom worker app in V1.
- **Global state:** Storefront Medusa client singleton in `client.ts`; cart continuity only via HttpOnly cookie helpers marked `server-only`.
- **Circular imports:** Prefer lib → actions → components layering; keep payment-session workflow state helpers in `ensure-cart-payment-session-state.ts` separate from the workflow file.
- **Authority:** Never introduce a second cart, pricing, inventory, or order authority in Next.js. Never expose admin credentials or `DATABASE_URL` to the storefront.
- **Browser Store API:** Browser-originated Store calls must respect per-client CORS allow-lists (`STORE_CORS`); state-changing guest flows prefer same-origin Server Actions.
- **Secrets:** Stripe secrets and webhook secrets stay backend-only; Payment Element receives client-safe session data only.
- **Deployment isolation:** One client deployment = dedicated Postgres + isolated media + isolated credentials (copy-repo reuse model, not multi-tenant SaaS).

## Anti-Patterns

### Second commerce authority in the storefront

**What happens:** Persisting line items, prices, or order status in Next.js local state, demo JSON, or cookies beyond an opaque cart id.
**Why it's wrong:** Diverges from Medusa truth; breaks inventory/payment reconciliation.
**Do this instead:** Keep only `retail_cart_id` in `cart-cookie.ts`; always read/mutate via Store API helpers under `lib/medusa/`.

### Inferring payment success from the browser

**What happens:** Treating Stripe.js callbacks or HTTP 200 as authoritative paid/complete state.
**Why it's wrong:** Ambiguous provider outcomes require backend reconciliation (`reconcile` state).
**Do this instead:** Drive completion from Medusa payment session + completed-order projection routes; use `checkout-payment.ts` classification helpers.

### Registering every `src/modules/*` folder as a Medusa module blindly

**What happens:** Adding `{ resolve: "./src/modules/lifecycle" }` without a real `Module()` service export.
**Why it's wrong:** Most folders are plain libraries (barrels), not framework modules; only configured providers belong in `medusa-config.ts`.
**Do this instead:** Import library functions into workflows/routes; follow Medusa module scaffolding only when a DI-registered service + migrations are required.

### Using Server Actions for confirmation cookie clear

**What happens:** Clearing the cart cookie inside a Server Action during confirmation.
**Why it's wrong:** Cookie mutation in an action re-renders the page and fights the confirmation UX (documented in `checkout-actions.ts`).
**Do this instead:** Use `app/checkout/confirmation/clear/route.ts`.

### Bypassing publishable-key / sales-channel checks on custom Store routes

**What happens:** Returning order details for any cart id without `req.publishable_key_context.sales_channel_ids` checks.
**Why it's wrong:** Leaks cross-channel confirmation data.
**Do this instead:** Mirror `completed-order/route.ts` and `payment-session/route.ts` guards.

## Error Handling

**Strategy:** Map provider/HTTP failures to stable storefront action messages; keep backend errors typed with `MedusaError` on custom routes; never roll back authoritative commerce transitions for async notification failure.

**Patterns:**
- Storefront cart/checkout: `toCartOperationError` / `getCheckoutActionErrorMessage` + structured action state (`cart-errors.ts`, `checkout-errors.ts`).
- Catalog reads: throw `StorefrontCatalogError` after logging (`products.ts`); pages use `notFound()` / route `error.tsx`.
- Backend custom routes: `MedusaError.Types.NOT_FOUND` / `INVALID_DATA` with minimal public messages.
- Subscribers: try/catch around workflows; `console.error` / structured logger for operator recovery.
- Observability library: `StructuredLogger` + `redactSensitiveData` in `apps/backend/src/modules/observability/`.

## Cross-Cutting Concerns

**Logging:** Backend structured logging with redaction (`modules/observability`); storefront uses `console.error` with operation name and status only (no cart payloads).
**Validation:** Zod for backend runtime env (`config/environment.ts`); FormData validators in storefront `*-validation.ts`; route body allow-lists (e.g. payment-session `provider_id` only).
**Authentication:** Guest storefront (publishable key + opaque cart). Admin identity is Medusa-native Admin/auth — storefront has no admin authority.
**Health:** Separated signals at `/health/liveness`, `/health/readiness`, `/health/capabilities` under `apps/backend/src/api/health/`.
**Configuration ownership:** Single-owner boundaries — presentation in storefront client bundle; commerce/providers in Medusa env + Admin config.

---

*Architecture analysis: 2026-11-01*
