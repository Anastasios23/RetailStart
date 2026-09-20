# ADR-0138: No V1 live shipping-rate or automated-tax providers

- Status: Accepted refinement of ADR-0011, ADR-0071, and ADR-0125
- Date: 2026-09-19

## Context

ADR-0137 uses configured Medusa shipping and tax rules. Live carrier-rate and
automated-tax providers would add external availability, credentials, outcome,
and reconciliation requirements not present in the approved V1 scope.

## Decision

Exclude live carrier-rate and automated-tax providers from V1.

V1 shipping and tax use configured Medusa-owned rules only. Live carrier-rate
APIs, automated tax providers, courier APIs, label purchasing, and other carrier
automation are not required. Next.js does not call shipping or tax providers
directly.

If a future requirement justifies an integration, it must be implemented behind
a backend-owned provider adapter while Medusa remains authoritative for the
resulting calculation and state. The future decision must define timeout and
ambiguity behavior, provider references and reconciliation, credentials and
secret ownership, fallback or degraded behavior, and operational recovery.

Do not add external providers merely for future flexibility.

## Alternatives considered

### Add live provider integrations in V1

This could automate rates or tax, but adds provider failure, reconciliation,
credential, and calculation consistency complexity without an approved need.

### Storefront-direct provider calls

This exposes provider boundaries to the browser and risks moving authoritative
totals outside Medusa.

## Consequences

- V1 shipping and tax remain deterministic from approved Medusa configuration.
- Future integrations have a clear adapter and reconciliation boundary.
- The selected Medusa version must be checked for supported configured rules
  during implementation.

## Not decided by this ADR

This decision does not define future providers, adapter contracts, fallback
policy, or exact Medusa shipping/tax API usage.
