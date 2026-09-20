# ADR-0137: Medusa-configured shipping and tax authority

- Status: Accepted refinement of ADR-0011 and ADR-0136
- Date: 2026-09-19

## Context

ADR-0011 assigns shipping and tax calculation to Medusa using client-approved
configuration. ADR-0136 makes backend monetary values authoritative. Cached or
presentation-layer values must not determine checkout totals.

## Decision

Medusa/backend owns authoritative shipping and tax calculation using approved
client-specific commerce configuration.

V1 shipping supports zones or regions, fixed fees, free-shipping thresholds,
and local pickup. V1 tax behavior uses explicitly configured rates, rules, and
applicable commerce configuration.

Next.js displays backend-calculated shipping, tax, and totals but does not
calculate, approve, reconcile, or override them. Correctness-sensitive checkout
uses current backend calculation rather than cached storefront values.

Medusa executes configured tax rules; the application does not independently
determine the client's legal tax obligations. Approved tax configuration and,
where required, professional or accounting guidance establish those rules.

Do not calculate shipping or tax in Next.js, duplicate rules in presentation
configuration, infer tax from locale alone, or allow presentation values to
override Medusa configuration.

## Alternatives considered

### Storefront calculation

This risks stale or divergent totals and creates a second calculation authority.

### Locale-derived tax behavior

This cannot represent approved client tax rules reliably and may produce
incorrect legal treatment.

## Consequences

- Shipping and tax have one authoritative execution boundary.
- Client configuration determines the approved rule inputs without moving
  commerce calculation into the storefront.
- Tax configuration requires appropriate client/accounting governance outside
  the application architecture.

## Not decided by this ADR

This decision does not define exact Medusa configuration APIs, tax schema,
rounding, legal advice, or implementation library.
