# ADR-0086: Versioned compatible production release tuple

- Status: Accepted refinement of ADR-0026, ADR-0039, ADR-0052, ADR-0055,
  ADR-0074, ADR-0075, ADR-0082, and ADR-0083
- Date: 2026-09-19

## Context

The storefront and backend remain independently deployable under ADR-0001, but
ADR-0052 requires compatible Next.js and Medusa releases. ADR-0055 and
ADR-0075 make schema compatibility part of controlled promotion. ADR-0083
version-controls client presentation input, and ADR-0082 requires recovery to
identify the complete known-good deployment state.

An application artifact version alone cannot describe a safe production client
deployment.

## Decision

Treat each production client deployment as a versioned compatible release
tuple. The tuple identifies:

- the approved Next.js artifact version;
- the approved Medusa artifact version;
- the compatible PostgreSQL schema and migration version;
- the approved client presentation-bundle version; and
- required non-secret deployment metadata needed to reproduce the deployment.

The applications remain independently deployable, but every production change
must preserve compatibility across the tuple. Before promotion, verify:

- Store API contract compatibility;
- schema and application compatibility;
- client presentation-bundle compatibility; and
- required deployment metadata and configuration compatibility.

The resulting tuple must correspond to an approved release state. Its identity
must be recorded in the coordinated recovery manifest from ADR-0082.

Rollback restores a previously known-compatible tuple, or another explicitly
verified compatible state. Individual components must not be reverted blindly.

## Alternatives considered

### Independent component promotion

This allows faster isolated changes, but permits incompatible Store API,
schema, presentation-bundle, and recovery combinations unless every promotion
reconstructs the compatibility state manually.

### Client-specific combined artifacts

This simplifies one-version tracking but conflicts with the reusable
client-neutral core and would make ordinary presentation changes require
application rebuilds.

## Consequences

- Production compatibility is explicit and traceable beyond application
  artifact versions.
- Recovery can reproduce a known-compatible deployment state.
- Independent deployability is preserved without permitting arbitrary
  production version combinations.
- Promotion and rollback require tuple-level compatibility checks.

## Not decided by this ADR

This decision does not define the tuple format, compatibility metadata,
release-manifest structure, tooling, promotion automation, or rollback
selection process.
