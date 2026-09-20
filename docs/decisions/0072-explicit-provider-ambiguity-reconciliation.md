# ADR-0072: Explicit provider ambiguity and backend reconciliation

- Status: Accepted
- Date: 2026-09-19

## Context

ADR-0030 requires structured ambiguous outcomes, ADR-0032 requires durable
provider reconciliation, ADR-0045 requires durable idempotency identities, and
ADR-0071 places provider-specific behavior behind backend adapters.

Transport failure does not prove that an external provider operation failed.
Retries must therefore resolve the existing operation against authoritative
provider evidence rather than create duplicate business effects.

## Decision

Use explicit provider failure and ambiguity handling with backend-owned
reconciliation.

For V1:

- Provider timeouts, connection failures, and incomplete responses are not
  automatically treated as definitive business failure.
- Unknown provider outcomes are recorded as explicit pending or ambiguous
  states.
- Retries reuse the same durable backend operation identity.
- Provider idempotency keys remain linked to that operation where supported.
- Authoritative provider status is checked before retrying payment, refund, or
  other duplicate-sensitive operations.
- Reconciliation updates local state only after authoritative evidence is
  obtained.
- Operator escalation may be required when ambiguity cannot be resolved
  automatically.

Non-critical side effects such as transactional email may fail independently of
authoritative commerce state and recover asynchronously without rolling back
the commerce operation.

V1 does not automatically switch payment, refund, email, or storage providers.
Automatic cross-provider failover requires a separate future decision based on
a concrete availability requirement.

## Alternatives considered

### Treat every timeout as confirmed failure

This can cause duplicate payments, refunds, or other effects when the provider
actually succeeded but the response was lost.

### Automatic cross-provider failover

This could improve apparent availability but creates duplicate-effect,
capability, currency, and reconciliation risks across providers.

### Create a new operation for every retry

This breaks idempotency and can produce duplicate business effects.

## Consequences

- Payment, refund, and other duplicate-sensitive operations can remain
  explicitly unresolved until authoritative evidence is available.
- Reconciliation and operator escalation are first-class recovery paths.
- Non-critical provider failures do not roll back successful commerce state.
- Provider adapters must support status lookup, idempotency linkage, and safe
  outcome normalization where the provider permits it.

## Not decided by this ADR

This decision does not select timeout thresholds, retry or backoff schedules,
circuit breaking, provider-status queries, escalation rules, or operator
workflow.

