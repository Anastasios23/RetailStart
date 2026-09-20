# ADR-0115: Single-owner configuration boundaries

- Status: Accepted refinement of ADR-0050, ADR-0063, ADR-0083, and ADR-0097
- Date: 2026-09-19

## Context

ADR-0050 separates runtime, presentation, commerce, and media ownership. ADR-
0083 versions client presentation bundles, while ADR-0097 separates release
state from live Medusa commerce data. Layered overrides could make those
boundaries ambiguous.

## Decision

Use one authoritative owner per configuration class.

For V1:

- runtime environment configuration owns secrets, database wiring, provider
  credentials, and backend-only operational settings;
- the client presentation bundle owns branding, theme, navigation, public SEO,
  approved static content, and stable media references;
- Medusa/Admin owns products, variants, prices, inventory, shipping, tax,
  payment-related commerce configuration, and other operational commerce data;
- object storage owns binary media; and
- Next.js receives only the validated safe public projection it requires.

Do not use layered overrides that silently allow one ownership boundary to
override another. If one authoritative value appears in multiple boundaries
with conflicting values, validation fails rather than applying precedence.

Do not let storefront configuration override Medusa commerce state, put backend
secrets in presentation bundles, make environment variables the authoritative
store for structured presentation or commerce data, or introduce a universal
configuration source that mixes ownership classes.

## Alternatives considered

### Layered configuration overrides

This is flexible, but makes ownership ambiguous and allows environment or
storefront settings to contradict authoritative backend state.

### Universal configuration source

This centralizes values, but mixes secrets, presentation, commerce, and
provider concerns and expands the security boundary.

## Consequences

- Every configuration value has a clear authority and lifecycle.
- Conflicting duplication fails clearly rather than being resolved silently.
- Public projection generation remains separate from backend-only values.

## Not decided by this ADR

This decision does not define schema formats, storage locations, injection
tooling, or configuration-management workflow.
