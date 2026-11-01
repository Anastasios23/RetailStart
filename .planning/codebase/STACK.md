# Technology Stack

**Analysis Date:** 2026-11-01

## Languages

**Primary:**
- TypeScript 5.x — Backend (`apps/backend`, TypeScript `^5.6.2`) and storefront (`apps/storefront`, TypeScript `5.9.3`)
- TSX / React JSX — Next.js App Router UI in `apps/storefront/src/` and Medusa Admin widgets under `apps/backend/src/admin/`

**Secondary:**
- JavaScript / ESM (`.mjs`) — Storefront Node test runner scripts (`apps/storefront/src/**/*.test.mjs`), root utility scripts (`scripts/*.mjs`)
- CSS — Tailwind CSS v4 entry in `apps/storefront/src/app/globals.css` with PostCSS (`apps/storefront/postcss.config.mjs`)
- YAML — Workspace and CI (`pnpm-workspace.yaml`, `.github/workflows/ci.yml`, `infra/docker-compose.yml`)
- Markdown — Project docs under `docs/`, `CONTEXT.md`, `README.md`, `AGENTS.md`

## Runtime

**Environment:**
- Node.js `>=22.12.0 <23` (root `package.json` `engines`); Phase 1 / CI pin is **22.23.2** (`.github/workflows/ci.yml`)
- Backend package also accepts Medusa’s broader engine (`^20.19.0 || >=22.12.0`) in `apps/backend/package.json`; monorepo baseline is Node 22

**Package Manager:**
- pnpm `10.11.1` (`packageManager` field in root and app manifests)
- Lockfile: `pnpm-lock.yaml` present
- Workspace: `pnpm-workspace.yaml` includes `apps/**`, excludes `apps/backend/.medusa/**`
- `onlyBuiltDependencies` allows `@medusajs/telemetry` builds under pnpm 10
- Root `.npmrc` present (package-manager config; do not commit tokens)

## Frameworks

**Core:**
- Medusa `2.21.0` (`@medusajs/medusa`, `@medusajs/framework`, `@medusajs/cli`, admin/dashboard packages) — commerce backend and Admin UI in `apps/backend`
- Next.js `15.5.24` (App Router) — customer storefront in `apps/storefront`
- React / React DOM `19.0.5` — storefront
- React `18.3.x` — Medusa Admin / backend UI toolchain (backend `devDependencies`)
- Zod `4.2.0` — runtime env validation via `@medusajs/framework/zod` in `apps/backend/src/config/environment.ts`

**Testing:**
- Jest `^29.7.0` + `@swc/jest` + `@medusajs/test-utils` `2.21.0` — backend unit and HTTP integration tests (`apps/backend/jest.config.js`, `apps/backend/scripts/run-tests.js`)
- Node.js built-in test runner (`node --experimental-strip-types --test`) — storefront tests (`apps/storefront` `test` script)

**Build/Dev:**
- Medusa CLI (`medusa build` / `medusa develop` / `medusa start` / `medusa db:migrate` / `medusa lint`)
- Next.js toolchain (`next dev -p 8000`, `next build`, `next start -p 8000`)
- Vite `^7.3.6` — Medusa Admin frontend build path (backend `devDependencies`)
- SWC (`@swc/core`) — Jest/ts-node acceleration for backend
- ESLint `9.39.5` + `@medusajs/eslint-plugin` `2.21.0` — backend lint (`apps/backend/eslint.config.ts`)
- Docker Compose — local Postgres and optional MinIO (`infra/docker-compose.yml`)

## Key Dependencies

**Critical:**
- `@medusajs/js-sdk` / `@medusajs/types` `2.21.0` — storefront typed Store API client (`apps/storefront/src/lib/medusa/client.ts`)
- `@medusajs/medusa/payment-stripe` (wired in `apps/backend/medusa-config.ts`) — Stripe payment provider `pp_stripe_stripe`
- `@stripe/stripe-js` `8.2.0` + `@stripe/react-stripe-js` `5.3.0` — browser Payment Element (`apps/storefront/src/app/components/stripe-payment-form.tsx`)
- `@medusajs/medusa/locking-postgres` — Postgres-backed locking provider (default in `medusa-config.ts`)
- PostgreSQL 16 (Docker image `postgres:16-alpine`) — authoritative commerce DB

**UI / presentation (storefront):**
- Tailwind CSS `^4.3.3` + `@tailwindcss/postcss`
- Radix Slot (`@radix-ui/react-slot`), `class-variance-authority`, `clsx`, `tailwind-merge`, `lucide-react` — shadcn/ui “new-york” style components (`apps/storefront/components.json`, `apps/storefront/src/components/ui/`)
- `server-only` — marks server-only Medusa boundary modules

**Infrastructure:**
- MikroORM PostgreSQL stack (transitive via Medusa / `@mikro-orm/postgresql`) — persistence
- Custom in-process notification provider `./src/modules/notification-test-sink` — email channel sink for V1 (not a production ESP yet)
- Media storage adapter interface + `InMemoryMediaStorageAdapter` (`apps/backend/src/modules/media/storage-adapter.ts`); env supports `local` | `s3` | `mock` drivers
- Structured JSON logger (`apps/backend/src/modules/observability/logger.ts`) — console JSON with redaction; OpenTelemetry scaffold commented in `apps/backend/instrumentation.ts`

**Admin UI (backend):**
- `@medusajs/dashboard`, `@medusajs/admin-sdk`, `@medusajs/ui` `4.2.4`
- `@tanstack/react-query` `5.64.2`, `react-router-dom` `7.18.2`, `react-i18next` `13.5.0`

## Configuration

**Environment:**
- Backend: copy `apps/backend/.env.template` → local `.env` (file present locally; never commit secrets). Validated by `parseRuntimeEnvironment()` in `apps/backend/src/config/environment.ts`
- Storefront: copy `apps/storefront/.env.example` → `.env.local` (server-only Medusa vars; only Stripe publishable key is `NEXT_PUBLIC_*`)
- Required backend vars include CORS (`STORE_CORS`, `ADMIN_CORS`, `AUTH_CORS`), `JWT_SECRET`, `COOKIE_SECRET`, `DATABASE_URL`, `DB_NAME`, Stripe trio (`STRIPE_API_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PAYMENT_METHOD_CONFIGURATION`), optional media vars, `SHUTDOWN_TIMEOUT_MS`
- Shared catalog-ensure secret: `CATALOG_ENSURE_SECRET` (backend template + storefront example)
- Root scripts: `pnpm infra:up`, `pnpm db:migrate`, `pnpm dev`, `pnpm ci:verify`

**Build:**
- Backend: `apps/backend/tsconfig.json` → emit under `.medusa/server`; `medusa-config.ts` is the Medusa project config entry
- Storefront: `apps/storefront/tsconfig.json` (path alias `@/*` → `./src/*`), `apps/storefront/next.config.mjs` (remote image hosts: Unsplash, Wolt imageproxy)
- Root orchestration: `pnpm build`, `pnpm typecheck`, `pnpm test`, `pnpm test:integration:http`

## Platform Requirements

**Development:**
- Node.js 22.23.2 + pnpm 10.11.1
- Docker for PostgreSQL on host port `5433` (`pnpm infra:up`)
- Optional MinIO via Compose profile `media` (`pnpm infra:media:up`) — local S3-compatible API on `localhost:9003`, console `9002`; not required for backend readiness
- Backend default HTTP ~`9000`; storefront `8000`
- Stripe test-mode keys and Payment Method Configuration (`pmc_*`) for payment flows

**Production:**
- Provider-neutral isolated per-client deploy (ADR-0013 / ADR-0038): one Next.js + one Medusa + dedicated PostgreSQL + isolated object storage + client Stripe/email secrets
- No concrete PaaS (Render/Vercel/etc.) is selected in-repo; hosting topology remains deployment follow-up
- Cloudflare optional for DNS/CDN/edge; not a commerce dependency
- Bind HTTP to platform `PORT` where the host requires it; durable state must not live on ephemeral app filesystem
- Demo client presentation: Φαρμακείο Κατερίνα Καγιά in `apps/storefront/src/lib/presentation/client-bundle.ts`

---

*Stack analysis: 2026-11-01*
