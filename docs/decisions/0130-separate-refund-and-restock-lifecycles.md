# ADR-0130: Separate refund and restock lifecycles

- Status: Accepted refinement of ADR-0021 and ADR-0029
- Date: 2026-09-19

## Context

ADR-0021 makes Medusa authoritative for inventory, reservations, fulfillment,
and returns. ADR-0029 separates successful refunds from physical return and
restocking decisions. Financial and physical outcomes may occur at different
times or not at all.

## Decision

Keep refund and inventory restocking as separate authoritative lifecycles.

For V1:

- a successful refund does not automatically increase available inventory;
- refund status represents the financial operation only;
- returned inventory is restocked through the Medusa/backend return or receive
  process;
- an authorized operator confirms physical receipt where required;
- an item must be confirmed sellable before available stock increases;
- damaged, missing, incomplete, non-returned, or non-sellable goods do not
  become available stock; and
- refund and inventory operations retain separate identities, statuses,
  attribution, idempotency, and traceability.

Either lifecycle may complete independently when the business case requires it.
This supports refund without return, refund before arrival, damaged return,
partial refund without restocking, and valid sellable return to inventory.

Do not restock because a refund succeeded, treat a Stripe refund event as proof
of physical return, or make inventory availability depend directly on refund
state.

## Alternatives considered

### Automatic restock after refund

This risks making unreturned, damaged, or otherwise unsellable goods available.

### Never restock returned inventory

This prevents valid returned-and-sellable goods from re-entering stock.

## Consequences

- Financial and physical return decisions remain independently correct.
- Operators must complete the appropriate receive/sellability workflow before
  restocking.
- Refund and inventory reconciliation can proceed separately.

## Not decided by this ADR

This decision does not define return statuses, receive workflow, sellability
criteria details, restock timing, or Admin UI.
