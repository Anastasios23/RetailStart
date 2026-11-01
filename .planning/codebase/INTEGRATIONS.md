# External Integrations

**Analysis Date:** 2026-11-01

## APIs & External Services

**Commerce (internal boundary):**
- Medusa public Store API — sole commerce surface for the Next.js storefront
  - SDK/Client: `@medusajs/js-sdk` via `getMedusaClient()` in `apps/storefront/src/lib/medusa/client.ts`
  - Auth: `MEDUSA_PUBLISHABLE_KEY` (server-only; never `NEXT_PUBLIC_*`); base URL `MEDUSA_BACKEND_URL`
  - Pricing context: `MEDUSA_REGION_ID`, `MEDUSA_COUNTRY_CODE` (V1 demo uses `CY`)
  - Custom store routes: `apps/backend/src/api/store/carts/[id]/payment-session/route.ts`, `.../completed-order/route.ts`, `apps/backend/src/api/store/catalog/ensure/route.ts`

**Payments:**
- Stripe (test-mode V1) — card payments via Medusa payment-stripe provider + embedded Payment Element
  - Backend SDK/provider: `@medusajs/medusa/payment-stripe` configured in `apps/backend/medusa-config.ts` with `id: "stripe"` → provider id `pp_stripe_stripe` (`apps/storefront/src/lib/medusa/checkout-payment.ts`, `apps/backend/src/workflows/ensure-cart-payment-session-state.ts`)
  - Browser SDK: `@stripe/stripe-js` / `@stripe/react-stripe-js` in `apps/storefront/src/app/components/stripe-payment-form.tsx`
  - Auth / secrets: `STRIPE_API_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PAYMENT_METHOD_CONFIGURATION` (backend-only); `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` (browser)
  - Options: `capture: true`, Payment Method Configuration id (`pmc_*`)
  - Authority: Medusa owns payment lifecycle (ADR-0005); storefront only confirms Payment Element

**Transactional email:**
- Notification provider abstraction — Medusa notification module
  - Current wired provider: custom `notification-test-sink` (`apps/backend/src/modules/notification-test-sink/`) registered for channel `email` in `medusa-config.ts`
  - Production ESP (SendGrid/Resend/SMTP/etc.): not selected/wired; architecture requires a backend-owned adapter (ADR-0006); client-delivery backlog calls out wiring a real email provider
  - Workflows/subscribers: `apps/backend/src/workflows/notifications/`, `apps/backend/src/subscribers/order-placed.ts`, `payment-failed.ts`, `payment-refunded.ts`

**Media / object storage:**
- Provider-neutral media boundary (`apps/backend/src/modules/media/`)
  - Drivers (env): `MEDIA_STORAGE_DRIVER` = `local` | `s3` | `mock` (default `local`) in `apps/backend/src/config/environment.ts`
  - Implemented adapter in-repo: `InMemoryMediaStorageAdapter` in `apps/backend/src/modules/media/storage-adapter.ts` (plus signing/finalization workflows under `apps/backend/src/workflows/media/`)
  - Local optional MinIO (S3-compatible) in `infra/docker-compose.yml` profile `media` — **not** wired into Medusa runtime config; reserved for media phase/local experiments (`infra/README.md`)
  - Related env: `MEDIA_PUBLIC_URL_PREFIX`, `MEDIA_SIGNING_SECRET`, `MEDIA_UPLOAD_MAX_SIZE_BYTES`, optional `MEDIA_UPLOAD_URL`

**Presentation / content sources (not commerce APIs):**
- Client presentation bundle — `apps/storefront/src/lib/presentation/client-bundle.ts` (Kayia pharmacy branding, contact, theme)
- Demo catalog helpers / Wolt-derived product imagery references — `apps/storefront/src/lib/presentation/demo-catalog.ts`, `wolt-catalog.json`; Next image allowlist includes `imageproxy.wolt.com` and `images.unsplash.com` in `apps/storefront/next.config.mjs`
- Social links in presentation only (Instagram, Facebook, Wolt venue URL) — outbound marketing links, not API integrations

**CDN / edge:**
- Cloudflare — optional per architecture for DNS, CDN, frontend/media delivery, or edge security; no Cloudflare SDK or Workers config in this repo; commerce does not depend on it

## Data Storage

**Databases:**
- PostgreSQL 16 (`postgres:16-alpine` in `infra/docker-compose.yml` and CI)
  - Connection: `DATABASE_URL` (+ `DB_NAME`); local template uses host port `5433` → container `5432`
  - Client: Medusa / MikroORM via framework (`ContainerRegistrationKeys.PG_CONNECTION` used in `apps/backend/src/api/health/health.ts`)
  - Locking: `@medusajs/medusa/locking-postgres` as default locking provider
  - Model: one dedicated DB per client deployment (ADR-0004); owns commerce and operational/reconciliation records (ADR-0043)
  - Redis: Medusa transitive packages support Redis caching/event-bus, but **no Redis service or Redis module** is configured in `medusa-config.ts` or Compose

**File Storage:**
- Isolated object storage per client (ADR-0008) — intended production binary media store
- Local: Docker MinIO optional; in-memory/mock adapters for tests and default driver path
- Application filesystem is ephemeral for deploys; do not treat repo or app disk as durable media

**Caching:**
- None as a required external cache service
- Storefront may selectively cache safe read-oriented presentation data (ADR-0019); Medusa remains authority for purchase-sensitive state
- `@medusajs/caching` is a backend dependency; no Redis cache provider is wired in project config

## Authentication & Identity

**Auth Provider:**
- Medusa-native Admin authentication — sessions/JWT for Medusa Admin (ADR-0010, ADR-0012)
  - Implementation: Medusa framework HTTP auth; secrets `JWT_SECRET`, `COOKIE_SECRET`; CORS `ADMIN_CORS`, `AUTH_CORS`
  - V1: one basic admin access level; no custom RBAC
- Customer storefront: guest checkout only — no customer accounts, login, or order-history auth (CONTEXT / ADR guest-cart decisions)
- Storefront → Medusa: publishable API key (`MEDUSA_PUBLISHABLE_KEY`) on Store API requests; browser-origin allow-list via `STORE_CORS`
- Shared secret for catalog ensure: `CATALOG_ENSURE_SECRET` between storefront server actions and `apps/backend/src/api/store/catalog/ensure/route.ts`

## Monitoring & Observability

**Error Tracking:**
- None (no Sentry/Datadog/etc. SDK configured)

**Logs:**
- Structured JSON console logger with redaction: `apps/backend/src/modules/observability/logger.ts`, `redaction.ts`
- Health surfaces: Medusa `/health` plus custom `apps/backend/src/api/health/liveness/route.ts`, `readiness/route.ts`, `capabilities/route.ts`; graceful drain via `shutdown.ts` and `SHUTDOWN_TIMEOUT_MS`
- OpenTelemetry: scaffold commented out in `apps/backend/instrumentation.ts` (`registerOtel` / Zipkin exporter not enabled)

**Alerting / reconciliation:**
- Controlled human reconciliation patterns documented in ADRs; provider dashboards (e.g. Stripe) are supporting evidence, not commerce authority

## CI/CD & Deployment

**Hosting:**
- Provider-neutral; concrete production host not pinned in-repo
- Local: Docker Compose Postgres (+ optional MinIO); apps run via `pnpm dev`
- Per-client isolated deploy of storefront + backend + Postgres + object storage + secrets

**CI Pipeline:**
- GitHub Actions: `.github/workflows/ci.yml`
  - Job `verify`: Node 22.23.2, pnpm 10.11.1, `pnpm typecheck` / `lint` / `test` / `build` with placeholder Stripe env
  - Job `integration-http`: Postgres 16 service + real Stripe test secrets from GitHub Actions repository secrets (`STRIPE_API_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PAYMENT_METHOD_CONFIGURATION`); runs `pnpm test:integration:http`
  - Integration job skips fork/Dependabot PRs without secret access

## Environment Configuration

**Required env vars (critical):**

Backend (`apps/backend/.env.template` + `environment.ts`):
- `STORE_CORS`, `ADMIN_CORS`, `AUTH_CORS`
- `JWT_SECRET`, `COOKIE_SECRET`
- `DATABASE_URL`, `DB_NAME`
- `STRIPE_API_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PAYMENT_METHOD_CONFIGURATION`
- `SHUTDOWN_TIMEOUT_MS` (default 10000)
- `CATALOG_ENSURE_SECRET` (template; catalog ensure pairing)
- Media optional: `MEDIA_STORAGE_DRIVER`, `MEDIA_PUBLIC_URL_PREFIX`, `MEDIA_SIGNING_SECRET`, `MEDIA_UPLOAD_MAX_SIZE_BYTES`

Storefront (`apps/storefront/.env.example`):
- `MEDUSA_BACKEND_URL`, `MEDUSA_PUBLISHABLE_KEY`, `MEDUSA_REGION_ID`, `MEDUSA_COUNTRY_CODE`
- `CATALOG_ENSURE_SECRET`
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`

**Secrets location:**
- Local: `apps/backend/.env`, `apps/storefront/.env.local` (gitignored; do not commit)
- Templates/examples only in repo: `apps/backend/.env.template`, `apps/storefront/.env.example`
- CI Stripe secrets: GitHub Actions repository secrets
- Never expose backend Stripe secret key, webhook secret, JWT/cookie secrets, or Medusa publishable-key pairing via `NEXT_PUBLIC_*` except the Stripe publishable key

## Webhooks & Callbacks

**Incoming:**
- Stripe webhooks — backend-owned provider webhook ingress (ADR-0040 / ADR-0126)
  - Secret: `STRIPE_WEBHOOK_SECRET` passed to Medusa payment-stripe options in `medusa-config.ts`
  - Processed by Medusa Stripe payment provider routes (framework-owned path; not a custom storefront route)
  - Must tolerate retries/duplicates without duplicate orders/payments/refunds

**Outgoing:**
- Stripe API calls — via Medusa payment provider (PaymentIntents / captures / refunds)
- Transactional email sends — via notification provider (`notification-test-sink` today; production ESP later)
- Storefront does not call Stripe secret APIs; browser uses Payment Element with client secret from Medusa payment session

**Internal HTTP callbacks / health:**
- Liveness / readiness / capabilities under `apps/backend/src/api/health/` for deploy orchestration
- No separate webhook gateway or BFF service

---

*Integration audit: 2026-11-01*
