# ADR-0099: Medusa-owned live commerce mutations

- Status: Accepted refinement of ADR-0002, ADR-0021, ADR-0029, ADR-0044,
  ADR-0055, and ADR-0098
- Date: 2026-09-19

## Context

ADR-0002 makes Medusa authoritative for commerce state. ADR-0098 defines
controlled commerce-data operations across environments. Direct database writes
could bypass Medusa validation, lifecycle rules, idempotency, concurrency, and
operational records.

## Decision

All live commerce-data writes must use Medusa-owned mutation boundaries,
including Medusa Admin, supported Medusa services, workflows, handlers, and
controlled backend-owned operational or import processes.

Normal catalog, pricing, inventory, order, refund, fulfillment, shipping, tax,
and related commerce mutations must not write PostgreSQL tables directly.

Direct SQL is reserved for narrowly controlled schema migrations, verified
recovery procedures, and explicitly approved maintenance operations. It is not
the standard business-data mutation path.

Next.js and client-side tools do not write commerce data directly. Routine
operations must not bypass Medusa validation, lifecycle rules, idempotency,
concurrency controls, or operational records.

## Alternatives considered

### Direct backend table writes

This may be expedient for bulk work, but can bypass domain invariants,
reconciliation records, and concurrency protection.

### Storefront or client-side writes

This would move commerce authority outside Medusa and expose privileged mutation
behavior to an inappropriate boundary.

## Consequences

- All live commerce mutations share Medusa's validation and lifecycle
  authority.
- Direct SQL remains available for controlled recovery and schema work without
  becoming a parallel business path.
- Bulk and operational processes must adapt to supported Medusa boundaries.

## Not decided by this ADR

This decision does not define the exact Medusa service, workflow, handler,
Admin, migration, or maintenance-operation implementations.
