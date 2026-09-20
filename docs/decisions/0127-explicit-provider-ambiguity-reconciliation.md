# ADR-0127: Explicit provider ambiguity and reconciliation

- Status: Accepted refinement of ADR-0032, ADR-0072, ADR-0125, and ADR-0126
- Date: 2026-09-19

## Context

External providers are not part of the local PostgreSQL transaction. A timeout,
connection failure, incomplete response, or lost acknowledgement therefore may
leave the provider outcome unknown. ADR-0045 gives the backend operation
identity authority across retries, and ADR-0126 makes verified webhooks a
backend-owned reconciliation input.

## Decision

Record an explicit pending or ambiguous operational state whenever a
duplicate-sensitive provider outcome is unknown.

The original durable backend operation identity remains authoritative across
retries and reconciliation. Where supported, the same provider idempotency
identity is reused for the same logical provider operation. Before issuing
another duplicate-sensitive operation, the backend checks authoritative
provider status when the original outcome may already exist.

Local authoritative state changes only after sufficient authoritative evidence.
Reconciliation may use verified provider webhooks, explicit provider status
retrieval, provider operation references, and backend durable operation records.

Retries preserve identity and never silently create a new logical operation.
Ambiguity that cannot be resolved safely automatically escalates to controlled
operator recovery.

Do not classify every timeout as failure, blindly issue a new provider request,
create a new operation identity after a timeout, infer provider outcome solely
from transport behavior, or let Next.js resolve provider ambiguity.

## Alternatives considered

### Treat transport failure as definitive business failure

This simplifies state handling, but can create duplicate payments, refunds, or
other provider effects when the provider actually succeeded.

### Blind retry with a new operation

This may recover some failures, but cannot safely distinguish unknown outcome
from provider failure and breaks idempotent logical identity.

## Consequences

- Unknown provider outcomes remain visible rather than being falsely finalized.
- Reconciliation becomes an explicit backend operation.
- Operator recovery is required for ambiguity that cannot be proven safe.

## Not decided by this ADR

This decision does not define timeout thresholds, retry schedules, status-query
cadence, provider-specific reconciliation APIs, or operator escalation UX.
