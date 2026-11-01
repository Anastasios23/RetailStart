# Coding Conventions

**Analysis Date:** 2026-11-01

## Naming Patterns

**Files:**
- Backend modules: kebab-free descriptive nouns — `service.ts`, `policy.ts`, `cleanup.ts`, `signing.ts`, `readiness-checker.ts` under `apps/backend/src/modules/<domain>/`
- Backend API routes: Medusa App Router style — `apps/backend/src/api/**/route.ts` (e.g. `apps/backend/src/api/store/carts/[id]/payment-session/route.ts`)
- Backend workflows: verb-noun filenames — `ensure-cart-payment-session.ts`, `send-order-notifications.ts`, `process-order-refund.ts` under `apps/backend/src/workflows/`
- Backend subscribers: event-name files — `order-placed.ts`, `payment-failed.ts`, `payment-refunded.ts` under `apps/backend/src/subscribers/`
- Storefront pages: Next.js App Router — `page.tsx`, `layout.tsx`, `error.tsx`, `not-found.tsx`, `route.ts` under `apps/storefront/src/app/`
- Storefront lib: kebab-case domain files — `cart-errors.ts`, `checkout-validation.ts`, `cart-cookie-options.ts` under `apps/storefront/src/lib/medusa/`
- Storefront UI primitives: lowercase kebab — `button.tsx`, `card.tsx` under `apps/storefront/src/components/ui/`
- Unit tests (backend): co-located `__tests__/<name>.unit.spec.ts`
- Unit tests (storefront): co-located `<name>.test.mjs` next to the module under test

**Functions:**
- camelCase for functions and methods — `activatePolicy`, `getOrCreateCart`, `classifyCartError`, `parseRuntimeEnvironment`
- Prefer verb-led names that state the outcome — `validatePresentationBundle`, `assertPromotionGate`, `executeCartSessionCleanup`
- Next.js server actions end with `Action` — `addItemAction`, `updateCheckoutContactAction`, `finalizeCheckoutAction` in `apps/storefront/src/app/actions/`
- HTTP handlers export uppercase method names — `POST`, `GET` from `route.ts`

**Variables:**
- camelCase locals — `providerId`, `salesChannelIds`, `fingerprint`
- SCREAMING_SNAKE for module-level constants — `FORBIDDEN_COMMERCE_KEYS`, `MANDATORY_PRODUCTION_GATES`, `KAYIA_ACS_POINTS_URL`
- Env var names match process.env keys exactly — `MEDUSA_BACKEND_URL`, `STRIPE_API_KEY`

**Types:**
- PascalCase interfaces and type aliases — `LifecyclePolicy`, `CartActionState`, `PresentationBundle`
- Discriminated unions with literal `status` / `ok` fields — `CartActionState`, `CheckoutValidationResult`
- Domain payload fields use snake_case to mirror Medusa/API wire format — `operation_id`, `client_id`, `bundle_id`, `currency_code` in `apps/backend/src/modules/*/types.ts` and storefront checkout address shapes
- Local TypeScript identifiers stay camelCase even when they wrap snake_case payloads

**Classes:**
- PascalCase services and errors — `LifecycleActivationService`, `StructuredLogger`, `CartOperationError`, `StorefrontConfigurationError`
- Custom errors set `this.name` explicitly

## Code Style

**Formatting:**
- No Prettier / Biome config in the repo — formatting follows existing file style
- No trailing semicolons in TypeScript/TSX (ASI style throughout backend and storefront)
- Double quotes for string literals
- Two-space indentation
- Prefer early returns over deep nesting

**Linting:**
- Backend only: ESLint 9 flat config at `apps/backend/eslint.config.ts`
- Extends `@medusajs/eslint-plugin` recommended — `export default defineConfig([...medusa.configs.recommended])`
- Root script: `pnpm lint` → `pnpm --filter @retail-starter/backend lint` (`medusa lint`)
- Storefront has no ESLint config; rely on `tsc --noEmit` via `pnpm typecheck`

**TypeScript:**
- Backend `apps/backend/tsconfig.json`: `strictNullChecks: true`, `module`/`moduleResolution` `Node16`, decorators enabled for Medusa
- Storefront `apps/storefront/tsconfig.json`: full `strict: true`, path alias `@/*` → `./src/*`
- Prefer explicit exported types next to domain modules (`types.ts` per module)

## Import Organization

**Order (observed):**
1. External packages (`@medusajs/*`, `next/*`, `node:*`, React)
2. Blank line
3. Internal relative imports (`../`, `../../`) or storefront alias `@/`
4. Type-only imports use `import type { ... }` when importing types alone

**Path Aliases:**
- Storefront: `@/*` maps to `apps/storefront/src/*` — use for UI/shared helpers (`import { cn } from "@/lib/utils"`)
- Backend: relative paths only (no path aliases in `tsconfig.json`)
- Deep relative imports from API routes to workflows are normal — e.g. `../../../../../workflows/ensure-cart-payment-session`

**Barrel Files:**
- Backend modules re-export via `index.ts` — `export * from "./types"` / `"./service"` pattern in `apps/backend/src/modules/*/index.ts`
- Storefront generally imports concrete files; UI primitives may named-export from the component file itself

## Error Handling

**Patterns:**
- Backend domain/API errors: throw `MedusaError` with `MedusaError.Types.*` (`INVALID_DATA`, `NOT_FOUND`, `NOT_ALLOWED`, `CONFLICT`) from `@medusajs/framework/utils`
- Include ADR ids in error messages when the rule is decision-backed — e.g. `(ADR-0152)` in `apps/backend/src/modules/lifecycle/service.ts`
- Storefront domain errors: typed `Error` subclasses with category enums — `CartOperationError` in `apps/storefront/src/lib/medusa/cart-errors.ts`
- Map provider/HTTP failures to user-safe messages; never surface raw backend payloads in UI outcomes (`getCartActionErrorMessage`)
- Server actions return discriminated result objects instead of throwing to the client:
  ```typescript
  // apps/storefront/src/app/actions/cart-actions.ts
  try {
    await addLineItem(variantId, quantity)
    return { status: "success", message: "..." }
  } catch (error) {
    return getCartActionErrorMessage(error, "add")
  }
  ```
- Subscribers catch notification failures and log without rolling back the authoritative transition (`apps/backend/src/subscribers/order-placed.ts`, ADR-0124)
- Validation helpers return result unions (`{ ok: true; value } | { ok: false; fieldErrors }`) for form flows — `apps/storefront/src/lib/medusa/checkout-validation.ts`

**Do this:**
- Throw `MedusaError` at API/workflow boundaries for HTTP-mappable failures
- Classify storefront cart/checkout errors before returning action state
- Keep secrets and card data out of logs and notification payloads (use redaction helpers)

## Logging

**Framework:** Custom structured logger — `apps/backend/src/modules/observability/logger.ts`

**Patterns:**
- Use `StructuredLogger` / exported `logger` with levels `debug` | `info` | `warn` | `error`
- Always pass context through `redactSensitiveData`; pass errors through `sanitizeError` (`apps/backend/src/modules/observability/redaction.ts`)
- Emit JSON lines via `console.log` / `console.warn` / `console.error`
- Storefront config failures: `console.error` then throw `StorefrontConfigurationError` (`apps/storefront/src/lib/medusa/client.ts`)
- Subscriber failures: prefix with a clear tag — `[Notification Subscriber Error]`

## Comments

**When to Comment:**
- Document ADR-backed invariants next to the enforcing code — `(ADR-0148)`, `(ADR-0151)`, etc.
- Explain non-obvious safety rules (idempotency, compare-and-set, redaction, commerce isolation)
- Mark intentionally disabled legacy paths with the ADR that disabled them — e.g. `addCatalogItemAction` and ADR-0154 in `apps/storefront/src/app/actions/cart-actions.ts`

**JSDoc/TSDoc:**
- Use short JSDoc on public domain functions that encode policy — see `activatePolicy`, `validatePresentationBundle`
- Do not narrate obvious control flow

## Function Design

**Size:**
- Prefer focused pure functions for validation, projection, and gates (`validate*`, `project*`, `assert*`, `build*`)
- Stateful behavior lives in small service classes (`LifecycleActivationService`, `BulkImportExecutor`, `ImportOperationTracker`)

**Parameters:**
- Prefer typed input objects for multi-field operations — `ActivationOperationInput`, workflow `input: { order_id }`
- Form/server-action handlers take `(previousState, formData)` for React `useActionState` compatibility

**Return Values:**
- Prefer explicit result types over throwing for recoverable UI paths
- Gate/validation functions return `{ is_valid, errors, warnings }` or throw via `assert*` helpers when hard-fail is required

## Module Design

**Exports:**
- Named exports for functions, types, and constants
- Default export only for Medusa subscribers (`export default async function ...Handler`)
- Module public surface via `index.ts` barrels under `apps/backend/src/modules/<name>/`

**Domain layout (backend):**
- `types.ts` — interfaces and unions
- Pure logic files — `policy.ts`, `schema.ts`, `projection.ts`, `manifest.ts`
- `service.ts` / executors — mutable orchestration
- `__tests__/` — unit specs beside the module

**Domain layout (storefront):**
- `lib/medusa/` — SDK client, cart/checkout/products, validation, errors
- `lib/presentation/` — client presentation config and shipping copy
- `app/actions/` — server actions + action-state types
- `app/components/` — route-adjacent interactive UI
- `components/` — shared presentational components and `ui/` primitives

## Validation

**Backend env:**
- Zod via `@medusajs/framework/zod` in `apps/backend/src/config/environment.ts` — `runtimeEnvironmentSchema.parse(input)`
- Standalone `zod` package is listed but app code validates through the framework re-export / hand-rolled validators

**Domain validation:**
- Hand-rolled validators returning structured results for presentation, lifecycle policy, recovery manifests, promotion gates
- API body validation throws `MedusaError.Types.INVALID_DATA` early in route handlers

**Storefront forms:**
- String/identifier sanitizers — `getIdentifier`, `getPositiveSafeInteger` in `apps/storefront/src/lib/medusa/cart-validation.ts`
- Checkout field validators produce per-field error maps — `apps/storefront/src/lib/medusa/checkout-validation.ts`

## UI Conventions (Storefront)

- Compose class names with `cn()` (`clsx` + `tailwind-merge`) from `apps/storefront/src/lib/utils.ts`
- UI primitives follow shadcn-style `cva` variants — `apps/storefront/src/components/ui/button.tsx`
- Server Components default; mark interactive client components as needed
- Catalog/browse pages set `export const dynamic = "force-dynamic"`
- Prefer Medusa variant IDs for cart mutations; do not revive disabled catalog-demo add paths

## Architectural Comment Discipline

- Treat `TBD` in docs as undecided — do not invent requirements in code comments
- When encoding a decision, cite the ADR id in the comment or error string so tests can assert the same rule

---

*Convention analysis: 2026-11-01*
