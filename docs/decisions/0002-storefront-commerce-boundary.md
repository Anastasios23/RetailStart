# ADR-0002: Storefront and commerce-backend responsibility boundary

- Status: Accepted
- Date: 2026-09-19

## Context

Retail Starter V1 requires consistent state across checkout, payments, orders,
inventory, shipping, tax, fulfillment, refunds, and safe retries. The
storefront must provide a responsive customer experience without creating a
second source of truth for critical commerce state.

## Decision

Next.js owns presentation, navigation, customer interaction, and orchestration
of storefront flows.

Medusa is the authoritative commerce system for:

- products and variants;
- pricing;
- inventory;
- cart and checkout state;
- shipping and tax calculation;
- payments and payment status;
- orders;
- fulfillment;
- refunds.

The storefront must not maintain a competing commerce ledger or write directly
to the commerce database. Client-side or storefront validation may improve the
user experience, but authoritative validation and state transitions must occur
through the commerce backend.

## Alternatives considered

### Split commerce authority between Next.js and Medusa

This could make selected storefront flows locally convenient, but would create
synchronization obligations and increase the risk of overselling, duplicate
orders, inconsistent payment state, and unsafe retries.

### Use a custom commerce backend or ledger alongside Medusa

This would provide maximum control over business behavior, but would duplicate
critical commerce responsibilities and add substantial V1 implementation,
recovery, and operational complexity.

## Consequences

- Critical commerce state has one authoritative owner.
- The storefront remains focused on customer experience and flow orchestration.
- Payment, order, inventory, fulfillment, and refund transitions must be
  represented through the commerce backend's supported interfaces.
- Storefront code must handle asynchronous or failed backend outcomes clearly
  rather than assuming a local transition succeeded.
- Any V1 behavior not covered by the commerce backend must be evaluated as an
  explicit backend extension or a scope decision; it must not be hidden in the
  storefront.

## Not decided by this ADR

This decision does not determine which Medusa modules, workflows, plugins, or
custom backend extensions will implement each responsibility. It also does not
select API transport details, webhooks, authentication, admin UI boundaries, or
deployment topology.
