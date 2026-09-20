# ADR-0091: Backend-owned capability availability

- Status: Accepted refinement of ADR-0089 and ADR-0090
- Date: 2026-09-19

## Context

ADR-0089 makes the approved extension set part of the compatible release
tuple. ADR-0090 requires capability-scoped fail-closed behavior when an
extension is unavailable or incompatible. A storefront feature flag or client
configuration value cannot by itself establish that a commerce capability is
installed, compatible, or operationally available.

## Decision

Medusa/backend is authoritative for whether a cross-application commerce
capability is:

- installed;
- approved;
- compatible; and
- operationally available.

Next.js may use approved release configuration to decide presentation intent,
but it must not assume that a commerce capability is available because a local
feature flag or client configuration enables related UI.

When the storefront needs capability state, that state is communicated through
the existing Store API boundary. Storefront behavior fails safely when the
backend reports that a required capability is unavailable. Capability state
must remain consistent with the approved extension set in the compatible
release tuple.

Presentation-only capabilities that do not affect commerce authority may remain
authoritative within Next.js.

Do not make storefront flags authoritative for commerce capability availability,
allow Next.js configuration to override backend state, introduce a separate
runtime capability registry, infer availability solely from deployment
assumptions, or offer a commerce action when its required backend capability is
unavailable.

## Alternatives considered

### Storefront configuration as authority

This is simple for UI rendering, but can drift from the deployed Medusa
extension set and expose unavailable commerce actions.

### Separate runtime capability registry

This centralizes discovery, but adds another mutable service and authority
boundary that V1 does not require.

## Consequences

- Commerce capability availability has one authoritative source.
- Storefront presentation intent cannot override backend safety decisions.
- Cross-application features can fail safely without duplicating commerce
  state or rules.
- The Store API contract must eventually represent the required capability
  state.

## Not decided by this ADR

This decision does not define the capability contract, response shape,
discovery endpoint, caching policy, identifiers, or health-state
representation.
