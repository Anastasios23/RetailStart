# ADR-0080: Medusa-owned checkout-completion workflow

- Status: Accepted
- Date: 2026-09-19

## Context

ADR-0002 makes Medusa authoritative for commerce transitions, ADR-0020 makes
Medusa authoritative for guest checkout, ADR-0045 requires durable logical
operation identities, and ADR-0078 requires final authoritative revalidation.

The storefront must request completion without becoming an orchestrator for
payment, inventory, and order creation.

## Decision

Use one Medusa-owned authoritative checkout-completion workflow.

For V1, Next.js requests checkout completion through the approved Store API
boundary, while Medusa owns the final completion flow and coordinates the
required final steps, including:

- cart validation;
- product and variant revalidation;
- authoritative repricing;
- inventory availability validation;
- shipping validation;
- tax validation;
- inventory reservation according to the supported Medusa lifecycle;
- payment processing and authoritative payment-state resolution;
- order creation;
- transaction-time order snapshot creation;
- durable outcome, idempotency, retry, and reconciliation handling.

The workflow uses the durable logical operation identity established by earlier
ADRs, protects against duplicate execution, preserves authoritative state
across retries and timeouts, and returns structured outcomes for changed
prices, unavailable inventory, failed payment, ambiguous provider state, and
other recoverable conditions.

Next.js does not independently sequence authoritative payment, inventory, and
order operations. The implementation follows Medusa's supported native
cart/order/payment/inventory lifecycle wherever it satisfies the approved
requirements.

The exact ordering between payment session handling, authorization/capture,
reservation, order placement, and other completion steps is verified against
the current Medusa-supported lifecycle during implementation rather than
assumed by this ADR.

## Alternatives considered

### Next.js-orchestrated completion

This increases race conditions, partial completion, duplicate effects, and
client-side authority risk across payment, inventory, and order state.

### Separate checkout or order-completion service

This would create a second commerce authority and add another transaction,
reconciliation, and deployment boundary.

### Custom lifecycle ordering overriding Medusa

This risks bypassing supported invariants and creates unnecessary maintenance
when Medusa already satisfies the requirement.

## Consequences

- The final commerce transition has one backend-owned authority.
- Retries and timeouts resolve against durable operation and provider state.
- Next.js remains responsible for customer interaction and outcome
  presentation, not commerce sequencing.
- Implementation must verify the current Medusa native lifecycle before adding
  custom workflow behavior.

## Not decided by this ADR

This decision does not select exact workflow steps, transaction boundaries,
payment capture policy, reservation point, provider-status checks, or API
response structure.

