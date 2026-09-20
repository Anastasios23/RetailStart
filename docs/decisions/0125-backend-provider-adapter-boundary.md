# ADR-0125: Backend provider-adapter boundary

- Status: Accepted refinement of ADR-0071
- Date: 2026-09-19

## Context

ADR-0071 places external SDKs and provider-specific behavior behind
Medusa/backend adapters. Stripe, email, object storage, and future providers
must integrate without making their models canonical commerce state.

## Decision

Use backend-owned provider adapters with normalized capabilities.

For V1:

- Stripe, transactional email, object storage, and future external providers
  integrate through Medusa/backend-owned adapters;
- commerce workflows depend on provider-neutral capabilities;
- provider responses normalize into backend-owned statuses, references,
  outcome categories, and retry/reconciliation state;
- credentials remain inside the backend/provider-adapter boundary;
- provider SDK usage remains localized to the adapter/integration layer;
- timeout, retry, idempotency, and reconciliation behavior is handled within
  that boundary; and
- provider identifiers may be retained as external references without becoming
  canonical commerce identities.

The Stripe Payment Element remains the approved browser-side interaction
exception, but does not transfer payment authority away from Medusa/backend.

Do not spread provider SDK objects through commerce-domain code, make provider
schemas canonical business models, expose provider secrets or privileged SDK
usage to Next.js, or add a separate integration gateway without demonstrated
need.

## Alternatives considered

### Provider SDKs throughout the commerce domain

This is convenient initially, but spreads coupling and makes provider changes,
testing, and reconciliation harder.

### Separate integration gateway

This centralizes provider calls, but adds another service and authority boundary
without a V1 requirement.

## Consequences

- Commerce workflows remain provider-neutral.
- Provider changes are localized to adapters and normalized contracts.
- Adapter boundaries must preserve idempotency, ambiguity, and reconciliation
  semantics rather than hiding them.

## Not decided by this ADR

This decision does not define adapter interfaces, SDKs, normalized field names,
credential injection, timeout policy, retry schedule, or extension mechanics.
