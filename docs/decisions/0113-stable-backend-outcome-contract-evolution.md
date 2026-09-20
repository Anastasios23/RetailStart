# ADR-0113: Stable backend outcome-contract evolution

- Status: Accepted refinement of ADR-0036, ADR-0052, ADR-0056, and ADR-0112
- Date: 2026-09-19

## Context

ADR-0112 makes structured backend outcomes the storefront failure boundary.
ADR-0036 and ADR-0052 make Medusa contracts authoritative and require
compatible application releases. Outcome semantics must therefore evolve
without creating an independent Next.js taxonomy.

## Decision

Medusa owns stable semantic outcome categories. Categories remain descriptive
and machine-readable. Additive fields may be introduced when they preserve
compatibility. Breaking semantic or structural changes require a coordinated
compatible Retail Starter release.

Next.js consumes the backend-defined outcome contract. Shared or generated types
may represent that contract, but do not own its meaning. Contract tests verify
storefront compatibility when the contract changes.

Do not use free-form messages as the primary machine contract, rely only on
HTTP status codes for commerce meaning, maintain an independently evolving
Next.js taxonomy, or create a separate shared semantic model outside Medusa.

## Alternatives considered

### Free-form messages and HTTP status only

This is flexible initially, but unstable for recovery behavior, localization,
testing, and compatibility.

### Independent shared semantic model

This may improve type reuse, but creates a second authority separate from
Medusa's actual behavior.

## Consequences

- Outcome semantics remain owned by the backend and evolve through compatible
  release coordination.
- Storefront compatibility is testable through the API contract.
- Generated types remain descriptive rather than behavioral.

## Not decided by this ADR

This decision does not define exact outcome codes, schema fields, HTTP mappings,
version identifiers, localization, or generation tooling.
