# Retail Starter Implementation Plan

## Status and approach

> **Current status:** Phases 1-7 are implemented (Medusa/PostgreSQL baseline,
> catalog, persistent cart, guest checkout, Stripe test-mode payment, and
> authoritative order confirmation/reconciliation). V1 is not complete; Phases
> 8-17 remain planned/incomplete. The phase sections below are retained as the
> plan and implementation record.

This plan is derived from the accepted architecture baseline in
`docs/architecture.md`, the approved ADR index, and `docs/scope-v1.md`. It is a
dependency-ordered implementation plan. The initial framework, runtime, and
package-manager baseline is recorded in the pre-implementation gate below;
other choices that the architecture deliberately leaves open remain deferred.

Implementation should proceed as a sequence of reviewable vertical slices. The
Medusa backend remains the authority for commerce, operational state, provider
outcomes, and recovery records. The Next.js application remains a thin,
server-first presentation and interaction boundary. Infrastructure and
hardening work should be introduced when a slice needs it, while production
hardening continues after the first local commerce milestones.

No application code, dependency, deployment, or production configuration is
authorized by this document alone.

## Scope

### In scope

- The two-application V1 repository boundary and its local development model.
- The catalog-to-cart slice and the complete guest purchase flow.
- Medusa-owned catalog, cart, checkout, payment, order, inventory,
  fulfillment, refund, notification, media, import, recovery, and lifecycle
  capabilities required by V1.
- Client-isolated configuration, release, deployment, backup, restore, and
  production-readiness evidence.
- Grouped implementation of the accepted ADRs without turning every ADR into a
  separate project or authority.

### Out of scope

- Customer accounts, advanced search, marketing automation, analytics,
  subscriptions, B2B, marketplaces, complex ERP/POS integrations, live
  carrier rates, extra payment providers, and other exclusions in
  `docs/scope-v1.md`.
- A general-purpose BFF, separate commerce service, custom worker application,
  external queue, integration gateway, operations service, or analytics
  platform.
- Production deployment, publication, client onboarding, or data mutation
  until the relevant implementation and approval gates have passed.

## Pre-implementation decision gate

The architecture boundary is accepted. Before Phase 1 starts, decide only the
choices needed to create and verify the repository skeleton:

1. Select mutually compatible Next.js, Medusa, PostgreSQL, runtime, SDK, and
   package-manager versions.
2. Select the workspace layout and development commands while preserving the
   two-application boundary and minimal shared-package rule.
3. Select the initial test and verification toolchain and its repeatable local
   commands.
4. Select the local environment isolation and secret/configuration mechanism
   for development without committing credentials.

The local PostgreSQL runner, object-storage development strategy, email test
provider or sink, hosting topology, production provider wiring, observability
stack, and exact Medusa lifecycle sequence become necessary at later gates;
they do not all need to be chosen before the skeleton can be created. Any
choice that is required earlier by the selected versions must be recorded as a
phase decision before that phase starts.

### Approved initial toolchain baseline

The first pre-implementation toolchain/version gate approves the following
compatibility baseline for initial implementation and Phase 1 scaffolding:

| Component | Approved baseline |
| --- | --- |
| Node.js | 22.23.2 LTS |
| Node engine policy | `>=22.12.0 <23` |
| Package manager | pnpm 10.11.1 |
| Medusa | 2.21.0 |
| Next.js storefront | 15.5.24 |
| Storefront React / React DOM | 19.0.5 |
| Dependency resolution | A committed `pnpm-lock.yaml` |

These versions are intentionally pinned for the initial implementation. Any
later upgrade must follow the approved versioned-core, compatibility-test, and
promotion process described by ADRs 0026, 0052, and 0086; newer versions are
not adopted solely because they are available. In particular, Next.js 16 is
deferred until a later tested core-release evaluation.

The baseline follows the currently demonstrated official Medusa DTC starter
compatibility set. Medusa 2.21.0 is selected as the stable release for this
baseline, including its recent Store API security hardening. Node.js 22 LTS is
selected instead of Node.js 24 because it is explicitly within Medusa's
documented supported prerequisite range and reduces runtime variability while
the first commerce flow is established.

The official Medusa DTC starter is a compatibility and reference source, not
the Retail Starter product specification. Initial scaffolding must not add
starter functionality outside V1, including customer accounts or customer
order history. TypeScript, React, Medusa support packages, testing libraries,
and other transitive or tooling dependencies must not be manually normalized
or upgraded beyond the compatible starter baseline unless an identified
incompatibility requires it. Dependency changes remain subject to the
committed lockfile and the relevant verification gate.

This gate records the implementation choice only; it does not authorize
application scaffolding or dependency installation by itself.

### Phase 1 scaffolding implementation choice

Phase 1 uses Approach B: a supported Medusa backend scaffold paired with a
minimal Next.js storefront. The backend is imported from the pinned Medusa
2.21.0 reference scaffold, while the storefront starts as a minimal Next.js
15.5.24 App Router application using React and React DOM 19.0.5. The full
Medusa DTC storefront remains reference material only and is not imported.

The repository uses pnpm workspaces initially. Turbo is intentionally excluded
until workspace task orchestration or caching is justified by implementation
evidence. No `packages/` directory is created until a real shared package has
an approved cross-application use case. Phase 1 contains only the two
applications; it does not add a BFF, worker application, webhook gateway, or
separate admin application.

## Dependency map and milestones

The critical dependency chain is:

`1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9`

Phases 10–16 extend the core flow and establish operational readiness. Phase
17 is the final V1 release gate. Phases 10–15 may overlap only when their
prerequisites and authority boundaries are explicit; they must not introduce a
second commerce or operational authority.

| Milestone | Available after | Demonstrable outcome |
| --- | --- | --- |
| First usable local slice | Phase 5 | `catalog → product → cart`, including cart reload through the secure opaque Medusa cart reference and backend revalidation. |
| Core purchase flow | Phase 7 | `catalog → cart → guest checkout → Stripe test payment → authoritative order → browser confirmation`. |
| First complete V1 purchase milestone | Phase 8 | The core purchase flow plus durable order-confirmation and administrator notification work, with retry-safe delivery evidence. |
| Production-readiness candidate | Phase 16 | Core commerce, recovery, lifecycle, configuration, security, and client-policy gates are satisfied; Phase 17 still performs final cross-system verification. |

The first two milestones must not wait for bulk onboarding, production
promotion, a real client lifecycle policy, or every observability and recovery
hardening capability. Their own correctness and safety evidence remains
mandatory.

## Phase 1 — Repository and application skeleton

### Objective

Create the smallest runnable repository shape for the Next.js storefront and
Medusa backend, with typed configuration boundaries and repeatable development
commands.

### Architecture and ADRs implemented

ADRs 0001, 0034, 0035, 0050, 0063, 0096, 0115, and 0116 establish the
two-application boundary, extension-only Medusa customization, minimal shared
packages, split configuration ownership, and fail-fast configuration
validation.

### Concrete repository changes

- Add the selected root workspace manifests and development commands.
- Add the storefront application boundary and the Medusa backend application
  boundary without creating a BFF or shared commerce authority.
- Add only shared types or utilities that have an immediate cross-boundary
  justification; keep commerce logic in Medusa.
- Add typed environment/configuration parsing owned by each application,
  redacted configuration diagnostics, safe public configuration projection,
  and example configuration files containing no secrets.
- Add the initial local/test command documentation and a minimal contribution
  or developer workflow note if the selected toolchain requires it.

### Dependencies and prerequisites

- The pre-implementation decision gate is complete.
- The repository remains documentation-only until this phase is explicitly
  started.

### Acceptance criteria

- Both applications start independently with valid local configuration.
- Missing or malformed required configuration fails before normal service.
- Backend-only secrets and private configuration cannot be imported by the
  storefront browser bundle.
- The repository has no direct storefront-to-database path and no second
  commerce model.
- The commands and version assumptions are documented and reproducible.

### Tests and evidence before proceeding

- Configuration parser unit tests cover valid, missing, malformed, and
  cross-boundary values.
- Startup smoke tests prove both application boundaries and safe public
  projection.
- A dependency and secret scan confirms no committed credential or unintended
  private import.
- The selected formatter, linter, type checker, and test command pass.

### Intentionally deferred

- Concrete hosting, CDN/DNS, provider SDK wiring, production topology, and
  production observability.
- Medusa checkout sequencing, media implementation, and client-specific
  commerce data.

## Phase 2 — Local infrastructure

### Objective

Provide isolated local dependencies and readiness foundations that support
real Medusa persistence and safe development without implying a production
deployment choice.

### Architecture and ADRs implemented

ADRs 0004, 0008, 0024, 0038, 0050, 0063, 0109, 0110, and 0111 establish one
dedicated PostgreSQL database per client deployment, isolated media storage,
runtime-secret separation, client isolation, fail-fast validation, readiness
classification, and durable shutdown.

### Concrete repository changes

- Add the selected local PostgreSQL provisioning and reset/seed procedure.
- Keep any local object-storage substitute optional and isolated until the
  later media phase; do not add it to the backend runtime path.
- Add isolated per-environment configuration templates and safe test fixtures.
- Add backend liveness, readiness, and database capability health foundations
  with dependency classification.
- Add startup and shutdown hooks that do not silently discard durable work.

### Dependencies and prerequisites

- Phase 1 application boundaries and configuration validation.
- A selected local database runner and object-storage development strategy.

### Acceptance criteria

- A fresh local environment can provision isolated PostgreSQL without shared
  client state.
- Readiness distinguishes mandatory database failure from later optional
  provider capabilities without making those providers mandatory.
- Restart and graceful shutdown preserve the state needed for later recovery.
- No local fixture or environment file contains a real credential.

### Tests and evidence before proceeding

- Fresh-environment provisioning and teardown/recreate checks.
- Database connectivity, migration bootstrap, readiness, liveness, and
  capability-health tests.
- Forced restart/shutdown tests showing durable work is recoverable or safely
  reclassified.
- Isolation check proving one client configuration cannot address another
  client’s local resources.

### Phase 2 local implementation

Retail Starter local infrastructure is provisioned by the isolated Compose
project at `infra/docker-compose.yml`. PostgreSQL 16 publishes host port
`5433` to container port `5432`; the backend development URL is therefore
`postgres://retail_starter:retail_starter_local@localhost:5433/retail_starter_dev`.
The existing `erasmusjourney-postgres` container is outside this Compose
project and is not stopped, modified, or reused. PostgreSQL is the default
Phase 2 dependency. MinIO remains available only through the explicit
`media` Compose profile as an optional local development environment reserved
for the later media phase; it is not wired into Medusa or backend health,
readiness, tests, or builds. The backend exposes separate liveness, readiness,
and database capability health routes, and migrations remain an explicit
`pnpm db:migrate` operation.

### Intentionally deferred

- Production hosting, topology, CDN/DNS, backup provider, and exact object
  storage service.
- Final email and observability providers.

## Phase 3 — Medusa commerce baseline

### Objective

Establish Medusa as the working commerce authority with a usable Admin and
Store API baseline for V1 catalog and checkout prerequisites.

### Architecture and ADRs implemented

ADRs 0003, 0011, 0012, 0027, 0034, 0036, 0055, 0057, 0098, 0099, 0101, 0102,
0137, 0138, and 0139 cover Medusa-first implementation, standard Admin,
configured shipping/tax, basic search, controlled migrations, extension-only
customization, and shared domain pathways for Admin and automation.

### Concrete repository changes

- Initialize the selected Medusa application and compatible database schema
  migration path.
- Configure product, variant, price, currency, region, inventory, category,
  basic search, shipping-zone/fee, local-pickup, and configured-tax
  capabilities required by the V1 fixture.
- Enable Medusa Admin with native authentication and the single basic admin
  access level.
- Define the initial Store API configuration and backend-owned structured
  outcome mapping needed by the storefront.
- Add deterministic development catalog and commerce fixtures through
  supported Medusa pathways.

### Dependencies and prerequisites

- Phases 1 and 2.
- The selected Medusa version must be checked for the required Admin, Store
  API, migration, inventory, shipping, tax, and search capabilities.

### Acceptance criteria

- An authorized operator can create and manage the fixture catalog through
  Medusa Admin or the approved backend pathway.
- The Store API returns current product, category, price, currency, inventory,
  shipping, and tax facts without exposing private/admin authority.
- Migration execution is versioned with the compatible core release and is not
  performed by Next.js.
- Commerce operations use Medusa services/workflows/modules rather than direct
  application SQL.

### Tests and evidence before proceeding

- Migration bootstrap, repeatability, and compatibility checks.
- Store API contract/integration tests for catalog, price/currency, inventory,
  region, shipping, tax, and basic search.
- Admin authorization tests and a browser smoke check for the native Admin.
- A fresh local database can be recreated from the documented procedure and
  deterministic fixtures.

### Intentionally deferred

- Client production catalog data and final pricing/shipping/tax values.
- Checkout/payment/reservation ordering beyond the verified baseline needed
  by the next phases.

### Phase 3 implementation evidence

Verified locally on 2026-09-20 against the Medusa 2.21.0 backend, PostgreSQL,
and native Medusa Admin. The local database was inspected before mutation. It
already contained the `Medusa Store` record, one EUR currency, one enabled
`Default Sales Channel`, one active default publishable API key already scoped
to that sales channel, and the built-in `Manual` fulfillment provider. It had
no region, stock location, tax region, shipping option type, service zone,
shipping option, or product. The suitable default sales channel and
publishable key were reused rather than duplicated.

The local commerce baseline was configured through Medusa Admin:

- The reused sales channel was renamed `Development Web Store` (`sc_01M2Z57MFRYW86MF0Q0YXDB901`) and kept enabled.
- The region `Development Cyprus Region` (`reg_01M2ZDEB8NDDYRJMDA86HMG545`) uses EUR and country CY. Store defaults now point to this region, the development sales channel, and the development stock location.
- `Development Warehouse` (`sloc_01M2ZDHM6931Q1VJ8BA80ZVDQR`) is in Cyprus, is connected to the sales channel, and is the only stock location in the fixture.
- The native `Manual` fulfillment provider is connected to the stock location. Shipping is enabled with `Development Cyprus Shipping Zone`, one `Development Standard Delivery` fixed option priced at EUR 5.00 in the default shipping profile, and one required `Development Delivery` option type. The option is enabled for storefront use.
- The tax fixture is the system tax provider for Cyprus with `Development Tax Rate` at 19.00%. This is development-only fixture data and is not a statement of the client's legal tax obligation or production tax configuration.
- The reused publishable key is titled `Development Storefront` (`apk_01M2Z57N1XS7AXD8KSCPVJBTSX` in local Admin evidence); its token is intentionally omitted here and it is scoped to exactly the `Development Web Store` channel. No secret/admin key was used for Store API verification.
- The published product is `Development Physical Goods Test Product` (`prod_01M2ZDX09C2DVTPASCCQ9ZDE1J`) with one `Default variant` (`variant_01M2ZDX0DWEPJK5HJASQKQHN81`), SKU `DEV-PHYSICAL-001`, EUR 25.00 pricing for the development region, the default shipping profile, managed inventory enabled, and availability in the one development sales channel.
- The variant's inventory item (`iitem_01M2ZDX0EMWQMX4AGF059VE5PR`) is stocked at the development warehouse with a retained finite quantity of 7. The product is published; no media, catalog seed, promotion, customer account, or second variant was added.

Store API evidence used a raw HTTP request with the explicit region and sales
channel context. The request without `x-publishable-api-key` returned HTTP 400
`not_allowed` with the message that a publishable key is required. The same
`GET /store/products` request with the redacted local publishable key returned
HTTP 200, one product, the expected published product and variant, `eur`
currency, a backend-calculated amount of 25, `manage_inventory: true`, and
`inventory_quantity: 7`. Medusa's Store API projected the aggregate inventory
for the channel; the Admin record independently showed that the quantity came
from the one sales-channel-linked warehouse.

The authority propagation check changed the warehouse quantity through Admin
from 7 to 5. The next keyed Store API read returned `inventory_quantity: 5`.
Admin then restored the retained fixture value to 7, and a final keyed read
returned 7 and EUR 25. This demonstrates `Admin mutation -> Medusa/PostgreSQL
authority -> Store API projection` without storefront state or a cache.

The database initially had no admin user despite the expected Phase 2
prerequisite. A supported `medusa user` bootstrap command was therefore used
only to create local Admin access; no commerce data was created by the command,
no direct SQL write was used, and all commerce mutations above were performed
in Admin. The first generated local bootstrap account's password was not
persisted, so a second known local development admin was created to continue
the verification. This is a local-environment cleanup item, not a committed
application or commerce fixture.

No repository seed, custom module, workflow, mutation route, import path,
Medusa SDK, Stripe, email, Redis, object-storage, carrier/live-rate, external
tax, search, customer-account, worker, webhook, BFF, or storefront catalog
integration was introduced. The SDK and all storefront Store API work remain
intentionally deferred to Phase 4.

## Phase 4 — First storefront catalog vertical slice

### Objective

Deliver a server-first, public catalog experience that renders current Medusa
commerce facts and owns presentation, navigation, and SEO without becoming a
commerce authority.

### Architecture and ADRs implemented

ADRs 0018, 0019, 0023, 0025, 0028, 0051, 0053, 0064, 0065, 0112–0118, and
0139–0142 cover basic backend-owned search, the thin public Store API boundary,
hybrid server-first integration, restricted browser origins, separate CORS and
CSRF controls, structured outcomes, selective caching, SEO, and versioned
presentation content.

### Concrete repository changes

- Implement catalog, category/navigation, basic search, and product-detail
  routes in Next.js using the typed public Store API boundary.
- Add initial route metadata, canonical URLs, sitemap/robots behavior, and
  structured presentation markup as appropriate.
- Add safe read caching only for catalog, category, search, navigation, and
  static presentation data; make freshness/revalidation explicit.
- Add the initial client-safe error and capability-outcome projection.
- Add browser-origin allow-list, CORS, and CSRF configuration at the agreed
  boundary without exposing private backend credentials.

### Dependencies and prerequisites

- Phase 3 catalog and Store API baseline.
- The public origin and local development origin must be known for the test
  environment; this is not the production origin decision.

### Acceptance criteria

- A user can browse categories, search basic product data, open a product, and
  see current price/currency and availability.
- Cached presentation reads never determine cart, checkout, payment, order,
  inventory, shipping, or tax correctness.
- Browser requests cannot reach Medusa private/admin APIs or the database.
- SEO output is generated by Next.js and does not invent a competing product
  identity.

### Tests and evidence before proceeding

- Storefront integration tests against the local Store API.
- Cache-boundary tests proving safe reads may cache and correctness-sensitive
  mutations/reads do not use stale authority.
- Browser checks for navigation, search, product rendering, origin controls,
  keyboard access, and representative responsive layouts.
- Metadata and structured-presentation assertions for representative routes.

### Intentionally deferred

- Full branding/content bundle and client media workflow.
- Checkout interactions and guest cart state.

### Phase 4 implementation evidence

The first storefront vertical slice was implemented on 2026-09-20 with the
approved server-first boundary. The storefront uses
`@medusajs/js-sdk@2.21.0` and `@medusajs/types@2.21.0` only in
`apps/storefront`. `src/lib/medusa/client.ts` validates the four required
server-side environment variables and creates the single SDK client with the
Medusa backend URL and publishable key. No admin/secret credential, database
connection, BFF, browser Store API client, or authentication configuration was
added.

The local environment uses `MEDUSA_BACKEND_URL`,
`MEDUSA_PUBLISHABLE_KEY`, `MEDUSA_REGION_ID`, and `MEDUSA_COUNTRY_CODE` in the
ignored `apps/storefront/.env.local`; the committed `.env.example` contains
placeholders only. Product reads in `src/lib/medusa/products.ts` always pass
the configured region and country context and request
`*variants.calculated_price,+variants.inventory_quantity`. Reads use fresh
server rendering (`dynamic = "force-dynamic"`); no persistent Store API cache,
TTL, or revalidation layer was introduced.

The observed 2.21.0 Store API response for the existing development product
was:

- handle `development-physical-goods-test-product`;
- one variant, SKU `DEV-PHYSICAL-001`, with `manage_inventory: true`;
- `calculated_price.calculated_amount: 25` and
  `calculated_price.currency_code: "eur"`;
- `calculated_price.raw_calculated_amount.value: "25"` with precision `20`;
- no `calculated_amount_with_tax` field in this configured response; and
- `inventory_quantity: 7`.

The formatter passes the backend numeric amount and explicit currency code
directly to `Intl.NumberFormat` with no cents, tax, discount, or FX arithmetic.
If Medusa supplies `calculated_amount_with_tax`, that backend value is used;
otherwise the returned calculated amount is displayed only when it is valid.

Implemented routes and presentation behavior:

- `/products` is a React Server Component route with title, subtitle, backend
  calculated price, inventory state, and keyboard-accessible links.
- `/products/[handle]` retrieves by the supported Store API handle filter and
  shows title, optional description, the current fixture variant/SKU, price,
  and inventory state. It has no quantity control, cart, checkout, account,
  payment, or customer-session behavior.
- Missing prices render `Price unavailable`; missing inventory renders
  `Availability unavailable`; unavailable Store API/configuration failures use
  a customer-safe error boundary with safe diagnostic logging.
- Next metadata is defined for the catalog and generated from authoritative
  product presentation data for detail pages. Missing products receive
  `noindex` metadata and the route returns Next not-found behavior.
- The shell navigation contains only Home and Products.

Runtime evidence from the local production `next start` server on 2026-09-20:

- `/` -> HTTP 200;
- `/products` -> HTTP 200, rendered the product title, `€25.00`, and `In
  stock`;
- `/products/development-physical-goods-test-product` -> HTTP 200, rendered
  the product title, `€25.00`, SKU, and `In stock`;
- `/products/not-a-real-product` -> HTTP 404 with the safe not-found page; and
- rendered HTML did not expose the publishable token or backend URL.

The authority propagation check used Medusa native Admin to change the linked
development warehouse quantity from 7 to 0. The next keyed Store API read
returned `inventory_quantity: 0`, and a refreshed product-detail request
rendered `Out of stock`. Admin then restored the quantity to 7, and a final
keyed Store API read returned 7. No manual cache purge was required. An Admin
price mutation was not run in this slice; the price read and rendering path
were verified against the existing EUR 25 response.

The Phase 4 slice intentionally does not add category/search routes, full
structured product markup, sitemap/robots automation, media integration,
cache revalidation, or any Phase 5 guest-cart behavior. Those remain outside
this first catalog/product-detail implementation boundary.

## Phase 5 — Guest cart

### Objective

Add the first end-to-end commerce mutation: a secure, Medusa-owned guest cart
that survives normal navigation and is revalidated before purchase.

### Architecture and ADRs implemented

ADRs 0020, 0030, 0054, 0056, 0078, 0079, 0112–0114, and 0119 cover Medusa cart
authority, opaque continuity, active-cart repricing/revalidation, durable
reservation boundaries, structured outcomes, and safe public projection.

### Concrete repository changes

- Add cart creation, opaque continuity, reload, add, update, remove, and empty
  states through the public Store API.
- Keep cart contents, prices, customer data, payment state, and authority out
  of the continuity reference.
- Add backend/Store API outcome categories for unavailable variants, changed
  prices, invalid quantities, expired/invalid carts, and safe retry behavior.
- Add the storefront cart UI and recovery paths without a second client cart
  model.

### Dependencies and prerequisites

- Phases 2–4.
- The selected Medusa cart and inventory behavior must be verified against the
  selected version.

### Acceptance criteria

- A user can go from catalog to product to cart and add/update/remove items.
- A page reload continues the same valid cart through the opaque reference.
- Lost or invalid continuity does not reconstruct authority from browser
  storage.
- Price, quantity, variant, and availability changes produce structured,
  understandable outcomes and do not silently submit stale totals.
- Concurrent or retried mutations do not create duplicate cart effects.

### Tests and evidence before proceeding

- Integration tests for all cart mutations, reload, invalid continuity,
  repricing, availability changes, and retry/idempotency behavior.
- Browser flow evidence for `catalog → product → cart`, including refresh and
  mobile layout.
- A fresh-process/restart check confirms cart behavior relies on Medusa state,
  not process-local memory.

### Intentionally deferred

- Guest delivery/contact data, payment, order completion, and notifications.

### Milestone gate — first usable local slice

The repository must now demonstrate `catalog → product → cart` locally with
real Medusa persistence, public Store API calls, opaque cart continuity, and
backend revalidation. This is the first user-visible vertical slice.

### Phase 5 implementation evidence

The Phase 5 guest-cart slice was implemented and exercised locally on
2026-09-20 against Medusa 2.21.0, the development PostgreSQL database, and the
existing development product fixture. Phase 5 remains intentionally
uncommitted pending review.

- Continuity uses one server-only session cookie named `retail_cart_id`. It is
  an opaque Medusa cart reference only; it has `HttpOnly`, `SameSite=Lax`,
  `Path=/`, no explicit domain, and no `Max-Age`/persistent lifetime. Local
  HTTP uses `Secure=false`; production configuration uses `Secure=true`. No
  cart contents, customer data, prices, totals, inventory, or browser-storage
  copy is stored in the cookie. The browser-side audit could not read the
  reference through `document.cookie`, consistent with the `HttpOnly` policy;
  source audit found no `localStorage` or `sessionStorage` usage.
- Cart creation is lazy: no cart is created by visiting `/cart`. The first
  Add to Cart mutation calls `sdk.store.cart.create` with only the configured
  `MEDUSA_REGION_ID` in the request body and requests `*items`; currency is
  derived by Medusa from the region and no sales-channel ID is hard-coded.
- The server-only Medusa boundary uses `retrieve`, `create`,
  `createLineItem`, `updateLineItem`, and `deleteLineItem`. Server Actions
  validate variant IDs, line-item IDs, and positive safe-integer quantities,
  read the cart reference only from the HttpOnly cookie, and return safe
  UI outcomes rather than raw SDK errors. No Next.js API/BFF route or direct
  database access was added.
- The browser milestone passed: `/products` → the development product → Add
  to Cart → `/cart` → quantity `1` to `2` → remove. Add, read, update, remove,
  and reload requests returned HTTP 200. The inventory-conflict update was
  rejected by Medusa with HTTP 400 and the observed message
  `Some variant does not have the required inventory`; the quantity remained
  unchanged and the storefront showed recoverable feedback.
- The authoritative cart response exposed `currency_code=eur`, product/line
  title, `variant_title=Default variant`, `variant_sku=DEV-PHYSICAL-001`,
  `quantity`, `unit_price`, line `total`/`item_total`, and cart `subtotal` and
  `total`. The cart rendered these backend fields through the existing money
  formatter and did not calculate authoritative totals in Next.js.
- A controlled stale reference rendered a safe empty/unavailable cart without
  reconstructing state. The next Add to Cart first received Medusa HTTP 404,
  created a replacement cart, replaced the cookie, and completed the add.
  With Medusa stopped, the same valid reference rendered a safe temporary
  unavailability state rather than being treated as stale; after Medusa was
  restarted with PostgreSQL retained, the cart and totals were available again.
- Navigation away, refresh, a Next.js process restart, and a Medusa process
  restart all preserved the cart through the browser cookie and PostgreSQL.
  Persistent cross-session cart lifetime remains a later policy/UX decision.
- Automated local tests cover cookie-option construction, identifier and
  quantity validation, error classification, and safe action outcomes. The
  real integration path exercised was Next.js → Medusa Store API → PostgreSQL;
  no checkout, shipping, customer/contact, payment, order, reservation,
  authentication, Redis, object storage, email, or custom cart workflow was
  introduced.

## Phase 6 — Guest checkout foundation

### Objective

Extend the Medusa-owned cart into a guest checkout state that collects the
minimum customer/contact and delivery data, calculates configured shipping and
tax, and prepares a revalidated payment-ready state.

### Architecture and ADRs implemented

ADRs 0022, 0044, 0045, 0060, 0068, 0069, 0078–0080, 0132–0137, and 0144 cover
guest customer/order data, concurrency and idempotency, explicit monetary
context, reservations, checkout-completion authority, transaction snapshots,
configured shipping/tax, and guest-only access.

### Concrete repository changes

- Add guest contact and delivery forms with server-side validation and
  structured field-level outcomes.
- Add shipping selection, local pickup where configured, tax calculation, and
  repricing through Medusa.
- Add checkout state persistence and recovery without creating customer login,
  reusable order credentials, or public order lookup.
- Verify the selected Medusa version’s payment-session, reservation, shipping,
  tax, and completion extension points before implementing the authoritative
  workflow.
- Define the transaction-time order snapshot inputs without duplicating the
  order model in Next.js.

### Dependencies and prerequisites

- Phase 5 guest cart.
- A selected Medusa version and a version-specific lifecycle spike proving the
  required checkout extension points.
- Development region, currency, shipping, and tax fixture values.

### Acceptance criteria

- A guest can provide valid contact/delivery information and choose an
  available configured shipping or pickup option.
- Medusa, not the browser, owns current shipping, tax, currency, totals,
  reservation, and checkout validity.
- Invalid or changed checkout state returns structured issues and safe recovery
  actions.
- No order is created merely by opening checkout or by a stale browser retry.
- No reusable post-purchase lookup credential is introduced.

### Tests and evidence before proceeding

- Integration tests for validation, shipping, pickup, tax, repricing, currency,
  availability, reservation, concurrent updates, and recovery.
- Version-specific lifecycle evidence for the selected Medusa checkout path.
- Browser tests for guest checkout form recovery and responsive keyboard use.
- Assertions that authoritative monetary fields always carry explicit currency
  context and are not recalculated in Next.js.

### Intentionally deferred

- Stripe client payment interaction and provider ambiguity handling, which are
  Phase 7 responsibilities.
- Final client shipping/tax policy and lifecycle policy.

### Phase 6 implementation evidence

The Phase 6 guest-checkout foundation is implemented in the storefront working
tree on 2026-09-21 and remains intentionally uncommitted pending review and
the full verification gate. The runtime evidence below was collected against
the local Medusa 2.21.0 fixture with PostgreSQL running on host port 5433.

- `/checkout` is a force-dynamic, server-first route. It reads the existing
  `retail_cart_id` HttpOnly cookie, retrieves the authoritative cart, redirects
  missing, stale, or empty carts to `/cart`, and shows a recoverable state when
  Medusa is unavailable. Visiting the route never creates a cart.
- The checkout collects only email, first name, last name, address line 1,
  city, postal code, and country. It does not collect phone, company, date of
  birth, marketing consent, password, address line 2, or province. Form values
  are not written to localStorage or sessionStorage.
- Server-side validation trims obvious whitespace, bounds each field, checks a
  syntactically valid email, and accepts a country only after retrieving the
  current cart region through `sdk.store.region.retrieve(regionId, { fields:
  "id,*countries" })`. The submitted country is compared with those region
  countries and sent to Medusa only after validation; no universal `CY` rule is
  hard-coded.
- Contact/address persistence uses the installed `@medusajs/js-sdk@2.21.0`
  signature `sdk.store.cart.update(cartId, body, query)`. The body sends the
  validated email and the same validated address object as both
  `shipping_address` and `billing_address`. The cart ID is read only from the
  HttpOnly cookie and never from FormData.
- Shipping retrieval uses the installed signature
  `sdk.store.fulfillment.listCartOptions({ cart_id: cartId })`. The selected
  option ID is checked against a fresh cart-scoped list before the installed
  `sdk.store.cart.addShippingMethod(cartId, { option_id }, query)` operation is
  called. Next.js never submits an authoritative shipping amount.
- The UI renders only Medusa-returned shipping options and cart monetary fields.
  It reads item subtotal/tax/total, shipping subtotal/tax/total, cart subtotal,
  cart tax total, cart total, selected shipping method, and explicit currency;
  it performs no shipping, tax, or total arithmetic. A missing required value
  renders an unavailable state.
- Same-origin Next.js Server Actions remain the mutation boundary. No broad
  `allowedOrigins` configuration, custom CSRF token, payment collection,
  payment session, provider listing, cart completion, order creation, customer
  account, or custom checkout backend workflow was introduced.
- Focused automated tests cover contact/address validation, region-country
  rejection, safe error mapping, stored-address completeness, authoritative
  presentation states, and required monetary-field checks. The browser runtime
  also exposed a client-side invalid-field recursion: the invalid event handler
  now reads `field.validity.valid` instead of calling `checkValidity()` again.
  Empty-country submission is consequently blocked by native required-field
  validation without a render-loop error.

### Phase 6 local runtime verification

The following evidence was collected on 2026-09-21 using the repository's
Node.js 22.23.2 and pnpm 10.11.1 shim. Only the PostgreSQL container was
started by `pnpm infra:up`; MinIO and Redis were not started. Medusa used its
documented local in-memory fallback for Redis because no `redisUrl` was
configured.

- PostgreSQL became healthy on `localhost:5433`. Medusa started on port 9000;
  `/health`, `/health/liveness`, `/health/readiness`, and `/app` returned 200.
  Readiness reported both configuration and database checks as available.
- The Admin UI showed the existing published development product, EUR/CY
  region, one managed-inventory variant (`DEV-PHYSICAL-001`), and the existing
  development shipping configuration. No fixture was reseeded and no
  production or external account was used.
- A fresh browser session followed `/products` → product detail → `Add to cart`
  → `/cart`. The resulting cart had one line at quantity 1 and €25.00 item
  pricing. Opening `/checkout` showed EUR, item subtotal €25.00, shipping
  €0.00, tax €0.00, subtotal €25.00, and total €25.00 before contact and
  shipping selection.
- A synthetic guest contact and Cyprus address were saved through the normal
  checkout form. The Medusa cart persisted the email and wrote the same
  validated address to both shipping and billing. No customer account was
  created.
- The cart-scoped Medusa shipping list returned one configured option,
  `Development Standard Delivery`, with response `amount: 5`, provider
  `manual_manual`, and the configured `Development Delivery` type. The option
  response omitted a currency code; the cart's EUR context and the persisted
  shipping method reported €5.00. Saving it through the checkout form
  persisted the selected method and returned authoritative totals of item
  subtotal €25.00, shipping €5.00, tax €0.00, subtotal €30.00, and total
  €30.00 in EUR. The configured region reported automatic taxes disabled, so
  the observed tax amount is recorded as Medusa's local fixture result, not as
  a general tax-policy claim.
- Selecting the empty country option was rejected by the browser's required
  validation and did not mutate the cart. A direct Store API attempt with the
  unsupported `US` country was rejected with HTTP 400 because it is outside
  the Development Cyprus Region; the original CY address and €30.00 total
  remained unchanged. The focused test suite also covers this region-country
  rejection.
- Changing the valid city to Limassol and saving, then restoring Nicosia,
  persisted through both address fields. The single configured shipping rate,
  tax, and total remained €5.00, €0.00, and €30.00 respectively.
- A direct Store API attempt to add a deliberately invalid shipping option was
  rejected with HTTP 400 (`Shipping Options are invalid for cart.`). The cart
  retained one valid shipping method, quantity 1, and total €30.00.
- For controlled repricing, the Admin region-specific EUR price was changed
  from €25.00 to €27.00 and then restored to €25.00. Product retrieval reflected
  the changed price, but cart retrieval and address saving retained the current
  €25.00 line until the normal cart quantity-update operation ran. That
  explicit Medusa cart operation refreshed the line to €27.00 and total to
  €32.00, after which the price was restored and the cart was revalidated back
  to €25.00 and €30.00. Next.js performed no monetary arithmetic.
- Admin inventory was set to zero for the managed variant. A normal cart update
  request for quantity 2 was rejected by Medusa; the UI reported that the
  quantity was unavailable and the cart remained at quantity 1 and total
  €30.00. Inventory was restored to 7 in Admin and confirmed in the Admin
  detail view.
- With Medusa stopped, a normal checkout mutation rendered the recoverable
  message `The checkout service is temporarily unavailable. Please try again.`
  No false success or local checkout authority was created. After Medusa was
  restarted, health, liveness, and readiness returned 200 and the cart,
  address, shipping method, and €30.00 total were still present.
- After restarting the storefront as well, a fresh checkout reload recovered
  the same guest cart state. Browser evaluation exposed no localStorage or
  sessionStorage entries and no script-visible cookie. The repository contains
  no localStorage/sessionStorage checkout writes; cart identity remains in the
  server-managed `retail_cart_id` cookie.
- The database contained zero orders after the flow. No payment provider,
  payment session, reservation, cart completion, or order creation was
  introduced; those remain Phase 7 responsibilities.

This is direct local `Next.js → Medusa Store API → PostgreSQL` runtime evidence
for the exercised Phase 6 foundation. It does not authorize Phase 7, and the
remaining acceptance decision is recorded with the complete repository
lint/typecheck/test/build gate reported for this verification run.

## Phase 7 — Stripe payment and authoritative order completion

### Objective

Complete the first purchase flow through the embedded Stripe Payment Element,
backend-owned payment lifecycle, authoritative order transition, and browser
confirmation.

### Architecture and ADRs implemented

ADRs 0005, 0032, 0044–0046, 0060, 0068–0072, 0080, 0084, 0120, 0125–0128,
0133–0136, and 0144 establish the Payment Element boundary, backend provider
adapter, immediate automatic capture, webhook ingress, idempotency, provider
ambiguity/reconciliation, checkout authority, monetary model, and immutable
order snapshot.

### Concrete repository changes

- Add the Payment Element with client-safe payment-session data only; raw card
  data and Stripe secrets remain outside application code paths that are not
  provider-authorized.
- Implement the Medusa-owned payment-session and checkout-completion workflow
  supported by the selected Medusa version.
- Add backend Stripe adapter and authenticated, deduplicated webhook ingress.
- Persist durable operation, correlation, provider-reference, idempotency,
  pending, and ambiguous states needed to prevent duplicate charges/orders.
- Implement automatic capture for the configured V1 card flow and authoritative
  order creation with transaction-time snapshot.
- Add a limited one-flow confirmation result without reusable guest order
  access.

### Dependencies and prerequisites

- Phase 6 checkout foundation.
- Stripe test-mode account/configuration and the selected Medusa Stripe
  integration capabilities.
- The version-specific lifecycle spike must pass; unsupported semantics are a
  decision gate, not a reason to invent a storefront-owned workaround.

### Acceptance criteria

- A successful test payment produces exactly one authoritative order and one
  captured payment according to the supported lifecycle.
- Failed and cancelled payments produce no unauthorized order and expose safe,
  understandable recovery outcomes.
- Retries, duplicate requests, duplicate webhooks, provider timeouts, and
  incomplete responses do not create duplicate charges or orders.
- Provider ambiguity remains pending/ambiguous until verified or reconciled;
  the browser never infers success from transport behavior.
- The order preserves the required immutable item, quantity, price, currency,
  shipping, tax, total, contact/delivery, and payment-reference facts.
- Inventory reservation and order transition follow the Medusa-owned workflow.

### Tests and evidence before proceeding

- Stripe test-mode success, failure, cancellation, duplicate-submit, duplicate
  webhook, timeout, delayed webhook, and ambiguous-provider scenarios.
- Database assertions for one operation identity, one payment effect, one
  order, immutable snapshot, and correct inventory state.
- Restart/retry tests while payment or webhook work is pending.
- Browser evidence for Payment Element use, validation, confirmation, and safe
  recovery without exposing secrets or provider payloads.
- Reconciliation test for a provider state that cannot be resolved from the
  initial response alone.

### Phase 7 implementation evidence

The Phase 7 implementation is present in the storefront working tree on
2026-09-21 and remains intentionally uncommitted. It uses the installed
Medusa 2.21.0 SDK signatures and the native Medusa Stripe provider; no custom
Stripe backend client, webhook handler, or storefront payment authority was
introduced.

- The backend environment contains all three required Stripe settings:
  `STRIPE_API_KEY`, `STRIPE_WEBHOOK_SECRET`, and the backend-only
  `STRIPE_PAYMENT_METHOD_CONFIGURATION`. The storefront template exposes only
  `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`. No secret or client secret is recorded
  in this plan.
- A dedicated Stripe test-mode Payment Method Configuration
  `pmc_1UI3whHNMTLJ4i9owqoH0V1S` was created as `Retail Starter V1 Card Only`.
  Its enabled method set is `card` only. `medusa-config.ts` passes that value to
  the installed provider's supported `paymentMethodConfiguration` option, with
  `capture: true`; no additional Medusa provider ID was added and
  `automaticPaymentMethods` remains unset.
- A clean Medusa restart through the local backend development process reported
  ready on port 9000. `/health`, `/health/liveness`, and
  `/health/readiness` returned HTTP 200. The keyed Store API still exposed
  exactly one enabled provider: `pp_stripe_stripe`.
- Before testing, native Medusa Admin showed the fixture at stocked `7`,
  reserved `7`, available `0`. Through Admin only, in-stock quantity was set
  to `14`; Admin then showed stocked `14`, reserved `7`, available `7`.
  Existing reservations were retained. The final Admin inventory state after
  the stopped closure attempt remained `14 / 7 / 7`.
- The pre-fix call path was `force-dynamic /checkout` →
  `getCheckoutPageData` → `initializeStripePaymentSession` →
  `initiatePaymentSession`. It ran on every qualifying server page load, so a
  refresh, navigate-away/back, or Payment Element remount could explicitly
  replace an already-current session. No payment-session Server Action,
  checkout initialization effect, rerender handler, address-update handler, or
  shipping-selection handler called `initiatePaymentSession`; those mutations
  only revalidated `/checkout` and could cause the page loader to run again.
- The pre-fix authoritative observation was a fresh cart with payment
  collection `pay_col_01M31YS5980AFCEP4YEFEF1K47` and Stripe session
  `payses_01M31YS7HWXXRKNSG4K9BKBZC8` (`pending`), where the collection and
  session were both EUR 30.00 and the session exposed client-safe Stripe data.
  The unconditional second initialization created a replacement PaymentIntent
  and canceled the predecessor. This is the Retail Starter defect: unnecessary
  explicit initialization while a valid current Medusa session already exists.
- The fix adds a pure `getReusableStripePaymentSession(cart)` classifier using
  the v2.21.0 Store API fields `payment_collection.id`, `amount`,
  `currency_code`, nested `payment_sessions`, session `id`, `amount`,
  `currency_code`, `provider_id`, `status`, and client-safe `data.client_secret`.
  `pending` and `requires_more` matching sessions are reused; canceled or
  stale sessions may initialize; `error` is surfaced as failed-session recovery;
  and `authorized`, `captured`, and `pending_authorization` are surfaced for
  reconciliation without blindly initializing another session.
- After the fix, a fresh post-restart browser cart
  `cart_01M321T45S6H97BKPMBNXT9ZH5` had collection
  `pay_col_01M321V6PMASZQWY8DVB9CWN7D` and session
  `payses_01M321V6VSZNY00REZW3JJSBAC`, both at EUR 30.00 with session status
  `pending` and client-safe data present. Three sequential refreshes plus
  navigate-away/back kept that Medusa session current and kept Stripe
  PaymentIntent `pi_3UI76WHNMTLJ4i9o0qW190Uv` as the only intent created by
  those loads; no additional canceled intent appeared. The Payment Element
  mounted in the browser, although the isolated browser exposed only Stripe's
  loading frame rather than card-field contents. No payment was submitted.
- A deliberate quantity change on that cart changed the authoritative total
  from EUR 30.00 to EUR 55.00. Native Medusa canceled the old session and
  Stripe intent, then the next checkout preparation created session
  `payses_01M3221EXXJFQ11W3TX9N1P7ZY` and PaymentIntent
  `pi_3UI79kHNMTLJ4i9o1fID2H3u` for EUR 55.00. The storefront rendered the
  new current session and did not retain the canceled client secret. This is
  native Medusa replacement on a cart-total change, not the reload defect.
- A separate fresh cart, `cart_01M3222XS7N98YSYGWC68STAKF`, was prepared with
  contact, billing, and shipping data. Two concurrent `/checkout` requests
  both observed no payment collection and entered initialization. Medusa
  created one collection, while the losing initialization concurrently tried
  to create another and logged HTTP 500 `Cart ... already has a payment
  collection`; the storefront responses were HTTP 200 because the failed
  preparation was projected as an unavailable-payment state. The winning path
  left one `pending` Stripe session `payses_01M3224GVPYT3WJ9XFSKQTYJHG` and
  one active EUR 30.00 PaymentIntent `pi_3UI7BNHNMTLJ4i9o0qApGhT0`, so no
  duplicate Stripe intent was created in this attempt. The race was therefore
  reproduced at the Medusa Store API payment-collection boundary. The closure
  below is implemented as the smallest supported extension; Medusa core remains
  untouched.
- The backend now configures Medusa's installed PostgreSQL Locking Module
  provider `@medusajs/medusa/locking-postgres` as the default `postgres`
  provider. No new locking package was added because the existing Medusa 2.21.0
  installation already resolves the provider. The supported migration ran and
  direct PostgreSQL inspection confirmed the provider-created `public.locking`
  table.
- `ensureCartPaymentSessionWorkflow` is the backend-owned cart-scoped
  operation. It acquires the cart ID resource key with Medusa
  `acquireLockStep`, re-reads the authoritative cart/payment collection/session
  fields while locked, invokes the supported collection and payment-session
  workflows only when required, re-reads the final state, and releases through
  the workflow path. Each workflow execution supplies a unique lock owner ID,
  so concurrent PostgreSQL provider acquisitions cannot be treated as the same
  owner. Nested core locking steps are skipped as subworkflow steps, so the
  parent owns the critical section. Compensation covers failures before the
  explicit release.
- The Store API route is
  `POST /store/carts/:id/payment-session`. Medusa's normal publishable-key
  middleware is required, the cart's sales channel must be in
  `req.publishable_key_context.sales_channel_ids`, and the route accepts only
  the current Stripe provider ID. The response contains collection/session
  identifiers and status, provider, amount, currency, and client-safe Stripe
  data only; it accepts no browser amount, currency, payment collection, order,
  or client-secret input.
- The locked state decision reuses only a current Stripe `pending` or
  `requires_more` session with matching authoritative amount/currency and a
  client secret. `authorized`, `captured`, and `pending_authorization` return
  explicit reconciliation states; `error` returns explicit recovery state;
  canceled and stale sessions use the supported replacement workflow. Missing
  collections use `createPaymentCollectionForCartWorkflow`, and session
  creation uses `createPaymentSessionsWorkflow`; no raw payment-intent or
  direct payment-session insertion path was added.
- The storefront no longer calls
  `sdk.store.payment.initiatePaymentSession`. Its initialization branch calls
  the new Store API route and keeps lock/state ownership in Medusa; the existing
  classifier remains presentation/recovery logic for already retrieved cart
  state.
- The backend state unit suite passes all four focused decisions. The installed
  `@medusajs/test-utils` 2.21.0 captures `DB_HOST`, `DB_PORT`, the database role,
  password, and waiting-room database while its database module is imported;
  its runner-level environment is applied too late to repair those credentials.
  The ignored `apps/backend/.env.test` now supplies `localhost:5433`, the
  retail role, and `postgres` as the waiting-room database. Jest loads that file
  before the HTTP spec imports `@medusajs/test-utils`, and the integration setup
  selects IPv4 first so Windows `localhost` reaches the retail Docker mapping.
- The controlled pre-fix attempt created its random integration database on
  the retail PostgreSQL server at `localhost:5433`, then stalled because the
  runner treated `127.0.0.1` as a non-local host and enabled SSL against the
  local non-SSL PostgreSQL server. The resulting Knex pool-acquisition timeout
  was connection setup failure, not pool exhaustion: retail PostgreSQL remained
  at `max_connections=100`, the role retained its existing capabilities, and
  no pool, timeout, or PostgreSQL setting was increased. The Erasmus PostgreSQL
  server on port `5432` was not changed and contained no `medusa-*` database.
- After the bootstrap fix, a disposable `/health` smoke run returned HTTP 200,
  and the real HTTP integration suite passed all five checks: missing-key
  rejection (Medusa 2.21.0 returns HTTP 400 for `NOT_ALLOWED`), sales-channel
  scope rejection, reusable-session reuse, concurrent one-collection/one-session
  preparation, and provider-failure lock cleanup. The integration runner
  created and cleaned its random database on the retail server without the pool
  timeout. A two-process local check on Medusa ports `9000` and `9100` then sent
  the same cart request concurrently: both returned `200 ready` with the same
  session, and PostgreSQL confirmed one collection, one session, and zero
  remaining locks. No payment was submitted and no webhook closure was run.
- The fresh post-restart PMC check recorded the intended card-only result:
  the active test PaymentIntent used `payment_method_types: [card]`,
  automatic capture, and Payment Method Configuration
  `pmc_1UI3whHNMTLJ4i9owqoH0V1S`. Repeated checkout loads reused the one
  current session. At this 2026-09-21 checkpoint, no successful PaymentIntent
  or webhook recovery had occurred; payment submission, webhook ambiguity
  recovery, exact duplicate-event redelivery, and post-recovery completion
  semantics remained deferred. The later controlled recovery below supersedes
  the genuine-webhook status, while exact duplicate-event redelivery remains a
  staging/pre-production gate.
- Stripe CLI `1.51.0` reports exact redelivery syntax as
  `stripe events resend <event> --webhook-endpoint <endpoint>`. In this earlier
  attempt no event was redelivered and the genuine Step 4 event had not been
  reached; this dated limitation is superseded by the later event recovery.
  Exact duplicate-event redelivery remains unverified.

The final repository quality gate was rerun after this locking correction:
`pnpm lint` passed with no lint issues; `pnpm typecheck` passed for backend and
storefront; `pnpm test` passed with 2 backend Jest tests and 22 storefront
tests; `pnpm build` passed for backend and storefront, including the dynamic
`/checkout/confirmation` route; and `git diff --check` passed. The storefront
test runner emitted only the existing module-type warnings, and the Medusa
build used its documented fake Redis fallback because no Redis URL is
configured. The shell also emitted an engine warning from its nested pnpm
runner reporting Node 24/pnpm 11 even though Corepack resolved the repository
manager as pnpm 10.11.1; the direct Node test process reported Node 22.23.2.
The working tree remains intentionally dirty and no commit was created.

The Phase 7 invariant is therefore not “exactly one Stripe PaymentIntent ever
per cart.” It is:

- at most one current usable Stripe payment session is authoritative to the
  storefront;
- repeated checkout loads do not manufacture replacement sessions;
- canceled predecessor PaymentIntents caused by legitimate Medusa session
  replacement are not treated as duplicate charges;
- only one PaymentIntent may become the successful/captured payment for the
  completed order; and
- exactly one Medusa order is produced.

### Phase 7 acceptance closure evidence — 2026-09-23

- The previously verified browser success, decline-and-retry, 3DS, and
  response-loss-with-webhook-disabled scenarios remain recorded above and in
  the preceding handoff. In this resumed run, the existing ambiguity order
  (display reference `11`, EUR 30.00) rendered on the local confirmation page;
  its page effect cleared `retail_cart_id`, and `/cart` then showed an empty
  cart.
- A fresh real Chrome Payment Element success created the next authoritative
  Medusa order (display reference `12`, EUR 30.00). The immediate confirmation
  stated that payment was captured and Medusa confirmed the order. The
  confirmation effect cleared the guest cart, and the subsequent `/cart` was
  empty. The fresh Stripe CLI `1.51.0` read showed the associated PaymentIntent
  as `succeeded`, with automatic capture and one captured latest charge.
- Read-only PostgreSQL inspection after payment found one order, one completed
  payment collection, one payment with `captured_at`, one current payment
  session, one ordered unit, and one reservation for reference `12`. Two
  simultaneous public Store API complete-cart requests for that already-paid
  cart both returned HTTP 200, `type: "order"`, and reference `12`. Reinspection
  found the same single order/payment/capture/session/reservation counts; the
  Stripe PaymentIntent remained succeeded and captured. No extra payment
  session or payment effect was created.
- The native completion result handling remains explicit: `type: "order"` is
  authoritative success and `type: "cart"` is not. The focused storefront test
  verifies that only the order result permits cart-cookie clearing.
- Restart durability passed for the new order. Next.js was restarted and
  served `/cart` with HTTP 200. Medusa was then restarted while the healthy
  PostgreSQL container remained running. After Medusa readiness returned HTTP
  200, the order, completed collection, payment, capture timestamp, Stripe
  provider reference, payment session, and reservation remained present; Stripe
  still reported the same PaymentIntent succeeded with automatic capture.
- The pre-existing reference `12` has ordered quantity `1`, no fulfillment
  record, and zero fulfilled or shipped quantity. Through Medusa Admin only,
  the fixture was set to stocked `19`; after a full refresh Admin showed
  reserved `12` and available `7`, with all twelve existing reservation rows
  retained. No SQL inventory mutation was made.
- The verified Stripe CLI `1.51.0` syntax is
  `stripe events resend <event> --webhook-endpoint <endpoint>`. The existing
  endpoint inventory contained one endpoint and no `localhost` or
  `127.0.0.1` target, so the exact existing event cannot be resent to the local
  CLI forwarder with this setup. No endpoint or replay proxy was created;
  duplicate-event delivery remains a staging/pre-production verification.
  During the current resumed run, Stripe CLI `1.51.0` was started with
  forwarding to `http://localhost:9000/hooks/payment/stripe_stripe` and its
  signing secret was installed in the ignored backend environment without
  recording the value. No webhook event had yet been observed at this dated
  checkpoint; the later controlled recovery below supersedes that status.
- A fresh in-app browser cart was created through the product page and prepared
  with address and Development Standard Delivery. Store API readback showed
  `cart_01M36TAWJ4ZNVT7C19HXSX1YZ0`, one payment collection
  `pay_col_01M36TFBRE6H2FBB1C527KT428`, and one pending session
  `payses_01M36TFHVM47MVVANAP518KM5H` for `pp_stripe_stripe`. Stripe readback
  showed PaymentIntent `pi_3UImjxHNMTLJ4i9o0qaW6Msb` at `requires_payment_method`,
  EUR 30, card-only, automatic capture, and the configured card-only PMC. On
  reopening the same checkout URL in the in-app browser, Stripe.js emitted only
  its expected test-over-HTTP warning; no browser-console error or challenge
  appeared. Stripe-created iframes existed, but the Payment Element iframe
  remained 2 px high inside a 238 px wrapper and its frame body exposed no card
  fields. The available evidence localizes the failure to Payment Element
  iframe initialization/rendering in this in-app browser context after
  Stripe.js loaded; it does not establish the underlying network/browser cause.
  The earlier Playwright CLI browser snapshot had shown the card-only UI. Per
  the stop condition, no payment was submitted and this cart produced no order
  or capture. A separate previously prepared browser-context cart
  `cart_01M36RF0XYC5F69XHXZ5A9BR9E` also remains unpaid; its PaymentIntent
  `pi_3UImGzHNMTLJ4i9o0SYTOQHU` remains at `requires_payment_method`. These two
  carts must not be confused with the pre-existing references `11` and `12`.
  At this dated checkpoint, payment submission, webhook recovery, and storefront
  reconciliation were still pending. The later controlled recovery below
  supersedes this status; the unpaid cart details above remain historical.
- The standalone Chrome render was diagnosed separately from the in-app browser:
  Chrome had exposed real card fields, EUR 30.00, and the warning
  `You cannot change the stripe prop after setting it.` The warning traced to
  `StripePaymentForm` calling `loadStripe(publishableKey)` during render. The
  key is a fixed, trimmed `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` environment value
  projected by `getCheckoutPageData`, so ordinary rerenders use the same key.
  A module-scoped keyed promise cache now calls `loadStripe` once per key and
  returns the same promise on later renders; no payment/session or Medusa
  lifecycle behavior changed. `<Elements>` retains its
  `key={payment.clientSecret}`, so it remounts only when the authoritative
  payment session/client secret changes. A focused regression test asserts one
  load and promise identity across repeated requests for the same key.
- After restarting the storefront, standalone Chrome was refreshed and safely
  navigated from checkout to cart and back. The Payment Element continued to
  render card number, expiry, and security-code fields; its iframe measured
  696 × 226 px. The `stripe`-prop warning did not recur; only Stripe's expected
  test-over-HTTP warning remained. No blank 2 px payment iframe was observed in
  these post-fix checks. Stripe CLI's latest PaymentIntent remained
  `pi_3UItCaHNMTLJ4i9o1vVDhW4t`, EUR 30.00 and
  `requires_payment_method`, before and after the refresh/navigation checks, so
  no new PaymentIntent was created by those renders. No card data was entered,
  payment submitted, order created, or capture made. This confirms the
  unstable-Stripe-prop defect was corrected; it does not prove that it caused
  every earlier blank iframe in other browser contexts.
- `pnpm lint`, `pnpm typecheck`, and `pnpm test` passed under a temporary
  process-local shim that selected Node `22.23.2` and pnpm `10.11.1`. The
  original warning came from `pnpm` resolving to the Codex fallback wrapper
  before Corepack, which launched Node `24.19.0` and pnpm `11.25.0`; no global
  PATH change was made. A final server-stopped `pnpm build` and
  `git diff --check` remain to be run after the payment recovery checkpoint.

### Phase 7 confirmation gate and webhook preparation — 2026-09-24

- Source review found that the storefront checked the `confirmPayment` error
  but did not require the returned PaymentIntent to be `succeeded` before
  starting Medusa completion. The redirect recovery path also accepted
  `processing` and `requires_capture`. The gate now requires no Stripe error, a
  PaymentIntent ID, and `succeeded` for this automatic-capture card flow.
- The same review found no synchronous guard against a second submit while
  Stripe confirmation was pending, and the button remained enabled during that
  phase. A ref-backed attempt lock now blocks overlapping submissions;
  confirmed recoverable failures release the lock for retry while uncertain
  confirmation outcomes keep it locked pending reconciliation.
- Focused storefront tests passed `25/25`, including success gating and lock
  release/retry coverage. Storefront TypeScript passed. No payment or cart was
  created during this review.
- The local app runs under Node `22.23.2` and pnpm `10.11.1`. The standalone
  Chrome catalog page loaded the development fixture; Medusa `/health` returned
  HTTP 200.
- Stripe CLI `1.51.0` was invoked from the npm-installed shim, subscribed to
  the installed Medusa Stripe provider's handled PaymentIntent event types, and
  reported ready while forwarding to
  `http://localhost:9000/hooks/payment/stripe_stripe`. Its active signing
  secret matched the ignored backend environment setting; neither value is
  recorded here. The listener remains connected.
- The controlled fresh-cart/payment attempt has not started. Standalone Chrome
  is waiting for the user to set the DevTools breakpoint before creating a
  fresh cart. Genuine signed webhook recovery and storefront reconciliation
  were still unverified at this preparation checkpoint; the later controlled
  recovery below supersedes that status.
- A follow-up review found that a rejected Stripe confirmation promise or a
  returned non-terminal PaymentIntent status could unlock the submit button
  with a retry message, even though the payment outcome was uncertain. The
  pinned Stripe.js 8.2.0 types distinguish connection/API errors from card and
  validation errors and expose a PaymentIntent on relevant errors; Stripe's
  PaymentIntent confirmation reference documents `requires_payment_method` as
  the retryable failed-payment state and `succeeded` as success for automatic
  capture. Retry is now restored only for validation errors or a
  `requires_payment_method` status. Rejected confirmation requests, status-read
  errors, and other non-terminal statuses keep payment submission disabled and
  show a do-not-resubmit message.
- The new retry-policy test failed first because the decision helper was
  missing, then the complete storefront test suite passed `26/26`; storefront
  TypeScript passed. This covers the decision rules, not Stripe network
  behavior in a real browser. The fresh browser attempt remains paused before
  cart creation until the requested DevTools breakpoint is visibly set.
- After this policy change, the full root `pnpm lint`, `pnpm typecheck`, and
  `pnpm test` gates passed under Node `22.23.2` and pnpm `10.11.1`. Backend
  lint reported no issues; backend tests passed 2 suites / 6 tests, and
  storefront tests passed 26/26. The build and final diff/status/secret checks
  remain pending until after the controlled browser recovery attempt.

At this checkpoint, Phase 7 still required usable Payment Element fields in the
chosen browser, genuine signed webhook recovery, storefront reconciliation, and
the final quality gate. The later evidence below records those outcomes. Exact
duplicate-event delivery remains a staging/pre-production gate.

### Checkout refresh reconciliation defect — 2026-09-24

The current Chrome checkout showed the existing EUR 30 cart and an authorized
Stripe payment session. Source tracing confirmed the refresh link performs a
GET of `/checkout`; server rendering re-retrieves the cart and classifies an
authorized session as requiring reconciliation. That branch did not look up an
existing Medusa order, so it rendered the same payment-status message and
could not reach confirmation. It did not need to initialize a session to
reproduce this path.

The installed Medusa 2.21.0 completion workflow writes the cart completion
timestamp and obtains the associated order through the `order_cart` link. Its
Store API cart retrieval does not include the associated order, so storefront
cart retrieval alone cannot restore a confirmation. The repair adds a
read-only Store API route that requires a completed cart in the publishable
key's sales-channel scope, follows the authoritative `order_cart` link, and
returns only display reference, currency, and total. Checkout and confirmation
now retrieve this projection from Medusa; URL parameters are no longer treated
as confirmation evidence. The continuity cookie is cleared only when the
current cookie's cart resolves, through a second authoritative Medusa lookup, to
a completed order, and that confirmation matches the confirmation that
initiated the cleanup request. Checkout and other business mutations remain
same-origin Server Actions; the one exception is a same-origin POST Route
Handler (`/checkout/confirmation/clear`) that clears the verified completed-cart
continuity cookie without re-rendering the confirmation page (a cookie change in
a Server Action re-renders the page, which previously turned the confirmed page
into a 404). The handler requires a matching `Origin` and a strictly validated
JSON body carrying the displayed `displayId`, `customDisplayId`, `total` and
`currencyCode`. Those posted values are only a binding and race guard against a
stale tab clearing a newer cart; they are not commerce authority. A mismatch
returns 409 and a failed lookup returns 502, and both retain the cookie. The
payment-session preparation route also rejects completed carts before running
the preparation workflow. If the confirmation-page lookup fails temporarily,
the page keeps the cart and offers a retry through `/checkout` without inviting
another payment attempt.

Verification performed for this repair:

- The backend route unit suite verifies completed-cart lookup, sales-channel
  scope, and a response projection that excludes customer email; incomplete
  and out-of-scope carts are rejected before order lookup. A separate payment-
  session route unit test verifies completed carts cannot re-enter session
  preparation.
- A live read-only request using a deliberately nonexistent cart reference
  returned the new route's expected `Completed order not found` response. It
  created no cart and did not inspect or mutate the existing order.
- Backend/storefront TypeScript checks passed. Backend unit tests passed 9/9
  across four suites; storefront tests passed 26/26; backend HTTP integration
  tests passed 5/5 after the final completed-cart payment-session guard was
  added; backend lint and both application builds passed under Node 22.23.2 and
  pnpm 10.11.1.
- Codex attached through the existing Chrome extension session to the existing
  `Person 1` profile and checkout tab; CDP was not required. The initial
  refresh encountered `ERR_CONNECTION_REFUSED` because the local storefront
  server was stopped. After starting the normal local backend and storefront
  development servers, the same tab rendered the existing order confirmation
  (reference 13, EUR 30.00). A subsequent `/checkout` visit redirected to
  `/cart`, which rendered the empty-cart state after the confirmation action.
  Browser console inspection found no warnings or errors; the only message was
  React's development-tools information. Next.js logged `/checkout` 200, the
  confirmation server action 200, then `/checkout` 307 and `/cart` 200.
  Medusa logged the cart and completed-order projections as HTTP 200.
- Before and after the browser check, read-only PostgreSQL inspection of local
  database `retail_starter_dev` confirmed cart
  `cart_01M394THAFQWGJN86C3R1Q5E7Z` completed at
  `2026-09-24T07:32:30.827Z`, linked to exactly one order
  `order_01M395929YKQHCS13QDYKGND1F` (reference 13), one completed EUR 30
  payment collection, one EUR 30 payment, one capture, and one linked Stripe
  PaymentIntent (`pi_3UJ71iHNMTLJ4i9o1394vBTp`). The Stripe safe projection
  reported `succeeded`, automatic capture, EUR 30 received, and test mode.
  There was one payment session, unchanged, with Medusa state `authorized` and
  the same PaymentIntent. The order's one reservation remained owned by its
  order line item (quantity 1). Inventory remained 19 stocked, 13 reserved,
  and 6 available; 13 active reservations totaling 13 units exist across that
  inventory item and location. No replacement collection/session or duplicate
  reservation appeared.
- Medusa `/health` and `/health/readiness` both returned HTTP 200 after the
  local development server was started. No payment was submitted, and no new
  cart, payment session, PaymentIntent, payment, capture, order, or reservation
  was created by this verification.

### Controlled signed webhook recovery and final evidence — 2026-09-24

The controlled recovery cart is `cart_01M394THAFQWGJN86C3R1Q5E7Z`, linked to
order `order_01M395929YKQHCS13QDYKGND1F` (display reference 13). Current
read-only Stripe and PostgreSQL evidence was re-read for this checkpoint; the
historical listener and browser details are identified separately below.

- **Newly reverified — Stripe event and PaymentIntent:** Stripe CLI safe
  projections returned event `evt_3UJ71iHNMTLJ4i9o1TAcOd60`, type
  `payment_intent.succeeded`, created `2026-09-24T07:32:26Z`, for
  `pi_3UJ71iHNMTLJ4i9o1394vBTp`. A direct PaymentIntent read returned
  `succeeded`, amount 3000 EUR, `amount_received` 3000, automatic capture,
  card-only payment methods, and test mode. The approved active Payment Method
  Configuration `pmc_1UI3whHNMTLJ4i9owqoH0V1S` is named
  `Retail Starter V1 Card Only` and currently enables `card` only. Stripe's
  PaymentIntent charge list returned exactly one matching charge, succeeded,
  paid, captured, and for EUR 30.00. No raw Stripe object or secret is recorded.
- **Newly reverified — Medusa and PostgreSQL:** Read-only queries returned one
  completed cart and one linked order; one completed EUR 30 payment collection;
  one Medusa payment with a capture timestamp and the same PaymentIntent; one
  Medusa capture; one payment session in `authorized` state; and one order line
  with quantity one. Exactly one reservation of quantity one is linked to that
  order line. The associated inventory level reads 19 stocked, 13 reserved, and
  6 available. The database contains one payment for the PaymentIntent and one
  order link for this cart. No duplicate linked PaymentIntent, order, capture,
  payment session, or reservation was found.
- **Previously observed live evidence:** The retained repository contains no
  Stripe listener process, forwarding log, or local application log for this
  event. The prior live run observed the genuine signed event forwarded to
  Medusa with HTTP 200, the interrupted browser completion recovered after the
  webhook, and storefront reconciliation reached authoritative confirmation.
  The confirmation action cleared `retail_cart_id` only after the matching
  order projection was re-read. These delivery and browser details were not
  independently re-read during this checkpoint and are not described as newly
  reverified.
- The older 2026-09-23 no-event and unpaid-cart statements above describe those
  earlier checkpoints and do not describe the later successful recovery.
- **Decline/retry and 3DS:** `Previously observed live/manual Phase 7 evidence;
  not rerun during the final checkpoint gate.` The repository evidence and
  earlier handoff do not establish automated coverage for either scenario.
- **Backend unit count:** The current source contains 9 tests across four
  discovered suites. Compared with the former 10-test count, the previous
  affirmative “accepts the isolated local PostgreSQL connection” case was
  explicitly removed from `environment.unit.spec.ts`; the remaining test
  rejects a missing database URL. This is a source change, not a Jest discovery
  change, and no renamed or equivalent affirmative test was found. The removal
  rationale is not recorded in the repository.

### Phase 7 acceptance automation classification

| Acceptance area | Evidence classification | Current coverage and boundary |
| --- | --- | --- |
| Payment-session reuse, preparation concurrency, provider-failure cleanup, and completed-cart rejection | automated and currently passing | Backend HTTP integration tests cover preparation/reuse/concurrency/failure; focused backend unit tests cover completed-cart rejection. |
| Completion confirmation projection and sales-channel scope | automated and currently passing | Focused backend route unit tests assert the safe projection and reject incomplete or out-of-scope carts. |
| Authoritative order, payment, capture, payment session, and inventory reservation for the controlled recovery | live/browser verified in current final acceptance | Fresh Stripe projections and read-only PostgreSQL queries confirm one EUR 30 order/payment/capture/session and one linked reservation. |
| Signed-event forwarding result, interrupted browser return, confirmation rendering, and continuity-cookie cleanup | previously observed live/manual evidence | The earlier run observed HTTP 200 and browser reconciliation. Listener and browser logs were not retained for fresh inspection during this checkpoint. |
| Payment Element card-field rendering and successful browser payment | previously observed live/manual evidence | A standalone Chrome run rendered card fields and completed a successful payment; that visual/success path was not rerun during the final checkpoint gate. |
| Card decline/retry and 3DS challenge | previously observed live/manual evidence | `Previously observed live/manual Phase 7 evidence; not rerun during the final checkpoint gate.` These scenarios are not automated coverage. |
| PaymentIntent success gating and retry-lock decision rules | automated and currently passing | Storefront tests currently pass the client decision-policy cases; this does not automate Stripe network behavior or a browser challenge. |
| Same-order concurrent completion count invariance | previously observed live/manual evidence | Controlled runtime requests returned the same order; no repeatable integration assertion covers unchanged payment/capture counts. |
| Exact redelivery of the same Stripe event | staging/pre-production gate | `stripe events resend` targets a registered Stripe webhook endpoint; the current local CLI forwarder is not registered, and no replay endpoint/proxy is approved. |
| Repeatable browser E2E, browser console/network assertions, and restart/recovery browser coverage | not covered | No maintained browser runner or CI assertions exist in the repository. |

The classifications describe the strongest available evidence, not just
technical feasibility. Exact duplicate-event redelivery remains a documented
staging/pre-production gate; repeatable browser E2E and console/network
assertions remain uncovered. Phase 7 is ready for checkpoint review; Phase 8
has not started.

The final quality gate passed on 2026-09-24 under Node `22.23.2` and pnpm
`10.11.1`: backend and storefront typechecks passed; backend lint reported no
issues; backend unit tests passed 4 suites / 9 tests; storefront tests passed
26/26; backend HTTP integration passed 1 suite / 5 tests; backend and
storefront builds passed; and `git diff --check` passed. The backend build used
Medusa's fake Redis fallback because no Redis URL is configured.

### Intentionally deferred

- Durable email delivery and refund confirmation notifications.
- Fulfillment and refund operations after order completion.

### Milestone gate — core purchase flow

The repository must now demonstrate
`catalog → cart → guest checkout → Stripe test payment → authoritative order →
browser confirmation`. This is the first complete commerce mutation path;
notification delivery is added in Phase 8 without moving order authority.

## Phase 8 — Transactional notifications

### Objective

Deliver provider-neutral, durable, retryable transactional messages after
authoritative commerce transitions.

### Architecture and ADRs implemented

ADRs 0006, 0007, 0049, 0070, 0071, 0123–0127, and 0107–0108 establish
notification semantics owned by Medusa, provider adapters, post-transition
creation, durable asynchronous work, webhook/reconciliation integration, and
same-codebase process isolation if evidence later requires it.

### Concrete repository changes

- Add provider-neutral notification intents/messages and durable delivery
  state inside the Medusa/PostgreSQL authority boundary.
- Add the selected email adapter or test sink behind the provider boundary.
- Add order-confirmation and administrator new-order messages after successful
  order completion.
- Add payment-failed/cancelled messages after authoritative payment outcomes.
- Add retry, backoff, deduplication, redaction, and terminal/manual-recovery
  handling for delivery failures.
- Add the refund-confirmation event contract for Phase 9 activation.

### Dependencies and prerequisites

- Phase 7 authoritative payment/order transitions.
- A selected development email provider or deterministic test sink.

### Acceptance criteria

- A commerce transition is authoritative before its notification work is
  created.
- Notification failure cannot create or repeat an order, charge, refund, or
  other commerce transition.
- Retried delivery reuses durable message identity and does not duplicate a
  logically single message beyond the provider contract.
- Public/storefront outcomes do not expose provider secrets, raw payloads, or
  unnecessary personal data.

### Tests and evidence before proceeding

- Integration tests for success, failed/cancelled payment, provider failure,
  retry, duplicate event, restart recovery, and terminal escalation.
- Delivery-attempt and message-identity assertions in PostgreSQL.
- Test-sink evidence that order confirmation and administrator notification are
  emitted only after authoritative order completion.
- Redaction checks for logs, public responses, and persisted provider data.

### Intentionally deferred

- Final production email provider and sender/domain configuration.
- Refund confirmation activation until Phase 9 refund lifecycle exists.

### Milestone gate — first complete V1 purchase milestone

The core purchase flow plus durable order-confirmation and administrator
notification work must pass together. This is the first milestone that
demonstrates both the customer purchase and the required post-transition
message path.

## Phase 9 — Operational fulfillment and refund flows

### Objective

Complete the V1 post-order operational lifecycle through Medusa Admin and
approved backend workflows, keeping fulfillment, refund, and return restocking
as distinct authorities and transitions.

### Architecture and ADRs implemented

ADRs 0021, 0029, 0076, 0081, 0129–0132, and the inventory/concurrency records
support Medusa-native fulfillment, backend-owned refunds, separate return and
restock lifecycles, reservations, and controlled post-order changes.

### Concrete repository changes

- Configure/administer fulfillment status and local-pickup operations through
  Medusa-native capabilities.
- Add authorized full and partial refund workflows through the Stripe adapter.
- Add separate return/receive/restock handling for returned-and-sellable
  stock; refund success alone must not restock inventory.
- Add refund confirmation notification work after authoritative refund success.
- Add operational outcomes for failed, pending, ambiguous, and manually
  reconciled refund states.

### Dependencies and prerequisites

- Phases 3, 7, and 8.
- Verified provider refund capabilities and an authorized Admin/operator
  pathway.

### Acceptance criteria

- Authorized operators can fulfill, pick up, fully refund, partially refund,
  and process a sellable return using backend-owned lifecycle transitions.
- A refund cannot be initiated twice by retrying the same logical operation.
- Refund and restock are independently attributable and independently
  recoverable.
- Inventory remains correct through reservation, fulfillment, refund, return,
  and sellable-restock scenarios.
- Customer refund confirmation is sent only after provider-confirmed refund
  success.

### Tests and evidence before proceeding

- Integration tests for fulfillment, pickup, full/partial refund, failed and
  ambiguous refund, duplicate retry, return receive, and sellable restock.
- Provider test-mode refund evidence and reconciliation evidence.
- Admin authorization/audit attribution checks.
- Inventory ledger assertions before and after each separate lifecycle.

### Intentionally deferred

- Advanced fulfillment providers, automated labels, live carrier rates, and
  multi-warehouse workflows excluded by V1 scope.

## Phase 10 — Media workflow

### Objective

Implement backend-authorized media transfers and publication without making
object storage a second application authority.

### Architecture and ADRs implemented

ADRs 0008, 0037, 0048, 0058, 0059, 0121, and 0122 establish isolated storage,
signed transfers, split visibility, backend finalization, immutable replacement
references, and coordinated cleanup.

### Concrete repository changes

- Add the backend object-storage adapter and isolated client/environment
  configuration.
- Add short-lived signed upload/download authorization where appropriate.
- Add backend finalization that verifies the expected object and records
  metadata/stable reference before publication.
- Add public versus protected visibility, immutable replacement references, and
  publication-state transitions.
- Add coordinated retirement/cleanup handling for superseded or abandoned
  objects without deleting authoritative metadata prematurely.

### Dependencies and prerequisites

- Phase 2 local storage strategy and Phase 3 backend configuration boundary.
- The presentation/media requirements for the first client bundle.

### Acceptance criteria

- Browser clients never receive long-lived object-storage credentials.
- Unfinalized, unpublished, and protected media cannot become public by upload
  alone.
- Replacements use new immutable references and do not overwrite an object
  referenced by an existing publication.
- Cleanup is recoverable and coordinated with backend metadata.

### Tests and evidence before proceeding

- Signed transfer expiry, scope, client isolation, and authorization tests.
- Finalization tests for missing, unexpected, altered, and valid objects.
- Public/protected visibility and immutable replacement tests.
- Restart/failure tests showing abandoned objects and metadata can be
  reconciled safely.

### Intentionally deferred

- Production storage vendor, CDN choice, retention periods, and client media
  catalogue.

## Phase 11 — Bulk onboarding and import operations

### Objective

Provide controlled, idempotent, resumable catalog and commerce-data onboarding
through the same Medusa domain pathways used by Admin.

### Architecture and ADRs implemented

ADRs 0027, 0098–0108, and 0101–0103 establish validated imports, Medusa-owned
live mutations, operational authorization, durable attribution, bounded
units, dependency-aware ordering, cooperative cancellation, and Medusa-native
asynchronous work.

### Concrete repository changes

- Define a versioned, validated import format for the V1 catalog and required
  configuration data.
- Add an import operation identity, durable attribution, unit progress,
  per-unit outcomes, and resumable state.
- Add dependency-aware ordering for categories, products, variants, prices,
  inventory, and related configuration.
- Add cooperative cancellation that does not pretend completed units were
  generically undone.
- Route mutations through supported Medusa services/workflows/modules rather
  than direct database writes or a parallel data model.
- Add operator visibility and safe recovery for partial or ambiguous imports.

### Dependencies and prerequisites

- Phase 3 commerce data pathways and Phase 8 asynchronous work foundations.
- An approved operational principal and attribution model.

### Acceptance criteria

- Invalid input is rejected before production mutation.
- Replaying the same operation identity is idempotent and returns existing
  unit outcomes rather than duplicating commerce data.
- Dependency failures stop or classify downstream units safely.
- Restart resumes incomplete units without repeating completed business
  effects.
- Every mutation is attributable to an authorized human or service principal.

### Tests and evidence before proceeding

- Import schema/validation tests and representative fixture imports.
- Duplicate, retry, restart, dependency-failure, cancellation, and ambiguous
  unit tests.
- Database and Admin assertions that imported records use the same authority
  and invariants as manual operations.
- Operational attribution and redaction checks.

### Intentionally deferred

- Client-specific import columns, large-scale throughput targets, and advanced
  ERP/POS synchronization excluded by V1 scope.

## Phase 12 — Observability and operational recovery

### Objective

Make critical commerce behavior diagnosable and recoverable through structured
backend records, redacted telemetry, health signals, correlation identities,
and provider reconciliation surfaces.

### Architecture and ADRs implemented

ADRs 0014–0015, 0032–0033, 0043–0045, 0060–0067, 0072–0073, 0109–0111, and
0112–0116 establish layered verification, operational traceability, local
transactions, human reconciliation, structured redacted observability,
readiness, shutdown, capability health, and stable outcome/configuration
boundaries.

### Concrete repository changes

- Add durable correlation, operation, provider-event, webhook, notification,
  and reconciliation identities where required by earlier slices.
- Add structured, redacted logs and justified metrics/traces for checkout,
  payment, order, inventory, refund, notification, media, import, and recovery
  operations.
- Add operator-facing backend recovery/reconciliation surfaces with least
  privilege and explicit status transitions.
- Add liveness, readiness, and capability health endpoints and deployment
  probes.
- Add graceful drain/restart behavior for server and any selected Medusa worker
  process.
- Add controlled alerting for actionable failures; do not build a V1 analytics
  platform.

### Dependencies and prerequisites

- The durable identities and outcomes from Phases 6–11.
- A selected observability implementation and initial operational thresholds.

### Acceptance criteria

- A critical operation can be followed across request, backend, provider,
  webhook, retry, notification, and reconciliation records without exposing
  secrets or unnecessary personal data.
- Operators can distinguish success, failure, pending, ambiguity, retry-safe,
  and manual-reconciliation-required states.
- Restart and graceful shutdown leave durable work recoverable.
- Provider capability degradation does not masquerade as application liveness
  failure or silently authorize commerce success.

### Tests and evidence before proceeding

- Correlation and redaction tests across representative success and failure
  flows.
- Fault-injection tests for provider timeout, webhook delay/duplication,
  notification failure, process restart, and reconciliation.
- Health-probe tests for mandatory dependency failure and capability-specific
  degradation.
- Operator recovery rehearsal with attributable actions and durable outcomes.

### Intentionally deferred

- Final monitoring vendor, alert thresholds, numeric SLOs, and production
  staffing/escalation policy.
- Separate server/worker deployment unless operational evidence requires it.

## Phase 13 — Deployment and database lifecycle

### Objective

Turn the working applications into immutable, compatible, client-isolated
  release artifacts with controlled Medusa schema promotion.

### Architecture and ADRs implemented

ADRs 0013, 0038–0039, 0055, 0074–0075, 0082, 0085–0086, and 0097 establish
provider-neutral deployment, environment isolation, controlled promotion,
immutable artifacts, compatibility-first migrations, coordinated recovery
sets, reconciliation gates, and the compatible release tuple.

### Concrete repository changes

- Add reproducible builds for the storefront and backend and immutable artifact
  identity.
- Add environment-specific configuration injection with secrets outside the
  artifacts.
- Add compatible release-tuple metadata covering applications, schema,
  presentation bundle, extensions, and required deployment metadata.
- Add controlled migration promotion and rollback/forward-fix procedures.
- Add isolated development/test/staging promotion checks and explicit approval
  records before production.
- Add deployment and startup configuration validation.

### Dependencies and prerequisites

- Phases 1, 2, 3, and 12.
- A selected hosting/deployment topology and provider-specific implementation
  choices within the architecture boundary.

### Acceptance criteria

- The same approved immutable artifacts can be promoted between isolated
  environments with external configuration.
- An application cannot start in an incompatible release-tuple state.
- Medusa, not Next.js, owns commerce schema migration execution.
- Destructive/irreversible migration paths have explicit review and verified
  restore or forward-fix paths.
- Rollback constraints and database compatibility are documented and tested.

### Tests and evidence before proceeding

- Reproducible build and artifact identity checks.
- Promotion rehearsal through isolated environments.
- Compatibility-first migration tests, failed migration recovery, and
  rollback/forward-fix rehearsal.
- Startup/pre-promotion configuration and release-tuple validation.
- Deployment health and smoke checks against the promoted artifacts.

### Intentionally deferred

- Client production data promotion, final lifecycle-policy activation, and
  production publication approval.

## Phase 14 — Backup and recovery

### Objective

Prove that a client deployment can be restored as a coordinated set and that
provider-linked ambiguity is reconciled before the restored environment is
promoted.

### Architecture and ADRs implemented

ADRs 0016, 0032, 0061, 0072, 0082, 0085–0086, and 0097 are represented by
the recovery, reconciliation, release-tuple, and operational records
described in the architecture baseline. The lifecycle-specific ADRs remain
separate; this phase does not invent a new backup authority.

### Concrete repository changes

- Add PostgreSQL backup scheduling/storage and verified restore procedure.
- Add object-storage backup/recovery considerations and media-reference
  verification.
- Add a coordinated recovery manifest covering artifacts, schema/migration
  version, database recovery point, media state, client configuration,
  presentation bundle, and required metadata.
- Add isolated restore validation and a provider-reconciliation gate for
  pending, ambiguous, or recovery-affected payment/refund operations.
- Add operator evidence and promotion criteria for restored environments.

### Dependencies and prerequisites

- Phases 10, 12, and 13.
- A selected backup/recovery implementation and an isolated recovery target.

### Acceptance criteria

- A real restore recreates the required database, media references,
  configuration, release tuple, and critical commerce state in isolation.
- Orders, payment/refund references, inventory, presentation content, and
  required media are verified after restore.
- Provider state is not assumed to be restored atomically; affected
  operations are reconciled or explicitly isolated.
- Promotion is blocked when critical payment/refund ambiguity remains
  unresolved.

### Tests and evidence before proceeding

- At least one real PostgreSQL restore test, not only a backup-existence check.
- Media/reference restore verification and missing-media handling.
- Recovery-point and release-tuple compatibility checks.
- Provider ambiguity/reconciliation rehearsal and final isolated smoke test.
- Documented restore timing and observed results, without inventing RPO/RTO
  claims that have not been measured or approved.

### Intentionally deferred

- Numeric RPO/RTO targets, provider-specific cross-region guarantees, and
  client-specific recovery exceptions.

## Phase 15 — Client presentation and configuration system

### Objective

Make branding, content, theme, navigation, public SEO settings, and stable
media references a validated, versioned, safely projected client bundle.

### Architecture and ADRs implemented

ADRs 0009, 0017, 0024, 0026, 0050, 0083, 0087–0095, 0114–0116, 0141, and
0142 establish configuration ownership, versioned presentation content,
compatible releases, extension boundaries, capability availability,
least-privilege access, layered verification, traceability, and safe public
projection.

### Concrete repository changes

- Define and validate the client presentation bundle schema and compatibility
  identity.
- Add client branding/theme/content/navigation and public SEO configuration
  loading through its authoritative boundary.
- Project only safe public configuration to Next.js/browser code.
- Link stable media references from the media workflow without storing binary
  authority in the storefront.
- If client extensions are required, add only an allow-listed,
  capability-scoped, versioned set with explicit dependencies and operational
  attribution.
- Add bundle rollback/recovery linkage to the compatible release tuple.

### Dependencies and prerequisites

- Phases 4, 10, 13, and 14.
- A concrete client bundle schema and any approved extension requirements.

### Acceptance criteria

- Invalid or incompatible presentation bundles fail validation before
  promotion/activation.
- A client can change approved presentation configuration without changing
  commerce authority or leaking secrets.
- Missing or unavailable optional capability fails in the documented scoped
  manner rather than breaking unrelated core commerce.
- Bundle identity, extension identity, and media references are traceable and
  recoverable.

### Tests and evidence before proceeding

- Schema, compatibility, safe-projection, and rollback tests.
- Browser visual/responsive and SEO checks for representative populated
  bundles.
- Extension allow-list, dependency, least-privilege, failure-isolation, and
  traceability tests where extensions are enabled.
- Recovery rehearsal linking the bundle to the restored release tuple.

### Intentionally deferred

- Client-specific brand assets, final content, and any extension not required
  by the accepted V1 client contract.

## Phase 16 — Privacy and lifecycle production gate

### Objective

Establish the client-approved, versioned, backend-controlled lifecycle policy
and prove that V1 data minimization and deletion/retention boundaries are
ready for production.

### Architecture and ADRs implemented

ADRs 0042, 0062, and 0145–0152 establish data minimization, data-class
retention/deletion authority, client approval, versioned policy, controlled
activation, atomic/concurrency-safe activation, and activation idempotency.

### Concrete repository changes

- Add a client retention/deletion matrix template covering data classes,
  owners, triggers, dependencies, media, providers, backups, and exceptions.
- Add versioned lifecycle-policy storage and approval metadata.
- Add backend-controlled activation with atomic/equivalent coordination,
  concurrency protection, durable attribution, and idempotent operation
  identity.
- Add data-class-specific deletion/anonymization/media-cleanup workflows that
  preserve operational, reconciliation, security, accounting, tax, and legal
  records when required.
- Add preproduction validation that exactly one approved policy is active.

### Dependencies and prerequisites

- Phases 10, 12, 13, 14, and 15.
- Client-approved policy inputs and any legal/jurisdictional review required
  outside the software implementation.

### Acceptance criteria

- The active policy is identifiable, approved, versioned, and attributable.
- Invalid, partial, stale, concurrent, or repeated activation cannot produce a
  split-brain active policy.
- Deletion/retention operations respect data-class dependencies, provider
  constraints, backup/recovery copies, and required operational records.
- Raw card data, unnecessary profiling, duplicate commerce stores, and
  unnecessary behavioral tracking are absent.

### Tests and evidence before proceeding

- Policy schema and approval validation tests.
- Concurrent activation, stale-version, duplicate-operation, failure, and
  recovery tests.
- Data-class lifecycle dry runs in isolated environments with provider/media/
  backup implications recorded.
- Production-readiness evidence that the client policy is not merely a
  documentation placeholder.

### Intentionally deferred

- Exact retention periods, legal exceptions, jurisdiction-specific triggers,
  and client policy values until approved for the specific deployment.

## Phase 17 — Production-readiness verification

### Objective

Run the final cross-layer verification and release gate for the V1 scope,
architecture, configuration, recovery, and client deployment.

### Architecture and ADRs implemented

ADRs 0014, 0033, 0061, 0073–0075, 0082, 0085–0086, 0109–0111, 0116, and the
full V1 acceptance/non-functional requirements in `docs/scope-v1.md` provide
the final verification boundary.

### Concrete repository changes

- Add or finalize critical E2E suites for catalog, search, product, cart,
  guest checkout, payment, order, notification, fulfillment, refund,
  inventory, media, import, recovery, and lifecycle gates.
- Add Stripe test-mode success, failure, cancellation, retry, webhook,
  ambiguity, and refund scenarios.
- Add accessibility, security, configuration, browser/responsive, and
  deployment verification suites.
- Add the release checklist and evidence index linking each acceptance gate to
  a repeatable result.
- Record unresolved non-critical limitations without reclassifying them as
  implemented behavior.

### Dependencies and prerequisites

- Phases 1–16 and the relevant client configuration/approval gates.
- A clean compatible release tuple in an isolated verification environment.

### Acceptance criteria

- All confirmed V1 acceptance criteria pass.
- No unresolved critical failure remains in payment, order, inventory,
  refund, notification, security, or recovery flows.
- A real backup restore test has passed.
- The core flows work on representative desktop and mobile browsers with the
  selected accessibility and security checks.
- Configuration, migration, release, lifecycle, and deployment gates pass.
- Remaining deferred numeric targets, RPO/RTO values, browser matrix details,
  or future-scope choices are explicitly identified and do not conceal a
  confirmed V1 failure.

### Tests and evidence before proceeding

- Full critical-path E2E run from a fresh compatible environment.
- Layered unit, integration, contract, browser, security, accessibility,
  recovery, and deployment evidence as applicable.
- Final production-like smoke test and controlled promotion evidence.
- Human sign-off against `docs/scope-v1.md`, the active lifecycle policy, and
  the compatible release tuple.

### Intentionally deferred

- Post-V1 capabilities listed in the scope exclusions and future expansion
  work that has not received a separate product/architecture decision.

## Decisions required by phase

The following decisions are deliberately postponed until their dependency
requires them:

| Decision | Required before | Why it can wait |
| --- | --- | --- |
| Exact Medusa checkout/payment/reservation lifecycle | Phase 6/7 | The architecture requires verification against the selected Medusa version, not an invented sequence in documentation. |
| Local PostgreSQL/object-storage/email implementations | Phases 2, 10, and 8 respectively | The boundary is fixed; concrete local/provider choices are implementation details. |
| Production hosting, CDN/DNS, and provider wiring | Phase 13 | Early milestones can run in isolated local/test environments. |
| Worker process separation | Phase 12 | The architecture permits it only when operational evidence justifies it. |
| Observability stack and thresholds | Phase 12 | Structured/redacted operational evidence is required; the vendor and numeric thresholds remain open. |
| Client presentation bundle and extensions | Phase 15 | Core commerce can be proven before client-specific presentation/extension work. |
| Client lifecycle matrix values and activation | Phase 16 | Exact retention/legal values are client-specific and must be approved before production. |
| Browser/device matrix and numeric performance/RPO/RTO targets | Phase 17 or a demonstrated earlier need | The V1 scope intentionally leaves these values open until implementation evidence or client requirements justify them. |

## Risk and architecture dependency review

No architecture dependency is impossible on the documentation evidence reviewed.
The principal implementation risk is version compatibility: the selected
Medusa release must support the required Store API, checkout-completion
workflow, Payment Element/payment provider integration, immediate capture,
webhook ingress, reservations, Admin operations, durable asynchronous work,
migrations, and recovery controls without creating a storefront or custom
service authority. The Phase 6/7 lifecycle spike is a hard gate for that risk.

The second material risk is recovery across PostgreSQL, object storage, client
configuration, and external provider state. The plan treats provider state as
reconciled rather than atomically restored and blocks promotion for unresolved
critical payment/refund ambiguity, as required by the architecture. If the
selected Medusa version or hosting/provider constraints cannot satisfy these
gates, implementation must pause for an explicitly approved architecture
decision; it must not silently widen the system boundary.
