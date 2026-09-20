# ADR-0079: Refinement of durable inventory reservations

- Status: Accepted refinement of ADR-0021 and ADR-0044
- Date: 2026-09-19

## Context

ADR-0021 establishes the Medusa-owned inventory and fulfillment lifecycle, and
ADR-0044 establishes Medusa/PostgreSQL as the concurrency boundary for
competing commerce operations.

Q79 clarifies that inventory reservations are durable backend lifecycle state,
not browser or session behavior, while preserving Medusa's native lifecycle as
the implementation starting point.

## Relationship to ADR-0021 and ADR-0044

This record refines those decisions. It does not create a separate reservation
authority or override a supported Medusa inventory workflow unnecessarily.

## Decision

Use backend-owned inventory reservations with an explicit durable lifecycle.

For V1:

- Medusa owns creation, tracking, revalidation, expiration, release, and
  consumption of inventory reservations.
- Reserved inventory is excluded from availability for competing purchases.
- Reservation state is tied to the authoritative cart/order commerce
  lifecycle.
- Cancellation, expiry, failed completion, and other valid release conditions
  are handled through backend-owned workflows.
- Fulfillment converts relevant reserved inventory into the final stock
  transition according to the approved Medusa inventory lifecycle.
- Reservation cleanup and recovery survive application restarts where
  required.
- Next.js may display availability but does not create, release, extend, or
  infer authoritative reservation state.

The exact reservation creation point must be verified against Medusa's
supported cart, order, and inventory workflow during implementation.

## Alternatives considered

### Storefront-owned holds

This cannot safely coordinate concurrency, restarts, checkout retries,
fulfillment, and authoritative stock state.

### Browser or session lifetime as reservation lifetime

This is not durable or reliable and would allow abandoned sessions to retain
or incorrectly release stock.

### Separate reservation ledger

This would duplicate inventory authority and complicate reconciliation with
Medusa's supported lifecycle.

### Delay every reservation until after final payment

This may permit competing checkouts to oversell stock and is not acceptable if
it violates the approved no-overselling behavior.

## Consequences

- Reservation correctness remains inside Medusa/PostgreSQL concurrency and
  recovery boundaries.
- Reservation cleanup and recovery are backend operational concerns.
- Implementation must prefer and verify Medusa's native reservation lifecycle
  before introducing custom behavior.
- The storefront can display availability without becoming a stock authority.

## Not decided by this ADR

This decision does not select reservation timing, expiration policy, release
triggers, persistence details, concurrency controls, or cleanup and recovery
jobs.

