# ADR-0132: Backend-owned reservation lifecycle

- Status: Accepted refinement of ADR-0021, ADR-0044, and ADR-0079
- Date: 2026-09-19

## Context

ADR-0079 requires durable Medusa-owned reservations, and ADR-0044 makes
Medusa/PostgreSQL the concurrency boundary. Reservation timing must remain
compatible with the supported Medusa inventory and fulfillment lifecycle.

## Decision

Medusa/backend exclusively owns reservation creation, maintenance, release, and
consumption or finalization.

For V1:

- inventory committed to an active reservation is excluded from competing
  availability;
- cancellation, expiry, failed checkout/completion, and other valid release
  conditions use backend-owned lifecycle mechanisms;
- fulfillment updates inventory through the supported Medusa inventory and
  fulfillment lifecycle;
- returned inventory becomes available only through the approved receive and
  sellability lifecycle; and
- Next.js may display backend-provided availability but cannot create, release,
  extend, calculate, or infer authoritative reservation state.

Payment state alone does not define inventory availability, and refund success
does not directly restock inventory.

During implementation, verify the supported Medusa reservation lifecycle and
use native behavior wherever it satisfies these invariants. Any deviation or
custom lifecycle requires evidence of a real gap and an explicit architecture
decision.

## Alternatives considered

### Storefront-owned reservation state

This depends on browser/session behavior and cannot protect shared inventory
against competing purchases.

### Delay all reservation authority until payment completion

This may reduce temporary holds, but can violate the approved no-overselling
requirement during checkout.

## Consequences

- Reservation correctness remains inside the Medusa concurrency and domain
  boundary.
- Storefront availability is descriptive rather than authoritative.
- Native Medusa lifecycle verification is a required implementation gate.

## Not decided by this ADR

This decision does not freeze reservation timing, expiration, persistence,
release triggers, concurrency controls, or cleanup implementation.
