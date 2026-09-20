# ADR-0045: Backend-owned durable idempotency identities

- Status: Accepted
- Date: 2026-09-19

## Context

V1 must safely retry cart completion, payment, refunds, fulfillment,
notifications, webhook processing, reconciliation, and other retry-sensitive
work without creating duplicate business effects.

Browser request IDs, provider-level idempotency, process memory, or logs alone
cannot identify a logical operation across retries, instances, provider calls,
and application restarts.

## Decision

Medusa/backend owns durable idempotency identities for retry-sensitive commerce
operations.

For V1, durable operation identities are used where appropriate for logical
operations such as:

- cart completion;
- payment initiation and processing;
- refunds;
- fulfillment;
- transactional notification delivery;
- webhook processing;
- reconciliation and retry-sensitive backend work.

These identities and relevant outcomes are persisted inside the Medusa-owned
PostgreSQL boundary.

Client-generated request IDs may be accepted for correlation and tracing, but
are not the sole authority for determining whether a logical operation already
occurred.

Provider idempotency keys are derived from or linked to the corresponding
durable backend operation identity where appropriate.

Retries resolve against the existing logical operation rather than creating a
new business effect.

## Alternatives considered

### Browser-generated idempotency only

This could help with duplicate clicks, but would not reliably survive sessions,
instances, application restarts, or malicious or inconsistent callers.

### Provider-level idempotency only

This protects selected external calls but does not protect local orders,
refunds, fulfillment, notifications, webhook processing, or reconciliation.

### Process memory or logs only

This would lose authoritative operation identity across restarts and cannot
provide durable recovery.

## Consequences

- Logical operations have a durable identity across retries and instances.
- Local and provider outcomes can be correlated for reconciliation.
- Idempotency state becomes part of the PostgreSQL recovery scope.
- Operation conflicts and reuse rules require explicit backend handling.

## Not decided by this ADR

This decision does not select key format, scope, retention period, expiration
rules, conflict behavior, or provider-specific key derivation.
