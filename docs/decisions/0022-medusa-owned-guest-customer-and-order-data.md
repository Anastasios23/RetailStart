# ADR-0022: Medusa-owned guest customer and order data

- Status: Accepted
- Date: 2026-09-19

## Context

Guest checkout requires contact and delivery information, while orders,
payments, refunds, and transactional notifications require durable operational
records. V1 excludes authenticated customer accounts, a separate CRM, and a
second customer database.

The distinction between a guest customer record used for an order and an
authenticated customer account must remain explicit.

## Decision

Medusa owns the minimum guest customer and order data required for V1 commerce
operations, including:

- guest contact information required for the order;
- shipping or pickup details;
- order data;
- payment and refund references and statuses;
- notification-related operational data required for transactional messaging.

Next.js keeps only transient form state, opaque cart/session/continuation
references, and temporary UI state that does not become a second source of
customer or order truth.

If Medusa creates or requires a guest customer record internally, that record is
not an authenticated customer account.

Do not introduce a separate customer database in Next.js, a CRM or
customer-data platform in V1, or duplicated persistent customer/order data
outside the commerce backend.

## Alternatives considered

### Persistent customer/order data in Next.js

This could simplify some storefront operations, but would duplicate sensitive
data and create synchronization, privacy, and deletion risks.

### Separate CRM or customer-data platform

This could support future customer management or marketing, but those
capabilities are outside V1 and would add another data boundary.

## Consequences

- Operational customer and order data has one authoritative owner.
- Guest checkout remains distinct from authenticated identity management.
- The storefront must treat form values and continuation references as
  temporary interaction state.
- Retention and deletion decisions can be made later without first reconciling
  duplicate commerce records.

## Not decided by this ADR

This decision does not select retention periods, deletion workflows, privacy
policy, consent flows, analytics, or customer-account architecture for a future
version.
