# Retail Starter Implementation Plan

## Status and approach

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
