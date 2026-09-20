# ADR-0044: Backend-owned commerce concurrency control

- Status: Accepted
- Date: 2026-09-19

## Context

Competing checkout, inventory, payment, refund, and fulfillment requests can
arrive concurrently or reach different application instances. V1 must prevent
overselling, duplicate orders, duplicate refunds, and conflicting fulfillment
state.

Browser locks, process-local locks, and request ordering cannot protect shared
commerce state across instances.

## Decision

Medusa/PostgreSQL provides the authoritative concurrency boundary for competing
commerce operations.

For V1:

- cart completion passes through the authoritative backend flow;
- final inventory availability is re-checked where the backend performs the
  relevant state transition;
- inventory reservations and order creation use backend-owned transactional and
  concurrency controls;
- payment and refund operations use durable idempotency identities and
  authoritative status checks;
- fulfillment transitions are protected against duplicate execution;
- database constraints and transactional guarantees protect invariants where
  appropriate;
- concurrency correctness does not depend on a single application instance.

Do not rely on browser-side locking, process-local locks for shared commerce
correctness, sequential request assumptions, or eventual consistency where it
could permit overselling, duplicate orders, duplicate refunds, or conflicting
fulfillment state.

## Alternatives considered

### Browser or process-local locking

This could reduce duplicate clicks in one client instance, but cannot serialize
shared state across instances or protect backend invariants.

### Eventual consistency for critical transitions

This could simplify distributed flows, but would allow conflicting inventory,
order, payment, refund, or fulfillment outcomes.

## Consequences

- Critical transitions are protected at the data and backend workflow boundary.
- Application replacement or parallel requests do not change commerce
  correctness assumptions.
- Concurrency failures must be surfaced as structured backend outcomes rather
  than hidden in the storefront.
- Database and provider integration design must preserve these invariants.

## Not decided by this ADR

This decision does not select PostgreSQL isolation level, locking strategy,
unique constraints, Medusa workflow transaction boundaries, or
provider-specific concurrency controls.
