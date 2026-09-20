# ADR-0088: Split cross-boundary extension authority

- Status: Accepted refinement of ADR-0023, ADR-0034, ADR-0035, and ADR-0087
- Date: 2026-09-19

## Context

ADR-0087 allows exceptional client-specific extensions inside the existing
Next.js and Medusa applications. Some features may require both a storefront
experience and backend commerce behavior. ADR-0002 and ADR-0023 establish that
Next.js is not a commerce authority and that the Store API is the integration
boundary.

## Decision

Implement a client-specific feature that spans storefront and commerce as two
authority-specific extension components connected through the existing typed
Store API boundary.

Next.js owns the feature's presentation, customer interaction, UI state,
rendering, and storefront orchestration that does not become commerce
authority.

Medusa owns the feature's authoritative commerce behavior, business rules,
validation, state transitions, persistence, idempotency, concurrency control,
recovery, and reconciliation.

Shared or generated types may describe the extension contract, but they do not
execute or own the commerce rules behind it.

Do not implement authoritative commerce behavior primarily in Next.js,
duplicate business rules across applications, bypass the Store API boundary,
or introduce a separate client-specific service without a demonstrated need.

## Alternatives considered

### Next.js-centered cross-boundary implementation

This can simplify the initial UI flow, but risks moving business rules,
recovery, and state authority into the storefront.

### Separate client-specific service

This can isolate specialized behavior, but adds another deployment,
credential, monitoring, and reconciliation boundary without a V1 requirement.

## Consequences

- Cross-boundary features have clear ownership even when their user experience
  spans both applications.
- Commerce invariants remain inside Medusa.
- The Store API contract remains the integration and compatibility seam.
- A feature may require coordinated storefront and backend extension releases.

## Not decided by this ADR

This decision does not define the extension API contract, route structure,
package organization, generated types, feature enablement, or compatibility
metadata.
