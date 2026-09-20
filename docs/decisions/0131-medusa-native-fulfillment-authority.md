# ADR-0131: Medusa-native fulfillment authority

- Status: Accepted refinement of ADR-0012, ADR-0021, ADR-0061, and ADR-0081
- Date: 2026-09-19

## Context

ADR-0081 selects Medusa-native fulfillment operations for V1. Fulfillment must
remain linked to orders and inventory without introducing carrier, label, 3PL,
or external orchestration requirements.

## Decision

Use Medusa-native fulfillment through Medusa Admin and approved Medusa-owned
operational workflows.

For V1:

- Medusa owns fulfillment state and lifecycle transitions;
- authorized operators perform fulfillment operations through Medusa Admin or
  approved backend workflows;
- shipping fulfillment and local-pickup fulfillment remain backend/admin-owned;
- fulfillment operations are durably linked to order and inventory state;
- retry-sensitive fulfillment preserves idempotency and avoids duplicate
  inventory effects; and
- Next.js may display customer-facing fulfillment state but does not own
  fulfillment transitions.

Carrier APIs, automatic label purchasing, courier integrations, 3PL
integrations, automatic tracking synchronization, and external fulfillment
orchestration are excluded from V1 unless a later demonstrated requirement
justifies them. Any later integration remains behind Medusa authority.

## Alternatives considered

### Storefront-owned fulfillment

This would move operational authority into Next.js and create a second
fulfillment state path.

### External fulfillment orchestration in V1

This adds carrier, credential, webhook, tracking, and reconciliation complexity
without an approved need.

## Consequences

- V1 shipping and pickup can operate through Medusa/Admin without external
  fulfillment infrastructure.
- Fulfillment shares backend idempotency, inventory, and traceability controls.
- Future carrier or 3PL needs require explicit adapter and reconciliation
  design.

## Not decided by this ADR

This decision does not define fulfillment statuses, shipment/pickup workflow,
tracking, labels, partial fulfillment, or Admin extensions.
