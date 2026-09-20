# ADR-0043: PostgreSQL-owned operational and reconciliation records

- Status: Accepted
- Date: 2026-09-19

## Context

V1 requires durable payment, refund, webhook, notification, retry,
idempotency, and reconciliation information. External observability systems are
useful for diagnosis but cannot guarantee durable business-state recovery.

Adding a separate operational database would duplicate the client’s durable
authority boundary and introduce synchronization and backup concerns.

## Decision

Keep durable operational and reconciliation business records inside the
Medusa-owned PostgreSQL boundary.

For V1, PostgreSQL persists authoritative records needed for areas such as:

- payment status and provider references;
- refund attempts and outcomes;
- webhook event identities and processing state where required;
- notification delivery and retry state where required;
- reconciliation-required states;
- retry and idempotency information that is part of business recovery;
- other durable operational state required to safely determine what happened.

External observability systems may store logs, metrics, traces, alerts, and
diagnostic context, but they are not authoritative for commerce or
reconciliation truth.

Do not create a separate operational database without a demonstrated
requirement, rely only on logs for operational history, require observability
retention for business-state recovery, or duplicate authoritative operational
records across independent databases.

These records may use dedicated Medusa modules or backend-owned persistence
structures while remaining inside the same PostgreSQL authority boundary.

## Alternatives considered

### Separate operational database

This could isolate workloads, but would duplicate durable authority and add
synchronization, backup, privacy, and consistency obligations.

### Logs as the operational record

This would reduce persistence design work, but cannot guarantee durable status
history, reconciliation, or safe recovery after log loss.

## Consequences

- Commerce and recovery truth share one durable database authority per client.
- Observability tools can change without changing business-state recovery.
- PostgreSQL schema and workload design must account for operational records as
  well as commerce entities.
- Archival and retention decisions must preserve required recovery evidence.

## Not decided by this ADR

This decision does not select table or schema design, Medusa module boundaries,
log storage, monitoring retention, or archival strategy.
