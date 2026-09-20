# Current Architecture Summary

## Status and purpose

This is the authoritative V1 architecture summary for Retail Starter. It
consolidates the accepted decisions in `docs/decisions/` without replacing
their rationale or detailed invariants. It is intended to be sufficient for
implementation planning; the ADRs remain the source for decision-specific
constraints and consequences.

Implementation has not started. This document therefore describes the agreed
boundaries and invariants, not a package layout, database schema, endpoint
catalogue, or provider-specific deployment recipe. No new architecture
decision is introduced here.

## System boundary

Retail Starter uses one repository containing two independently deployable
applications:

- **Next.js storefront:** the customer-facing presentation and interaction
  application.
- **Medusa commerce backend:** the commerce authority and backend integration
  boundary.

Supporting systems and external boundaries are:

- **One dedicated PostgreSQL database per client deployment, owned by
  Medusa:** authoritative commerce and durable operational/reconciliation
  state.
- **Isolated object storage per client deployment:** durable binary media.
- **External providers, including Stripe and transactional email:** accessed
  through backend-owned provider adapters.

Each client has isolated runtime resources, credentials, configuration,
commerce data, presentation content, branding, media, and external-service
accounts. The core remains provider-neutral; Cloudflare may be used where
useful for DNS, CDN, frontend or media delivery, or edge security, but core
commerce behavior does not depend on it. (ADRs 0001, 0003, 0004, 0013, 0038,
0096, 0125)

V1 does not add a general-purpose BFF, separate commerce service, custom
worker application, integration or webhook gateway, operations service,
analytics platform, or other custom backend authority. If asynchronous process
separation is needed, a Medusa server and Medusa worker may run as separate
processes from the same approved application and codebase. A genuinely new
service boundary requires a later explicit architecture decision supported by
operational evidence. (ADRs 0041, 0047, 0096, 0107, 0108)

## Authority model

The system has one authoritative owner for each responsibility. Supporting
systems store or deliver what their boundary owns; they do not become a second
commerce authority.

| Responsibility | Authority and boundary |
| --- | --- |
| Presentation, navigation, customer interaction, and SEO | Next.js and the versioned client presentation bundle. Next.js renders current commerce facts supplied by Medusa and owns public SEO presentation, but does not create a competing catalog identity or commerce state. |
| Catalog and commerce data | Medusa, backed by the client's dedicated PostgreSQL database. This includes products, variants, prices, categories as commerce entities, and commerce validation. |
| Cart and checkout | Medusa through the public Store API and one Medusa-owned checkout-completion workflow. Next.js orchestrates the experience but does not maintain a second cart, pricing model, or checkout authority. |
| Payments | Medusa and its configured Stripe provider adapter. Verified provider outcomes and backend reconciliation determine payment state; Next.js and the Payment Element are not payment authority. |
| Orders | Medusa. Order creation and later lifecycle changes use backend-owned workflows and preserve transaction-time order facts. |
| Inventory and reservations | Medusa. Availability, reservation creation and release, fulfillment consumption, and sellable-return restocking remain in the Medusa inventory lifecycle. |
| Shipping and tax | Medusa using approved client configuration for V1 zones/regions, fixed fees, free-shipping thresholds, local pickup, and configured tax rules. Next.js displays the result. |
| Refunds | Authorized Medusa/Admin operators through the backend refund lifecycle and Stripe adapter. Refunds are separate from physical return and restocking. |
| Fulfillment | Medusa-native fulfillment through Medusa Admin or approved backend workflows. Next.js may display status but does not transition fulfillment. |
| Admin identity and authorization | Medusa-native authentication, sessions, authorization, and Medusa Admin. V1 has one basic admin access level; the storefront has no admin authority. |
| Transactional notifications | Medusa-owned notification intents, message semantics, and durable delivery state, delivered asynchronously through a provider adapter. Email providers do not define commerce meaning. |
| Media | The backend authorizes operations and owns metadata, publication state, and stable references; object storage owns binary files. Public and protected visibility are separate. |
| Lifecycle and retention policy | Backend-owned, data-class-specific lifecycle workflows and controlled policy activation. Client-approved lifecycle policy is deployment-specific and must be approved before production. |
| Operational and recovery state | Durable backend/PostgreSQL records own commerce, retry, idempotency, provider-correlation, notification, webhook, and reconciliation state. Medusa Admin plus controlled deployment/recovery paths provide authorized operational and recovery actions; logs and provider dashboards are supporting evidence, not authority. |

(ADRs 0002, 0004, 0010-0012, 0015, 0021-0022, 0028-0029, 0043, 0057,
0061-0062, 0068-0071, 0076, 0081, 0123-0137, 0141-0149)

## Storefront boundary

Next.js uses a thin typed integration with Medusa's **public Store API**. The
Store API is the only Medusa commerce surface exposed to storefront server or
browser code. Private/admin APIs, backend credentials, database access, and
operational mutation authority never reach the browser. Next.js is not a
general BFF and does not proxy or mirror Medusa's commerce domain. (ADRs 0023,
0025, 0064, 0117)

The storefront follows a hybrid, server-first model:

- Next.js server code performs catalog reads, SEO/presentation work, and
  trusted orchestration through the public Store API where practical.
- Browser code is limited to interactions that genuinely need browser state or
  a client SDK, including the embedded Stripe Payment Element and selected
  guest-cart interactions.
- Browser-originated Store API access uses an explicit per-client origin
  allow-list. CORS controls permitted origins; it is separate from CSRF
  protection for state-changing requests that use ambient browser credentials.
- Guest-cart continuity uses a secure opaque Medusa cart or continuation
  reference only. It contains no cart contents, prices, customer data,
  payment state, or commerce authority, and is not reconstructed from browser
  storage if lost or invalid.

V1 is guest-only for customers. Medusa may maintain the minimum internal guest
customer record needed for commerce, but this is not an authenticated customer
account. There is no customer login, reusable guest order credential, public
order history, or generic guest order lookup. After authoritative completion,
Next.js may show a limited confirmation for that completed browser flow; it is
not reusable post-purchase access. Transactional email is the primary
post-purchase communication channel. (ADRs 0051, 0054, 0065, 0077, 0118-0119,
0144)

Selective caching is allowed only for safe, read-oriented presentation data,
such as catalog pages, category pages, basic search results, navigation, and
static content. Cache freshness, revalidation, or invalidation is explicit.
Cached data is never authoritative for cart, checkout, availability,
reservations, final prices or totals, shipping, tax, payment, orders, refunds,
or fulfillment; Medusa revalidates correctness-sensitive state before
purchase confirmation. Next.js owns SEO presentation, including route
metadata, canonical URLs, sitemaps, robots, social metadata, and suitable
structured presentation markup. (ADRs 0019, 0028, 0053, 0140-0142)

## Checkout and payment flow

Checkout completion has one Medusa-owned authoritative workflow. Next.js
requests completion through the public Store API and presents backend-owned
outcomes. The workflow preserves the required boundaries around cart and
variant validity, repricing, inventory availability and reservations, shipping,
tax, payment state, order creation, transaction-time snapshots, concurrency,
idempotency, retries, and reconciliation.

The exact ordering of Medusa payment-session handling, authorization/capture,
reservation, order placement, and related lifecycle steps is deliberately
implementation-dependent. It must be verified against the selected Medusa
version during implementation. The summary does not prescribe an invented
sequence or reproduce the workflow in Next.js. (ADRs 0080, 0133-0134)

The customer-facing payment interaction is the embedded Stripe Payment
Element. It receives only client-safe payment-session data. Raw card data does
not pass through Next.js or Medusa application code, and Stripe secrets remain
backend-only. Medusa owns the payment
collection and provider lifecycle; verified Stripe events and backend
reconciliation determine authoritative payment status. V1 configures ordinary
card payments for immediate automatic capture through the supported
Medusa/Stripe lifecycle. Fulfillment is a separate later transition and does
not control capture. (ADRs 0005, 0046, 0084, 0120, 0125-0127)

Provider timeouts, incomplete responses, and webhook uncertainty produce an
explicit pending or ambiguous backend state. The backend checks authoritative
provider status before a duplicate-sensitive retry, reuses the same durable
operation and provider idempotency identity where supported, and escalates
unresolved ambiguity to controlled operator reconciliation. The storefront
does not infer success or failure from browser or transport behavior. V1 has
no automatic cross-provider failover; one configured provider is authoritative
in the active environment. (ADRs 0044-0045, 0072, 0127-0128)

After an authoritative successful transition, Medusa durably creates the
required notification intent and asynchronous work. Order confirmation and
admin new-order messages follow successful order completion; failure or
cancellation messages follow authoritative payment outcomes; refund
confirmation follows an authoritative successful refund. Notification failure
cannot create a second order, charge, refund, or commerce transition. (ADRs
0006-0007, 0070, 0123-0124)

## Data, consistency, and outcome model

Medusa owns one dedicated PostgreSQL database per client. Next.js never accesses
that database directly. Normal live commerce mutations—including catalog,
pricing, inventory, order, refund, fulfillment, shipping, tax, and operational
changes—use Medusa Admin, supported Medusa services, workflows, handlers,
modules, or controlled backend-owned operations. Direct SQL is reserved for
narrowly controlled schema migrations, verified recovery, or explicitly
approved maintenance; it is not the normal business-data path. (ADRs 0004,
0034, 0098-0099, 0101-0102)

The backend is the concurrency and idempotency boundary. Competing cart,
checkout, inventory, payment, refund, fulfillment, notification, webhook,
bulk, and reconciliation operations use durable backend-owned operation
identities and appropriate transactional or equivalent controls. Correctness
does not depend on browser locks, a single process, request ordering, or
process-local memory. Retried requests resolve against the existing logical
operation rather than creating another business effect. (ADRs 0031-0032,
0044-0045, 0060, 0100, 0104-0106, 0150-0152)

Each created order contains an immutable transaction-time snapshot of the
facts needed to understand the purchase, including items, quantities, prices,
discounts, currency, shipping, tax, totals, required contact/delivery data,
and payment references as applicable. Later catalog or configuration changes
do not rewrite that snapshot. Post-order payment, fulfillment, refund, return,
inventory, or supported adjustment transitions are explicit backend-owned
lifecycle records. Refund success does not restock inventory; only an
authorized backend return/receive flow can restore sellable stock. (ADRs
0068-0069, 0076, 0130, 0135-0136)

All authoritative monetary values carry explicit currency context. Medusa
calculates and persists prices, discounts, shipping, tax, totals, payments,
refunds, and order amounts. Next.js formats and displays backend values but
does not recalculate authoritative totals; locale is never currency authority,
and mixed-currency arithmetic or implicit conversion is not introduced in V1.
(ADRs 0069, 0136)

Medusa exposes stable structured commerce outcomes. They may contain a safe
outcome category, current status, operation/correlation reference, structured
issues, capability context, and whether retry is safe. Next.js maps those
outcomes to customer-facing states and permitted recovery actions. Public
responses are deliberately narrower than backend/operator records, which
retain provider details, retry and ambiguity state, reconciliation context,
and recovery controls. Secrets, raw provider payloads, internal traces, and
unnecessary personal data are not exposed. (ADRs 0030, 0056, 0112-0114)

Durable operational records remain inside the Medusa/PostgreSQL authority
boundary. Structured, redacted logs, metrics, traces, alerts, and provider
dashboards assist diagnosis but cannot determine commerce truth. V1 does not
add a separate analytics or audit platform. Data collection follows V1 data
minimization: only information needed for approved commerce, fulfillment,
reconciliation, reliability, security, attribution, and diagnostics is kept.
(ADRs 0015, 0041-0043, 0067, 0145)

## Asynchronous work and external providers

Durable asynchronous work stays inside the Medusa/backend boundary. Medusa
workflows, events, subscribers, and supported worker capabilities handle
retryable side effects such as notification delivery, provider calls, webhook
follow-up, and reconciliation. Authoritative commerce transitions do not wait
synchronously for non-critical side effects, and required work is recoverable
after process restart or replacement.

If operational evidence requires process isolation, Medusa server and worker
modes may run separately from the same compatible application and codebase.
They share PostgreSQL, operation identities, idempotency, retry, and
reconciliation state. No custom outbox, external queue, separate worker
application, or second asynchronous authority is part of V1. (ADRs 0007,
0047, 0107-0108)

Stripe, email, object storage, and any future provider are integrated through
backend-owned adapters. Adapters keep credentials and provider SDKs inside
their boundary and normalize provider responses into backend statuses,
references, outcome categories, and reconciliation state. Authoritative
provider webhooks terminate at backend-owned Medusa endpoints, where
authenticity is verified, event identity is deduplicated, and processing uses
the same backend workflows and durable records. Next.js never resolves
provider events into commerce state. (ADRs 0040, 0071-0072, 0125-0127)

Graceful shutdown stops new work where appropriate, lets in-flight operations
reach safe boundaries where possible, and leaves unfinished asynchronous,
webhook, idempotency, and reconciliation work durable for restart recovery.
Health is separated into liveness, readiness, and capability health: mandatory
dependencies determine readiness, while independently recoverable provider
failures produce capability-specific degraded, pending, failed, or ambiguous
outcomes. (ADRs 0073, 0109-0111)

## Operational commerce data and imports

Live Medusa commerce data is outside the application release tuple. Products,
variants, prices, inventory, categories, shipping and tax configuration,
orders, refunds, fulfillment, and related operational records are
environment-specific data, not repository-managed release content. Routine
commerce-data changes do not require rebuilding or promoting the application
artifacts. (ADRs 0027, 0097-0099)

Medusa Admin is the normal operational interface. Bulk onboarding, imports,
and approved migrations use controlled backend-owned operations through the
same Medusa domain pathways as Admin. They are validated before production
application, environment-specific, idempotent, durably attributed, and
resumable. A bulk operation uses bounded units with durable progress and
outcomes, dependency-aware ordering, and cooperative cancellation; completed
units are not generically undone by cancellation, and unsafe partial or
ambiguous work is surfaced for operator recovery. (ADRs 0012, 0098,
0100-0106)

Operational mutations require Medusa-native authorization and an attributable
human or service principal. Automation and imports do not receive database
authority or bypass validation, lifecycle rules, concurrency controls,
idempotency, or operational records. (ADRs 0101-0103)

## Configuration and release ownership

There is one authoritative owner for each configuration class:

- **Runtime environment and secrets:** database wiring, provider credentials,
  authentication/webhook secrets, deployment-specific wiring, and backend-only
  operational settings. Secrets are runtime-only and isolated per client.
- **Versioned client presentation bundle:** branding, theme, navigation, public
  SEO settings, approved static content, presentation settings, and stable
  media references. It is non-secret, separately versioned, validated, and
  compatible with the targeted core release.
- **Medusa/Admin commerce data and configuration:** products, variants, prices,
  categories, inventory, shipping, tax, payment-related commerce settings,
  and operational commerce state.
- **Object storage:** binary media assets, referenced by backend-owned stable
  metadata and publication references.
- **Validated public projection:** Next.js receives only the safe presentation
  configuration and public Store API data required to render the storefront.

These boundaries do not form an ambiguous layered override system. If the same
authoritative value appears in conflicting ownership classes, validation fails;
silent precedence does not resolve the conflict. Required configuration is
validated before promotion and again at startup by the application that owns
it. Missing or malformed required configuration prevents normal service, and
the backend remains authoritative for commerce-critical configuration. (ADRs
0024, 0050, 0063, 0083, 0115-0116)

The compatible production release tuple identifies the approved Next.js and
Medusa artifacts, compatible PostgreSQL schema/migration version, approved
client presentation bundle, approved extension identities where applicable,
and required non-secret deployment metadata. Client commerce data remains
outside that tuple. Applications may be deployed independently, but only
compatible versions form an approved production state. (ADRs 0026, 0052,
0086-0089, 0097)

## Media boundary

The backend authorizes every media operation for the correct client,
environment, administrative context, object scope, and intended action. Where
appropriate, it issues a short-lived signed upload or download authorization
and the browser transfers binary data directly to object storage. Long-lived
object-storage credentials never reach the browser.

Object-storage acceptance is not application finalization. A backend-owned
finalization step verifies the expected object and records its metadata and
stable reference before the asset becomes authoritative. Published storefront
media may use stable public reads suitable for CDN delivery; unpublished,
temporary, administrative, and private media remains protected. Replacements
use new immutable object keys/references and update the backend-owned
publication reference rather than overwriting an existing object. Superseded
or abandoned objects are retired only through coordinated backend lifecycle
handling. (ADRs 0008, 0037, 0048, 0058-0059, 0121-0122)

## Deployment, promotion, and recovery

Deployment is provider-neutral and client-isolated. The applications are built
as immutable versioned artifacts, verified in isolated development and test
environments, and the same approved artifacts are promoted to production with
external client configuration and secrets. Every production deployment is a
known compatible release tuple with an explicit rollback point and approval.
Cloud or hosting topology, CDN choice, and concrete provider wiring remain
implementation choices within these boundaries. (ADRs 0013, 0038-0039,
0074, 0086)

Medusa owns PostgreSQL schema evolution. Migrations are versioned with the
compatible core release, verified before production, and applied through a
controlled promotion sequence. Compatibility-first changes are preferred;
destructive or irreversible changes require explicit review and a verified
forward-fix or restore path. Next.js does not execute commerce schema
migrations. (ADRs 0055, 0075)

Each client has a coordinated recovery manifest/set covering the application
artifacts, PostgreSQL recovery point, schema and migration version, required
object-storage media state, client configuration, presentation-bundle identity,
and other metadata needed to reproduce the deployment. Recovery first targets
an isolated environment, verifies database/media references and required
configuration, runs critical commerce and recovery checks, and confirms
orders, payment/refund references, inventory, configuration, and required
media before promotion.

Provider state is not assumed to be captured in one distributed snapshot.
After restoration, provider-linked operations that were pending, ambiguous, or
affected by the recovery point are reconciled through backend-owned provider
references and durable operation identities. Critical payment or refund
ambiguity must be resolved or explicitly isolated before promotion; unrelated
provider outages do not automatically block the whole restored environment.
(ADRs 0016, 0032, 0082, 0085-0086)

## Privacy and data lifecycle

V1 minimizes collection and persistence to what is required for approved
commerce, fulfillment, customer communication, payment/refund reconciliation,
reliability and recovery, security and abuse prevention, operational
attribution, and diagnostics. Raw card data, unnecessary behavioral tracking,
future-oriented profiling, and duplicate customer or commerce stores are not
introduced.

The backend owns data-class-specific retention, deletion, and media-cleanup
workflows, including coordination between Medusa metadata, object storage,
providers, logs, and backups/recovery copies. Operational, reconciliation,
security, accounting, tax, or legally required records are not removed merely
because customer-facing data is deleted.

Exact retention periods and legal or jurisdiction-specific rules remain
intentionally deferred because they are client-specific policy decisions. A
client-approved lifecycle matrix is required before production and must cover
the relevant data classes, owners, triggers, dependencies, media behavior,
provider constraints, backups, and approved exceptions. The policy is
versioned, approved, and activated only through a controlled backend,
deployment, or recovery path. Production has one explicitly active approved
policy version. Activation is architecturally atomic or equivalently
coordinated, concurrency-protected against the active version, durably
attributed, and idempotent; an invalid or partial activation fails closed.
(ADRs 0042, 0062, 0145-0152)

## Major flows

1. **Browse and present:** Next.js obtains catalog/search facts from the public
   Store API and client presentation content from the validated presentation
   bundle. Safe reads may be cached; Next.js produces the public route and SEO
   presentation without becoming catalog authority.
2. **Guest cart and checkout:** An opaque cart reference continues a Medusa
   guest cart. Medusa revalidates current price, availability, shipping, tax,
   and checkout state. Next.js renders the Payment Element, then requests the
   single backend checkout-completion workflow and renders its structured
   outcome.
3. **Payment and order completion:** Medusa and verified Stripe outcomes
   determine payment state, using automatic capture. The supported Medusa
   lifecycle creates the order, immutable transaction snapshot, and inventory
   reservation/transition without a storefront-owned sequence. Uncertainty
   remains pending or ambiguous until reconciliation.
4. **Post-order operations:** Medusa records the authoritative transition,
   creates notification work, and delivers asynchronously. Admin performs
   fulfillment and refunds through Medusa; a refund and a sellable return
   restock remain separate operations.
5. **Operational data changes:** Admin or authenticated backend automation
   invokes the same Medusa domain pathways. Bulk work is validated,
   idempotent, dependency-aware, resumable, cooperatively cancellable, and
   durably attributable.
6. **Promotion and recovery:** An immutable compatible release tuple is
   validated and promoted through isolated environments. Recovery restores the
   coordinated set into isolation, verifies local state, reconciles affected
   providers, and promotes only when the recovery gate is satisfied.

## Intentionally deferred implementation choices

The following remain open without weakening the architecture above:

- exact Next.js, Medusa, PostgreSQL, runtime, SDK, package-manager, and
  dependency versions;
- concrete hosting, deployment topology, CDN/DNS, object-storage, email, and
  observability/tool selections where the ADRs specify only provider-neutral
  boundaries;
- the exact Medusa checkout, payment, reservation, fulfillment, and lifecycle
  sequencing supported by the selected implementation version;
- implementation-specific modules, workflows, handlers, adapters, endpoint
  shapes, persistence layout, serialization, and test-tool choices;
- exact numeric limits, timeout and drain values, retry budgets, cache
  freshness windows, rate or abuse thresholds, and other operational
  parameters;
- browser/device support matrices, CI gates, verification depth, and
  monitoring/alert thresholds;
- client-specific origins, branding/content/media, commerce configuration,
  shipping/tax/payment values, alert policies, and approved extensions;
- exact retention periods, deletion/anonymization triggers, legal or
  jurisdictional exceptions, and other values in the client lifecycle matrix;
  and
- whether Medusa server/worker process separation is needed in production,
  based on implementation and operational evidence.

These are implementation or deployment follow-ups, not unresolved ownership
or boundary decisions. They must be selected, validated, and documented at the
appropriate implementation or client-production gate; they do not justify a
generic architecture `TBD`.
