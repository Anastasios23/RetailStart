# ADR-0029: Backend-owned refunds and separate return restocking

- Status: Accepted
- Date: 2026-09-19

## Context

V1 supports authorized-admin full and partial refunds, provider-confirmed
payment status, manual return management, and inventory updates after a
physically returned item is confirmed sellable. A refund is a financial event;
restocking is a physical inventory decision.

Coupling the two would incorrectly increase available inventory for refunded
items that have not been returned or cannot be resold.

## Decision

Medusa Admin owns manual refund and return-related operational decisions.

For V1:

- an authorized admin may initiate full or partial refunds through Medusa;
- the configured Stripe provider processes the refund;
- Medusa records the refund attempt and final provider-confirmed status;
- failed refunds remain visible and retryable without duplicate refund
  execution;
- customer refund confirmation is sent only after provider-confirmed success;
- a successful refund does not automatically increase available inventory;
- inventory is restocked only after a physical return is received and the admin
  confirms that it is sellable;
- damaged or non-sellable returned items do not return to available stock.

Do not couple successful refunds directly to inventory restocking. Do not
introduce a separate returns or RMA platform in V1.

## Alternatives considered

### Automatic refund-to-restock coupling

This could reduce manual steps, but would treat every refunded item as
physically returned and sellable without evidence.

### Separate returns or RMA platform

This could support richer self-service workflows, but is outside the approved
V1 scope and would add another operational integration boundary.

## Consequences

- Financial refund status and physical inventory status remain independent.
- Failed refund retry behavior remains within the backend payment authority.
- Admin confirmation is required before returned stock affects availability.
- Future self-service returns, exchanges, or RMA automation require a separate
  scope and architecture decision.

## Not decided by this ADR

This decision does not select return data fields, warehouse processes, refund
approval policy, provider API details, or future RMA integrations.
