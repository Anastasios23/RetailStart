# ADR-0105: Dependency-aware bulk-operation ordering

- Status: Accepted refinement of ADR-0044, ADR-0102, and ADR-0104
- Date: 2026-09-19

## Context

ADR-0104 represents bulk work as bounded resumable units. Some units are
independent, while others depend on authoritative prerequisite state such as a
parent product or variant.

## Decision

Use explicit dependency-aware ordering for bulk-operation units.

Independent units may execute concurrently where Medusa domain invariants allow
it. Dependencies between units must be explicit, and a dependent unit must not
begin until its required prerequisite state is authoritative.

Ordering and concurrency decisions remain backend-owned and must respect
Medusa validation, transactions, idempotency, and locking boundaries.

Examples include child records requiring an existing parent, variants or
inventory requiring product/variant state, and lifecycle operations requiring
an earlier unit to complete successfully.

Do not force all bulk work through one global sequential queue without need,
allow unconstrained parallel execution across domain relationships, rely on
incidental processing order, or encode correctness only in importer UI.

## Alternatives considered

### Global sequential processing

This simplifies ordering, but unnecessarily reduces concurrency and increases
completion and recovery time.

### Unconstrained parallel processing

This may be faster, but can violate parent-child, inventory, lifecycle, or
other domain invariants.

## Consequences

- Bulk throughput can use safe concurrency for independent work.
- Domain dependencies are visible and enforceable.
- Dependency and scheduling failures remain backend-operational concerns.

## Not decided by this ADR

This decision does not define dependency representation, concurrency limits,
scheduler behavior, or execution topology.
