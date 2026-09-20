# ADR-0129: Backend-owned refund lifecycle

- Status: Accepted refinement of ADR-0029, ADR-0071, ADR-0072, and ADR-0127
- Date: 2026-09-19

## Context

ADR-0029 assigns manual refunds to Medusa Admin, while ADR-0125 and ADR-0127
require provider adapters and explicit ambiguity handling. Refunds must be
durable, idempotent, and independently traceable from orders and inventory.

## Decision

Only an authorized operator initiates a full or partial refund through
Medusa-owned operational interfaces. Medusa creates and owns the durable refund
operation, and the Stripe adapter performs the provider-specific request.

The refund operation retains where relevant:

- durable refund identity;
- related order and payment references;
- provider refund reference;
- current refund status;
- correlation identity;
- timestamps; and
- failure, ambiguity, retry, and reconciliation state.

Retry-sensitive refunds reuse the logical backend refund identity and provider
idempotency mechanisms where supported. Ambiguous outcomes are reconciled
before a potentially duplicate refund is issued. Local success is recorded only
after sufficient authoritative provider evidence confirms it.

Failed or ambiguous refunds remain visible and recoverable through the
backend-owned operational lifecycle. Customer refund confirmation is generated
only after authoritative successful state.

Do not let Next.js or normal operator workflows call Stripe directly, infer
success from browser or transport results, automatically refund from storefront
state, or create a new refund operation after ambiguity.

## Alternatives considered

### Direct operator or storefront Stripe control

This bypasses Medusa authority and risks duplicate, incomplete, or
untraceable refunds.

### New refund operation after timeout

This breaks logical idempotency and may execute duplicate provider refunds.

## Consequences

- Refunds share Medusa authorization, identity, status, and reconciliation
  controls.
- Customer messaging follows provider-confirmed financial state.
- Refund ambiguity can be recovered without guessing from transport behavior.

## Not decided by this ADR

This decision does not define refund API shape, provider idempotency-key format,
partial-refund rules, retry policy, or operator UI.
