# Testing Patterns

**Analysis Date:** 2026-11-01

## Test Framework

**Runner:**
- Backend unit + integration: Jest 29 with `@swc/jest` transform
  - Config: `apps/backend/jest.config.js`
  - Launcher: `apps/backend/scripts/run-tests.js` sets `TEST_TYPE` and runs Jest under `--experimental-vm-modules`
- Storefront unit: Node.js built-in test runner (`node:test`) + `node:assert/strict`
  - Script: `node --experimental-strip-types --test "src/**/*.test.mjs"` in `apps/storefront/package.json`

**Assertion Library:**
- Backend: Jest `expect`
- Storefront: `assert` from `node:assert/strict`

**Integration harness:**
- `@medusajs/test-utils` `medusaIntegrationTestRunner` for HTTP integration specs
- Setup: `apps/backend/integration-tests/setup.js` (IPv4-first DNS + MikroORM `MetadataStorage.clear()`)

**Run Commands:**
```bash
pnpm test                              # backend unit + storefront node:test
pnpm --filter @retail-starter/backend test:unit
pnpm --filter @retail-starter/backend test:integration:http
pnpm --filter @retail-starter/backend test:integration:modules
pnpm --filter @retail-starter/storefront test
pnpm test:integration:http             # root → backend HTTP integration
pnpm ci:verify                         # typecheck + lint + unit + HTTP integration + build
```

## Test File Organization

**Location:**
- Backend unit: co-located `apps/backend/src/**/__tests__/*.unit.spec.ts`
- Backend HTTP integration: `apps/backend/integration-tests/http/*.spec.ts`
- Storefront: co-located `apps/storefront/src/**/*.test.mjs` next to production modules
- Storefront loader helper: `apps/storefront/src/lib/medusa/test-support/load-module.mjs`

**Naming:**
- Backend unit: `<subject>.unit.spec.ts` (required — Jest `testMatch` for `TEST_TYPE=unit`)
- Backend HTTP: `<subject>.spec.ts` under `integration-tests/http/`
- Storefront: `<subject>.test.mjs` (often phase-tagged — `cart-phase5.test.mjs`, `checkout-phase7.test.mjs`)

**Structure:**
```
apps/backend/src/modules/<domain>/
  ├── *.ts
  └── __tests__/
      └── <domain-aspect>.unit.spec.ts

apps/backend/src/workflows/<domain>/
  └── __tests__/
      └── <workflow>.unit.spec.ts

apps/backend/src/api/**/
  └── __tests__/
      └── route.unit.spec.ts

apps/backend/integration-tests/http/
  └── <flow>.spec.ts

apps/storefront/src/lib/<area>/
  ├── <module>.ts
  └── <module>.test.mjs   # or area-level suite like cart-phase5.test.mjs
```

**Jest discovery rules (`apps/backend/jest.config.js`):**
- `roots`: only `<rootDir>/src` and `<rootDir>/integration-tests` (never `.medusa/`)
- `TEST_TYPE=unit` → `**/src/**/__tests__/**/*.unit.spec.[jt]s`
- `TEST_TYPE=integration:http` → `**/integration-tests/http/*.spec.[jt]s`
- `TEST_TYPE=integration:modules` → `**/src/modules/*/__tests__/**/*.[jt]s`

## Test Structure

**Suite Organization (backend):**
```typescript
// apps/backend/src/modules/lifecycle/__tests__/activation-service.unit.spec.ts
import { MedusaError } from "@medusajs/framework/utils"
import { LifecycleActivationService } from "../service"

describe("Lifecycle Activation Service and Concurrency/Idempotency Controls (ADR-0148-0152)", () => {
  it("blocks activation of an unapproved draft policy (ADR-0148, ADR-0149)", () => {
    expect(() => service.activatePolicy(input)).toThrow(MedusaError)
  })

  it("enforces compare-and-set concurrency control against stale activation requests (ADR-0151)", () => {
    expect(() => service.activatePolicy(stale)).toThrow(MedusaError)
  })
})
```

**Suite Organization (storefront):**
```javascript
// apps/storefront/src/lib/medusa/cart-phase5.test.mjs
import assert from "node:assert/strict"
import test from "node:test"

const { classifyCartError } = await import("./cart-errors.ts")

test("cart error mapping keeps backend details out of UI outcomes", () => {
  assert.equal(classifyCartError({ status: 404 }), "stale_reference")
  assert.deepEqual(getCartActionErrorMessage({ status: 409 }, "update"), {
    status: "error",
    message: "That quantity is not available. The cart was not changed.",
  })
})
```

**Patterns:**
- Describe blocks name the feature and cite ADRs when asserting decision-backed behavior
- Prefer behavior-focused `it`/`test` titles ("rejects an already-completed cart…") over implementation titles
- Use `beforeEach` to rebuild services and fresh `jest.fn()` pathway mocks
- HTTP integration suites use `beforeAll` for sales channels, regions, API keys via Medusa core workflows

## Mocking

**Framework:** Jest mocks on the backend; custom in-memory module loader on the storefront

**Backend patterns:**
```typescript
// Route unit test — mock workflow boundary
jest.mock("../../../../../../workflows/ensure-cart-payment-session", () => ({
  ensureCartPaymentSessionWorkflow: jest.fn(),
}))

const remoteQuery = jest.fn().mockResolvedValueOnce([{ id: "cart_test", /* ... */ }])
const req = {
  params: { id: "cart_test" },
  body: { provider_id: "pp_stripe_stripe" },
  publishable_key_context: { sales_channel_ids: ["sc_test"] },
  scope: { resolve: () => remoteQuery },
} as unknown as Parameters<typeof POST>[0]

await expect(POST(req, res)).rejects.toMatchObject({ type: "not_found" })
```

```typescript
// Service unit test — inject jest.fn pathway adapters
mockPathways = {
  createCategory: jest.fn().mockImplementation(async (cat) => ({
    id: `cat_${cat.handle}`,
    handle: cat.handle,
  })),
  // ...
}
executor = new BulkImportExecutor(tracker, mockPathways)
```

**Storefront patterns:**
```javascript
// apps/storefront/src/lib/medusa/test-support/load-module.mjs
const { createModuleLoader } = await import("./test-support/load-module.mjs")
const load = createModuleLoader(import.meta.url, { console: { error() {} } })

const { getOrCreateCart } = load("./cart.ts", {
  "server-only": {},
  "./client": { getMedusaClient: () => fakeClient, getMedusaPricingContext: () => ({ region_id: "reg_1" }) },
  "./cart-cookie": { readCartId: async () => "cart_completed", writeCartId: async (id) => {}, clearCartId: async () => {} },
})
```

**What to Mock:**
- Medusa workflows and container services at route/subscriber boundaries
- Domain pathway adapters (`createProduct`, notification `createNotifications`)
- Next.js / server-only boundaries (`server-only`, `next/headers`, cookie store)
- Medusa JS SDK client responses for cart/checkout lib tests

**What NOT to Mock:**
- Pure validators, projectors, redaction, and policy/schema functions — call them directly
- In-memory domain services under test (`LifecycleActivationService`, trackers) — construct real instances
- HTTP integration tests: use real Medusa workflows/`api` against the test runner DB

## Fixtures and Factories

**Test Data:**
```typescript
const sampleBatch: BulkImportBatchPayload = {
  version: "1.0",
  batch_id: "batch-prod-001",
  attribution: {
    principal_id: "admin-system",
    principal_type: "admin",
    source_interface: "admin_import",
    correlation_id: "corr-xyz",
  },
  categories: [{ name: "Electronics", handle: "electronics" }],
  products: [{ title: "Wireless Headphones", handle: "wireless-headphones", category_handles: ["audio"] }],
  // ...
}
```

**Location:**
- Inline fixtures inside the spec file (dominant pattern)
- Shared IDs often use Medusa-like prefixes — `cart_test`, `order_test_123`, `rt_prod_release_001`
- Storefront sometimes reads source text as a fixture (field-list contracts) via `node:fs/promises` + regex — e.g. asserting `cartFields` includes `completed_at`

## Coverage

**Requirements:** None enforced via Jest/Istanbul coverage thresholds

**View Coverage:** Not configured — no `collectCoverage` / coverage scripts in package manifests

**Practical gate:** `pnpm ci:verify` requires typecheck, lint (backend), unit tests (both apps), HTTP integration tests, and build — treat green CI as the release bar, not line coverage %

## Test Types

**Unit Tests:**
- Backend: pure module logic, workflows' exported helpers, route handlers with mocked deps, subscribers with mocked workflows
- Storefront: validation, error mapping, presentation config merges, cart/checkout helpers via `createModuleLoader`
- Prefer deterministic, in-process tests — no network

**Integration Tests:**
- HTTP: `apps/backend/integration-tests/http/ensure-cart-payment-session.spec.ts`
  - Uses `medusaIntegrationTestRunner`, `jest.setTimeout(180_000)`, core-flows to seed channels/regions/keys
  - Exercises real `api.post('/store/carts/:id/payment-session', ...)` against scoped publishable keys
- Modules integration script exists (`test:integration:modules`) but unit naming remains the primary module coverage path

**E2E Tests:**
- Not used — no Playwright/Cypress suite in the repository
- Browser/manual evidence lives in docs; do not assume automated browser coverage when adding features

## Common Patterns

**Async Testing:**
```typescript
await expect(POST(req, res)).rejects.toMatchObject({ type: "not_found" })
expect(ensureCartPaymentSessionWorkflow).not.toHaveBeenCalled()
```

**Error Testing:**
```typescript
expect(() => createRecoveryManifest(invalidParams)).toThrow(MedusaError)
expect(() => service.activatePolicy(conflictInput)).toThrow(MedusaError)
```

**Idempotency / replay:**
```typescript
await executor.executeBatch("op-replay-1", sampleBatch)
await executor.executeBatch("op-replay-1", sampleBatch)
expect(mockPathways.createCategory).toHaveBeenCalledTimes(2) // unchanged on replay
```

**Redaction / safety:**
```typescript
expect(result.customerNotification?.data.metadata?.cardNumber).toBe("[REDACTED]")
```

**Source-contract checks (storefront):**
- When a string field list must stay explicit, tests may parse the `.ts` source to assert required fields remain present — use sparingly and keep the assertion tight

## How to Add Tests

**New backend module logic:**
1. Add `apps/backend/src/modules/<domain>/__tests__/<aspect>.unit.spec.ts`
2. Import the real module; mock only external pathways
3. Name the suite with ADR ids when asserting decision-backed gates
4. Run `pnpm --filter @retail-starter/backend test:unit`

**New API route:**
1. Co-locate `__tests__/route.unit.spec.ts`
2. `jest.mock` workflows; stub `req.scope.resolve` / `remoteQuery`
3. Assert `MedusaError` shape with `rejects.toMatchObject({ type: "..." })`

**New storefront lib behavior:**
1. Add or extend `*.test.mjs` beside the module
2. Use direct `await import("./file.ts")` for pure modules
3. Use `createModuleLoader` when the module imports `server-only`, Next cookies, or the Medusa client
4. Stub every relative dependency explicitly — unstubbed relative imports throw

**New HTTP contract:**
1. Add `apps/backend/integration-tests/http/<flow>.spec.ts`
2. Seed with Medusa core-flows; call `api` with publishable key headers
3. Keep timeout generous (`jest.setTimeout(180_000)`) for cold runner startup

---

*Testing analysis: 2026-11-01*
