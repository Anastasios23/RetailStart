# ADR-0062: Backend-owned data lifecycle workflows

- Status: Accepted
- Date: 2026-09-19

## Context

ADR-0042 establishes V1 data minimization, ADR-0016 requires verified backup
and restore coverage, and ADR-0043 places durable operational and
reconciliation records inside the Medusa/PostgreSQL boundary.

Retention and deletion must therefore be coordinated by data class and must
not be left to unrelated provider defaults or to independent systems deleting
records without considering required relationships.

## Decision

Use backend-owned data lifecycle workflows for retention and deletion.

For V1, Medusa/backend owns the lifecycle policy and execution boundary for:

- guest/customer-related commerce data;
- orders;
- payment and refund operational records;
- fulfillment data;
- notification records;
- reconciliation and idempotency records;
- other durable operational records.

Object-storage deletion remains backend-authorized and coordinated with the
related media metadata and reference lifecycle.

Provider-managed retention settings may support implementation but do not
independently define the application's retention policy. Lifecycle behavior is
data-class-specific rather than one blanket rule for all records.

Deletion workflows must account for related references and dependencies so they
do not corrupt required commerce, reconciliation, accounting, recovery, or
security records. Backups are included in lifecycle design rather than assumed
to disappear immediately when primary records are deleted.

No separate privacy or data-lifecycle platform is required for V1 without a
demonstrated requirement.

## Alternatives considered

### Provider-default retention only

This is operationally convenient but fragments policy across PostgreSQL,
object storage, email, observability, and other providers without a unified
application boundary.

### One blanket retention rule

This is simple but cannot safely account for different commerce, accounting,
recovery, security, media, and notification dependencies.

### Independent deletion by each system

This risks broken references, incomplete deletion, lost reconciliation context,
and inconsistent client behavior.

## Consequences

- Retention and deletion are explicit backend-owned workflows rather than
  provider accidents.
- Data classes can preserve required commerce and recovery history while
  allowing unnecessary data to be removed.
- Object media, primary records, related references, and backups require
  coordinated lifecycle design.
- Production readiness depends on approved and verified lifecycle policy where
  legal or operational requirements apply.

## Not decided by this ADR

This decision does not select retention periods, deletion obligations,
backup treatment, legal or accounting requirements, data-subject request
handling, provider deletion guarantees, workflow implementation, soft versus
hard deletion, anonymization, backup expiration handling, or provider cleanup
behavior.

Those details must be defined from the applicable client jurisdiction, legal
requirements, accounting obligations, provider behavior, and approved privacy
policy before production where applicable.

