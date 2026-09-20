# ADR-0076: Controlled post-order lifecycle changes

- Status: Accepted
- Date: 2026-09-19

## Context

ADR-0068 requires a stable transaction-time order snapshot, and ADR-0069
requires Medusa-owned monetary authority. Post-creation operational changes
must not rewrite the original facts or create a second adjustment authority.

## Decision

Preserve the transaction-time order snapshot and allow only controlled
backend-owned post-creation lifecycle changes.

For V1:

- Historical order facts remain stable after order creation.
- Later changes use explicit Medusa/backend-owned workflows.
- Supported lifecycle changes may include payment-status transitions,
  fulfillment, refunds, returns, inventory adjustments, and explicitly
  supported order adjustments.
- Any post-order adjustment is backend-validated, durably traceable,
  idempotent where retries are possible, concurrency-protected, and
  reconcilable with payment, refund, inventory, and fulfillment state.
- The original transaction facts needed to understand what was purchased are
  retained.

Normal administrative editing does not directly overwrite historical order-line
prices or quantities or silently rewrite original totals. A business change to
an existing order is represented as an explicit adjustment or lifecycle
operation.

## Alternatives considered

### Direct editing of historical order facts

This risks breaking payment reconciliation, refund correctness, inventory
history, fulfillment state, and the transaction snapshot.

### Separate adjustment or accounting authority

This could preserve changes independently but would create a second authority
outside Medusa and complicate reconciliation.

### Recalculate the order from current catalog configuration

This would destroy the transaction-time meaning of the original purchase.

## Consequences

- Historical order facts remain understandable and auditable.
- Post-order business changes require explicit backend workflows and state
  transitions.
- Adjustment operations must participate in idempotency, concurrency,
  notification, and reconciliation design.
- Operational flexibility is narrower than unrestricted manual editing, but
  commerce and financial integrity are preserved.

## Not decided by this ADR

This decision does not select permitted adjustment types, authorization rules,
adjustment representation, customer notification behavior, or reconciliation
semantics.

