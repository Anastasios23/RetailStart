# ADR-0081: Medusa-native fulfillment operations

- Status: Accepted
- Date: 2026-09-19

## Context

ADR-0012 selects Medusa Admin for V1 operations, ADR-0021 makes Medusa
authoritative for inventory and fulfillment, ADR-0029 separates refunds from
restocking, and ADR-0079 makes reservations durable backend lifecycle state.

V1 requires shipping and local-pickup fulfillment without an external carrier,
label, 3PL, or fulfillment orchestration requirement.

## Decision

Use Medusa-native fulfillment operations for V1.

For V1:

- Medusa owns fulfillment state and lifecycle transitions.
- Authorized operators use Medusa Admin for fulfillment operations.
- Shipping and local-pickup fulfillment remain backend/admin-owned.
- Fulfillment updates follow the approved Medusa inventory lifecycle.
- Fulfillment consumes or finalizes relevant reserved inventory through the
  authoritative backend flow.
- Fulfillment operations are idempotent and protected against duplicate
  execution.
- Fulfillment state remains durably traceable with related order and inventory
  records.

No carrier, label, 3PL, or external fulfillment orchestration is introduced
without a confirmed requirement. Future integrations use backend-owned provider
adapters while Medusa remains the authoritative fulfillment system.

## Alternatives considered

### External carrier, label, or 3PL orchestration in V1

This could automate shipping operations but adds provider credentials,
webhooks, tracking, reconciliation, and inventory synchronization requirements
without an approved need.

### Next.js-owned fulfillment

This would move administrative fulfillment and inventory authority into the
storefront boundary and is not acceptable.

### Separate fulfillment state store

This would duplicate order and inventory lifecycle state and create additional
reconciliation risk.

## Consequences

- V1 fulfillment remains within Medusa/Admin and the backend authorization
  boundary.
- Shipping and pickup can be operated without a carrier integration.
- Fulfillment and inventory transitions can share backend idempotency,
  concurrency, and traceability controls.
- Future tracking, labels, carrier, or 3PL requirements require explicit
  adapter and reconciliation design.

## Not decided by this ADR

This decision does not select fulfillment statuses, shipment or pickup workflow,
tracking model, labels, carrier integrations, partial fulfillment behavior, or
Medusa Admin extensions.

