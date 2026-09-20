# ADR-0100: Idempotent bulk commerce-data operations

- Status: Accepted refinement of ADR-0027, ADR-0032, ADR-0045, ADR-0097, and
  ADR-0098
- Date: 2026-09-19

## Context

ADR-0099 requires live commerce mutations to use Medusa-owned boundaries.
Bulk onboarding and approved commerce-data migrations still need a safe way to
process multiple records without duplicate effects or opaque partial failure.

## Decision

Use idempotent, validated backend-owned operations for bulk imports, onboarding,
and approved commerce-data migrations.

For V1, bulk operations must:

- validate input before production application;
- remain environment-specific;
- use durable logical operation identities;
- use Medusa-owned mutation boundaries;
- record progress, failures, and final outcomes durably where recovery
  requires it;
- support safe retry without duplicating business effects;
- surface partial or failed processing explicitly;
- support operator-controlled recovery when automatic retry is unsafe; and
- preserve Medusa domain invariants.

Use Medusa's native import, workflow, or service capabilities where they
satisfy the requirement before introducing custom bulk-processing infrastructure.
No separate import application or service is introduced in V1.

Do not use one-off direct SQL as the normal bulk mechanism, treat seed scripts
as an ongoing production data-management system, or rerun failed operations
without idempotency and progress awareness.

## Alternatives considered

### One-off SQL or seed scripts

These can be fast, but are difficult to validate, retry, trace, and keep
aligned with Medusa lifecycle behavior.

### Separate catalog-import platform

This could support larger onboarding workflows, but adds another application
and data authority without an approved V1 need.

## Consequences

- Bulk changes remain inside Medusa's domain authority.
- Partial failures and retries are visible and recoverable.
- Input validation and operation tracking are required before production use.
- Native Medusa capabilities remain the default implementation path.

## Not decided by this ADR

This decision does not define import formats, tooling, approval gates, dry-run
behavior, batching, rollback strategy, or detailed progress-record schema.
