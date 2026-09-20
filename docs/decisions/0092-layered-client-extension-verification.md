# ADR-0092: Layered client extension verification

- Status: Accepted extension of ADR-0014
- Date: 2026-09-19

## Context

ADR-0014 defines layered verification across Medusa/backend, Next.js, API
contracts, end-to-end flows, and external integration seams. ADR-0088 splits
cross-boundary extensions by application authority, while ADR-0090 and
ADR-0091 require capability-scoped failure and backend-owned capability
availability.

Extensions therefore need verification beyond local implementation tests.

## Decision

Use layered verification for each approved client extension.

Each extension must be verified at the layers relevant to its authority and
risk:

- extension-local behavior is tested inside its owning application;
- the Store API contract is tested when the extension crosses the Next.js and
  Medusa boundary;
- backend-owned capability availability is verified;
- capability-scoped fail-closed behavior is verified when the extension is
  missing, incompatible, or unavailable;
- affected critical customer and operational flows are included in
  end-to-end verification;
- retries, idempotency, concurrency, and recovery remain correct when the
  extension affects commerce state;
- compatibility is verified during Retail Starter core upgrades;
- rollback compatibility is verified when the extension is part of the
  compatible release tuple; and
- recovery compatibility is verified when the extension is represented in the
  coordinated recovery manifest.

Verification depth is proportional to extension authority and risk.
Presentation-only extensions require less commerce-specific verification than
extensions affecting checkout, payment, inventory, fulfillment, refunds, or
recovery.

Do not rely only on unit tests for cross-application extensions, only on
end-to-end tests without local and contract coverage, or a locally working
extension as evidence of upgrade, rollback, recovery, or capability safety.

## Alternatives considered

### Unit tests only

These provide fast local feedback, but cannot establish Store API compatibility,
capability discovery, or end-to-end authority boundaries.

### End-to-end tests only

These can validate user journeys, but are slower and provide weaker diagnosis
of extension-local and contract failures.

## Consequences

- Extension verification covers its local behavior and its architectural
  boundaries.
- Higher-risk commerce extensions receive stronger proof before promotion.
- Upgrade, rollback, and recovery become explicit extension compatibility
  checks rather than assumptions.
- Test scope and cost vary according to extension authority and risk.

## Not decided by this ADR

This decision does not select test frameworks, fixtures, contract tooling, CI
gates, browser matrix, compatibility matrix, or recovery-test implementation.
