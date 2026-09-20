# ADR-0104: Resumable bulk-operation units

- Status: Accepted refinement of ADR-0045, ADR-0098, ADR-0100, and ADR-0102
- Date: 2026-09-19

## Context

ADR-0100 requires idempotent, validated backend-owned bulk operations. Large
imports and onboarding activities should not require one long-running database
transaction or become unsafe to retry after partial failure.

## Decision

Represent each bulk operation with one durable overall operation identity and
process it as bounded logical units through approved Medusa domain pathways.

For V1:

- each unit has durable status and idempotency where required;
- overall progress and outcome remain durably visible;
- successfully completed units are not repeated during retry;
- failed units remain identifiable and retryable when safe;
- partial completion is explicitly represented; and
- operator recovery is available when automatic retry is unsafe.

Preserve appropriate transaction atomicity inside each individual Medusa domain
operation. Do not require one long-running transaction for a large operation,
restart the entire operation when only some units failed, or use best-effort
processing without durable progress and outcome state.

## Alternatives considered

### One transaction for the entire operation

This provides broad atomicity, but creates long transactions, large rollback
scope, and impractical recovery for larger imports or onboarding.

### Best-effort processing without durable unit state

This is simple, but makes retries unsafe and obscures which business effects
already occurred.

## Consequences

- Partial bulk completion is visible and resumable.
- Unit-level idempotency prevents duplicate business effects on retry.
- Domain-level transaction guarantees remain intact within each unit.
- Bulk operations need durable progress and recovery records.

## Not decided by this ADR

This decision does not define unit size, dependency ordering, progress schema,
retry or backoff rules, concurrency, transaction boundaries, or operator
recovery UX.
