# Codebase Structure

**Analysis Date:** 2026-11-01

## Directory Layout

```
retail-starter/
├── apps/
│   ├── backend/                 # Medusa 2.21 commerce authority
│   │   ├── medusa-config.ts     # Runtime config entry (DB, CORS, Stripe, notifications)
│   │   ├── instrumentation.ts   # Optional OTEL hook (stubbed/commented)
│   │   ├── integration-tests/   # HTTP integration specs
│   │   ├── scripts/             # Jest runner glue
│   │   └── src/
│   │       ├── api/             # File-based HTTP routes (store + health)
│   │       ├── admin/           # Medusa Admin customization scaffold
│   │       ├── config/          # Env schema / parseRuntimeEnvironment
│   │       ├── jobs/            # Scheduled job scaffold (README only)
│   │       ├── links/           # Module-link scaffold (README only)
│   │       ├── modules/         # Domain libraries + notification-test-sink provider
│   │       ├── subscribers/     # Event handlers
│   │       ├── workflows/       # Workflows-sdk commerce/ops flows
│   │       └── migration-scripts/
│   └── storefront/              # Next.js 15 App Router guest storefront
│       ├── next.config.mjs
│       ├── public/
│       └── src/
│           ├── app/             # Routes, Server Actions, page-local components
│           ├── components/      # Shared UI + store chrome
│           └── lib/             # Medusa clients, presentation, money utils
├── docs/                        # Architecture, ADRs, plans, client briefs
│   ├── architecture.md
│   ├── decisions/               # Accepted ADRs (100+)
│   └── clients/                 # Per-client delivery notes
├── infra/                       # Docker Compose Postgres (+ MinIO profile)
├── scripts/                     # Repo-level operator helpers
├── package.json                 # pnpm workspace root scripts
├── pnpm-workspace.yaml          # apps/** (excludes .medusa)
├── CONTEXT.md
├── AGENTS.md
└── README.md
```

## Directory Purposes

**`apps/backend`:**
- Purpose: Medusa commerce backend — sole commerce authority for the deployment
- Contains: Framework app, custom API routes, workflows, subscribers, domain libraries, unit/integration tests
- Key files: `medusa-config.ts`, `src/config/environment.ts`, `src/api/store/carts/[id]/payment-session/route.ts`, `src/workflows/ensure-cart-payment-session.ts`

**`apps/backend/src/api`:**
- Purpose: File-based Medusa HTTP routes (`route.ts` per path segment)
- Contains: Store extensions and health probes
- Key files:
  - `store/carts/[id]/payment-session/route.ts`
  - `store/carts/[id]/completed-order/route.ts`
  - `store/catalog/ensure/route.ts`
  - `health/liveness/route.ts`, `health/readiness/route.ts`, `health/capabilities/route.ts`

**`apps/backend/src/workflows`:**
- Purpose: Durable multi-step commerce and operational workflows
- Contains: Payment session ensure, notifications, fulfillment, refunds, returns/restock, media authorize/finalize, bulk import
- Key files: `ensure-cart-payment-session.ts`, `notifications/send-order-notifications.ts`, `fulfillment/manage-order-fulfillment.ts`

**`apps/backend/src/subscribers`:**
- Purpose: React to Medusa events and dispatch workflows
- Contains: `order-placed.ts`, `payment-failed.ts`, `payment-refunded.ts` (+ unit specs)

**`apps/backend/src/modules`:**
- Purpose: Domain/ops libraries (mostly not DI-registered Medusa modules)
- Contains:
  - `media/` — signing, storage adapter, finalization, cleanup
  - `bulk-import/` — schema, ordering, executor, tracker
  - `lifecycle/` — policy, activation service, cleanup
  - `presentation/` — schema, safe projection, extensions
  - `recovery/` — manifest + reconciliation helpers
  - `deployment/` — release tuple, promotion gate, migration lifecycle
  - `observability/` — structured logger + redaction
  - `verification/` — production readiness checker
  - `notifications/` — templates, idempotency, redaction helpers
  - `notification-test-sink/` — registered email channel provider for tests/dev
- Key files: each package’s `index.ts` barrel

**`apps/storefront`:**
- Purpose: Customer-facing branded store; presentation + Store API orchestration
- Contains: Next.js App Router app, Tailwind/shadcn-style UI, Medusa SDK integration
- Key files: `src/app/layout.tsx`, `src/lib/medusa/client.ts`, `src/lib/presentation/client-bundle.ts`

**`apps/storefront/src/app`:**
- Purpose: Routes and mutation entry points
- Contains: `page.tsx` routes, `actions/` Server Actions, `components/` route-adjacent UI, confirmation `clear/route.ts`
- Key routes: `/`, `/products`, `/products/[handle]`, `/categories`, `/categories/[handle]`, `/search`, `/cart`, `/checkout`, `/checkout/confirmation`, `/catalog/[id]`

**`apps/storefront/src/lib`:**
- Purpose: Server-safe integration and presentation helpers
- Contains: `medusa/` (API clients, cookies, validation, errors), `presentation/` (client bundle, shipping helpers, demo catalog artifacts), `money.ts`, `utils.ts`
- Key files: `medusa/cart.ts`, `medusa/checkout.ts`, `medusa/products.ts`, `presentation/client-bundle.ts`

**`apps/storefront/src/components`:**
- Purpose: Shared chrome and reusable UI
- Contains: `store-header.tsx`, `store-footer.tsx`, product/category grids, `ui/*` primitives (button, card, input, badge, separator)

**`docs`:**
- Purpose: Product/architecture source of truth for agents and planners
- Contains: `architecture.md`, `implementation-plan.md`, `release-readiness-v1.md`, ADR tree under `decisions/`, client briefs under `clients/`
- Key files: `docs/architecture.md`, `docs/decisions/0096-v1-two-application-boundary.md`

**`infra`:**
- Purpose: Local Docker dependencies only
- Contains: `docker-compose.yml` (Postgres on host `5433`; MinIO under `media` profile), `README.md`

**`scripts`:**
- Purpose: One-off operator tooling at repo root
- Contains: `setup-kayia-shipping.mjs`, `diagnose-storefront.mjs`

**`.planning/codebase`:**
- Purpose: GSD codebase maps consumed by plan/execute commands
- Contains: Generated analysis docs (`ARCHITECTURE.md`, `STRUCTURE.md`, etc.)
- Generated: Yes (by mappers) · Committed: when orchestrator commits

## Key File Locations

**Entry Points:**
- `apps/backend/medusa-config.ts`: Medusa process configuration
- `apps/backend/src/api/**/route.ts`: Custom HTTP endpoints
- `apps/backend/src/subscribers/*.ts`: Event entry points
- `apps/storefront/src/app/layout.tsx`: Root layout + SEO from presentation bundle
- `apps/storefront/src/app/**/page.tsx`: Route pages
- `apps/storefront/src/app/actions/*.ts`: Server Action mutation entry points

**Configuration:**
- Root: `package.json`, `pnpm-workspace.yaml`, `pnpm-lock.yaml`
- Backend: `apps/backend/medusa-config.ts`, `apps/backend/src/config/environment.ts`, `apps/backend/tsconfig.json`, `apps/backend/jest.config.js`, `apps/backend/eslint.config.ts`
- Storefront: `apps/storefront/next.config.mjs`, `apps/storefront/tsconfig.json` (`@/*` → `./src/*`), `apps/storefront/postcss.config.mjs`, `apps/storefront/components.json`
- Infra: `infra/docker-compose.yml`
- Env files: `.env` may exist per app — note existence only; never commit secrets

**Core Logic:**
- Cart/checkout storefront: `apps/storefront/src/lib/medusa/cart.ts`, `checkout.ts`, `checkout-payment.ts`
- Products/categories/search: `apps/storefront/src/lib/medusa/products.ts`, `categories.ts`
- Payment workflow: `apps/backend/src/workflows/ensure-cart-payment-session.ts`
- Notifications: `apps/backend/src/workflows/notifications/`, `apps/backend/src/subscribers/order-placed.ts`
- Ops modules: `apps/backend/src/modules/{media,bulk-import,lifecycle,recovery,deployment,verification}/`

**Testing:**
- Backend unit: colocated `**/__tests__/*.unit.spec.ts` under `apps/backend/src/`
- Backend HTTP integration: `apps/backend/integration-tests/http/`
- Storefront: colocated `*.test.mjs` under `apps/storefront/src/**` (Node test runner)

## Naming Conventions

**Files:**
- Medusa routes: always `route.ts` inside a path-shaped directory (`api/store/carts/[id]/completed-order/route.ts`)
- Workflows: verb-noun files (`process-order-refund.ts`, `authorize-media-upload.ts`)
- Storefront pages: `page.tsx`, `layout.tsx`, `error.tsx`, `not-found.tsx`
- Server Actions: `*-actions.ts` with companion `*-action-state.ts`
- Backend unit tests: `*.unit.spec.ts` inside `__tests__/`
- Storefront tests: `*.test.mjs` next to the module under test

**Directories:**
- Kebab-case for multi-word folders (`bulk-import`, `payment-session`, `ensure-cart-payment-session` helpers as files)
- Dynamic segments use `[param]` (`[handle]`, `[id]`)
- Domain libraries live under `modules/<name>/` with flat sibling files (`types.ts`, `service.ts`, `index.ts`)

**Symbols:**
- Storefront functions: camelCase (`getMedusaClient`, `addLineItem`)
- Types/interfaces: PascalCase (`CheckoutActionState`, `PublicPresentationConfig`)
- Constants: SCREAMING_SNAKE or exported const camel (`CART_COOKIE_NAME`, `productPageSize`)
- Workflow exports: descriptive workflow factories matching Medusa patterns (`ensureCartPaymentSessionWorkflow`)

## Where to Add New Code

**New storefront feature (browse/read):**
- Primary code: `apps/storefront/src/app/<route>/page.tsx`
- Data access: `apps/storefront/src/lib/medusa/<domain>.ts` (Store API only)
- Shared UI: `apps/storefront/src/components/`
- Tests: `apps/storefront/src/lib/medusa/<domain>.test.mjs`

**New guest mutation (cart/checkout UX):**
- Server Action: `apps/storefront/src/app/actions/`
- Validation/errors: `apps/storefront/src/lib/medusa/*-validation.ts`, `*-errors.ts`
- Prefer Server Actions over new browser Store API callers for state changes

**New Medusa Store API extension:**
- Route: `apps/backend/src/api/store/<path>/route.ts`
- Heavy logic: workflow under `apps/backend/src/workflows/<area>/`
- Unit tests: colocated `__tests__/` next to route or workflow
- Guard with publishable-key / sales-channel checks like existing cart routes

**New post-transition side effect:**
- Subscriber: `apps/backend/src/subscribers/<event>.ts`
- Workflow: `apps/backend/src/workflows/<area>/`
- Do not couple notification/provider failure to commerce rollback

**New operational domain library:**
- Implementation: `apps/backend/src/modules/<name>/` with `index.ts` barrel + `__tests__/`
- Register in `medusa-config.ts` only if it is a real Medusa module/provider (service export + framework Module definition)

**New client branding / presentation:**
- Swap or edit `apps/storefront/src/lib/presentation/client-bundle.ts` (and related presentation helpers)
- Leave commerce workflows and Store API contracts unchanged

**Utilities:**
- Storefront shared helpers: `apps/storefront/src/lib/utils.ts`, `money.ts`
- Backend env/config: `apps/backend/src/config/`
- Observability helpers: `apps/backend/src/modules/observability/`

## Special Directories

**`apps/backend/.medusa`:**
- Purpose: Medusa build/output artifacts
- Generated: Yes
- Committed: No (excluded from workspace via `pnpm-workspace.yaml`)

**`apps/storefront/.next`:**
- Purpose: Next.js build cache/output
- Generated: Yes
- Committed: No

**`apps/backend/src/admin`:**
- Purpose: Optional Admin UI customization scaffold
- Generated: No (scaffold + README)
- Committed: Yes (mostly empty of custom widgets today)

**`apps/backend/src/jobs`, `apps/backend/src/links`:**
- Purpose: Medusa scaffolding placeholders
- Generated: No
- Committed: Yes (README guidance; add files here when scheduling/links are required)

**`docs/decisions`:**
- Purpose: Accepted architecture decision records
- Generated: No
- Committed: Yes — consult before changing authority boundaries

**`node_modules`:**
- Purpose: pnpm installed dependencies
- Generated: Yes
- Committed: No

**`.env` / `.env.*` (if present):**
- Purpose: Local secrets and CORS/DB/Stripe/Medusa URLs
- Generated: No
- Committed: No — never read or quote contents in docs or commits

---

*Structure analysis: 2026-11-01*
