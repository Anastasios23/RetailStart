# ADR-0133: Medusa-owned checkout-completion authority

- Status: Accepted refinement of ADR-0002, ADR-0030, ADR-0078, ADR-0080, and
  ADR-0132
- Date: 2026-09-19

## Context

ADR-0080 establishes one Medusa-owned checkout-completion workflow, while
ADR-0132 keeps reservations inside the backend lifecycle. The storefront may
guide customer interaction but must not become a second authority for payment,
inventory, reservation, pricing, shipping, tax, or order transitions.

## Decision

Next.js requests checkout completion through the public Store API, and Medusa
owns the authoritative completion workflow.

The Medusa-owned boundary preserves invariants around:

- cart, product, and variant validity;
- authoritative repricing;
- inventory availability and reservations;
- shipping and tax validation/calculation;
- payment processing and payment-state resolution;
- order creation and transaction-time snapshot;
- idempotency and concurrency;
- structured outcomes; and
- retry and reconciliation state.

Next.js may guide checkout UI steps, but those steps do not become independent
commerce authorities. A successful browser interaction is not evidence that
checkout completed successfully; Medusa/backend state is authoritative.

Do not let Next.js coordinate authoritative transitions independently, let the
browser create authoritative order state, create a separate checkout service,
or duplicate commerce rules in the storefront.

## Alternatives considered

### Next.js-coordinated checkout

This risks duplicate payment, inventory, pricing, and order authority in the
storefront.

### Separate checkout service

This adds another commerce authority and reconciliation boundary without a V1
requirement.

## Consequences

- Checkout correctness has one backend-owned transition boundary.
- Storefront UX can evolve without becoming a commerce ledger.
- Checkout recovery and idempotency remain tied to Medusa operation state.

## Not decided by this ADR

This decision does not define internal workflow step ordering, API schema,
payment capture implementation, or checkout UI sequence.
