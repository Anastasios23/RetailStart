# ADR-0095: Explicit extension dependency contracts

- Status: Accepted refinement of ADR-0087, ADR-0089, ADR-0090, and ADR-0094
- Date: 2026-09-19

## Context

ADR-0089 requires explicit extension identities and dependencies. ADR-0090
defines capability-scoped fail-closed behavior, and ADR-0094 limits extension
access by authority and data need. Extensions may depend on one another, but
private internal coupling would undermine those boundaries.

## Decision

Use explicit host-owned contracts for dependencies between extensions.

For V1:

- extension-to-extension dependencies must be explicitly declared;
- the dependency contract belongs to the appropriate host application
  boundary;
- dependency versions participate in compatibility checks;
- access occurs through approved extension interfaces, host services, or API
  contracts;
- an extension must not access another extension's private persistence or
  internal state directly; and
- capability and dependency requirements are validated as part of the
  approved extension set and compatible release tuple.

Missing or incompatible dependencies follow the capability-scoped fail-closed
behavior established by ADR-0090.

If two extensions cannot maintain a stable host-owned contract because they are
too tightly coupled, evaluate combining them into one cohesive extension or
promoting the shared behavior into a reusable core capability.

Do not create hidden direct coupling, depend on undocumented implementation
details, share private tables or internal mutable state directly, or introduce
a separate service merely to coordinate ordinary extension dependencies.

## Alternatives considered

### Direct internal extension coupling

This is convenient initially, but creates hidden dependencies, makes upgrades
fragile, and obscures ownership of state and behavior.

### Separate coordination service

This can isolate dependencies, but adds a deployment and operational boundary
without a demonstrated V1 need.

## Consequences

- Extension dependencies are visible, versioned, and testable.
- Private implementation details remain replaceable.
- Incompatible dependency graphs fail safely rather than partially executing.
- Tightly coupled extensions may need consolidation instead of an artificial
  boundary.

## Not decided by this ADR

This decision does not define contract formats, dependency graph tooling,
package structure, runtime discovery, or enforcement implementation.
