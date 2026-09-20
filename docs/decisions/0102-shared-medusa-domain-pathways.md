# ADR-0102: Shared Medusa domain pathways for Admin and automation

- Status: Accepted refinement of ADR-0099 and ADR-0100
- Date: 2026-09-19

## Context

ADR-0099 requires Medusa-owned mutation boundaries, and ADR-0100 requires
validated, idempotent backend-owned bulk operations. Medusa Admin, imports,
onboarding, migrations, and automation may have different initiating
interfaces, but must not create divergent business-rule paths.

## Decision

Use the same supported Medusa domain pathways for Admin actions and automated or
bulk operations.

The following may initiate an operation through different interfaces:

- Medusa Admin actions;
- controlled imports;
- onboarding workflows;
- approved bulk migrations; and
- operational automation.

They must invoke the same Medusa-owned services, workflows, handlers,
validation, idempotency mechanisms, concurrency controls, and operational or
reconciliation records.

Performance optimization must occur within the Medusa-owned domain boundary,
not by creating a direct-write path.

Do not maintain separate business rules for Admin and automation, let imports
bypass lifecycle validation or invariants, or introduce a separate import
service without a demonstrated requirement.

## Alternatives considered

### Separate optimized bulk-write path

This could improve throughput, but risks bypassing domain invariants and
creating behavior that differs from Medusa Admin.

### Separate import service

This can isolate bulk processing, but adds another application boundary and
potential commerce authority.

## Consequences

- Admin and automation have one authoritative business-rule implementation.
- Bulk performance work must preserve Medusa lifecycle and recovery behavior.
- Different initiating interfaces remain possible without divergent domain
  logic.

## Not decided by this ADR

This decision does not define the exact Medusa service/workflow reuse pattern,
performance techniques, import interface, or automation scheduling.
