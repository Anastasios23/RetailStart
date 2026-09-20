# ADR-0052: Coordinated compatible core releases

- Status: Accepted
- Date: 2026-09-19

## Context

ADR-0026 requires client deployments to pin an approved Retail Starter core
version. ADR-0036 establishes that Medusa owns the API contracts and that
shared or generated types are descriptive artifacts derived from those
contracts.

The storefront and backend are independently deployable applications, but
arbitrary version combinations could create incompatible request/response
behavior and unsafe commerce flows.

## Decision

Use coordinated compatible core releases for storefront/backend API evolution.

For V1:

- Medusa remains the source of truth for API contracts.
- Next.js request and response types are derived from or validated against
  those backend contracts where appropriate.
- Contract tests verify storefront/backend compatibility.
- Each Retail Starter core release defines a known-compatible Next.js and
  Medusa application pair.
- The applications may be deployed separately, but production deployments use
  compatible versions.
- Breaking backend contract changes are coordinated Retail Starter release
  changes.
- Required migrations and regression checks complete before client promotion.
- Client deployments continue to pin an approved core version under ADR-0026.

Independent deployment means either application may be deployed separately when
needed; it does not permit incompatible versions to operate together.

## Alternatives considered

### Arbitrary independent application versions

This would maximize release flexibility but could expose incompatible contracts
and move compatibility risk into production client deployments.

### Multiple maintained API compatibility windows

This could support gradual upgrades, but would add versioning, testing,
documentation, and migration burden without a demonstrated V1 requirement.

### Separate canonical API facade

This could stabilize the storefront contract but would create another API
authority and conflict with ADR-0023 and ADR-0036.

## Consequences

- Storefront/backend compatibility is explicit and testable per core release.
- Breaking changes require coordinated release and migration work.
- Client deployments have a clear compatible version pair and rollback point.
- Independent deployability remains available for operational reasons without
  permitting unsafe contract drift.
- Release verification must include contract and compatibility checks.

## Not decided by this ADR

This decision does not select the API versioning scheme, schema or
code-generation tooling, deprecation policy, migration format, or
compatibility-matrix representation.

