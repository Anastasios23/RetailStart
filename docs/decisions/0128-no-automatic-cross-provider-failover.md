# ADR-0128: No automatic cross-provider failover in V1

- Status: Accepted refinement of ADR-0071, ADR-0072, ADR-0125, ADR-0127, and
  ADR-0126
- Date: 2026-09-19

## Context

ADR-0125 localizes provider behavior in backend adapters, and ADR-0127
requires explicit ambiguity and reconciliation. Automatically switching
providers during uncertainty would require cross-provider identity, idempotency,
webhook, refund, reversal, and reconciliation semantics.

## Decision

Do not implement automatic cross-provider failover in V1.

For each external capability, one configured provider is authoritative in the
active environment. Provider failure produces the appropriate backend-owned
degraded, failed, pending, or ambiguous state. Reconciliation and controlled
recovery remain within that configured provider boundary.

Switching providers is not an automatic retry strategy. A planned provider
change is an explicit controlled configuration or migration event, not failover.

Do not automatically send the same logical side effect to another provider
after uncertainty or failure, perform ad-hoc operator switching, or treat
provider failover as ordinary retry.

## Alternatives considered

### Automatic provider switching

This may improve apparent availability, but risks duplicate effects, mismatched
provider references, and complex reconciliation.

### Ad-hoc manual provider switching

This avoids automatic duplication, but still lacks explicit migration and
outstanding-operation semantics.

## Consequences

- V1 provider behavior is simpler to reconcile and operate.
- Provider outages remain explicit capability states rather than hidden
  cross-provider transitions.
- Future failover requires a separate architecture decision covering provider
  selection, identity, idempotency, outstanding operations, webhooks, refunds,
  credentials, recovery, observability, compatibility, and rollback.

## Not decided by this ADR

This decision does not select providers, migration procedures, outage
thresholds, or future failover architecture.
