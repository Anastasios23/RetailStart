# ADR-0011: Backend-owned configured shipping and tax

- Status: Accepted
- Date: 2026-09-19

## Context

V1 requires basic shipping and tax behavior for physical-product retail. The
approved scope includes shipping regions or zones, fixed fees, optional
free-shipping thresholds, local pickup, and client-approved tax rates or rules.
It excludes live carrier rates, courier integrations, and automated tax-service
integrations.

Architecture Q2 establishes Medusa as the authoritative commerce system, so
shipping, tax, and final totals must not be independently calculated in the
storefront.

## Decision

Keep shipping and tax calculation backend-owned through Medusa using
client-approved configuration.

V1 supports only:

- shipping zones or regions;
- fixed shipping fees;
- free-shipping thresholds;
- local pickup;
- configured tax rates and tax rules.

Next.js displays backend-calculated shipping, tax, and final totals but does not
calculate authoritative totals independently.

Do not add external carrier-rate or automated tax-service integrations in V1.
Client-approved shipping and tax configuration is client-specific, while the
calculation behavior remains part of the reusable core.

## Alternatives considered

### External carrier-rate or automated tax-service integrations in V1

These could support more advanced scenarios, but are outside the approved V1
scope and would add provider credentials, failure modes, costs, and
reconciliation work.

### Storefront-owned shipping and tax calculation

This could make display flows locally convenient, but would duplicate
authoritative totals and risk disagreement between checkout, payment, and the
confirmed order.

## Consequences

- Shipping, tax, and final totals have one authoritative calculation owner.
- Client-specific rules remain configuration and data rather than custom code.
- The storefront must handle backend-calculated results and backend validation
  errors rather than silently substituting local totals.
- Future carrier or tax-service integrations can be added behind the backend
  boundary as separate scope and architecture decisions.

## Not decided by this ADR

This decision does not select the exact Medusa module configuration, tax data
model, admin UI, provider, deployment arrangement, or future integration
contracts.
