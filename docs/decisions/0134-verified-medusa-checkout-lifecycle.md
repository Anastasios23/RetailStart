# ADR-0134: Verified Medusa checkout lifecycle

- Status: Accepted refinement of ADR-0079, ADR-0080, ADR-0084, and ADR-0127
- Date: 2026-09-19

## Context

ADR-0133 defines required checkout invariants but does not prescribe unsupported
internal ordering. Medusa's supported cart, payment, reservation, inventory,
and order lifecycle must be verified against the actual Medusa version used for
implementation.

## Decision

Use the supported Medusa checkout lifecycle and verify its exact behavior
during implementation.

For V1:

- use native Medusa lifecycle behavior wherever it satisfies the approved
  invariants;
- verify the actual lifecycle against the selected Medusa version before
  depending on specific sequencing;
- preserve Medusa as the authority for ordering correctness;
- apply automatic Stripe capture according to ADR-0084;
- keep ambiguous provider outcomes pending and reconcilable under ADR-0127;
- keep idempotency and concurrency backend-owned; and
- create the order and transaction-time snapshot through the authoritative
  completion lifecycle.

Any custom ordering requires evidence that supported Medusa behavior cannot
satisfy an approved invariant and must use the smallest supported extension.
Architecturally significant gaps require a new explicit ADR.

Do not invent a fixed custom sequence, reproduce lifecycle logic in Next.js,
infer commerce ordering from provider transport timing, use loosely coordinated
eventual steps for correctness-critical transitions, or customize merely to
make the design appear deterministic.

## Alternatives considered

### Premature custom checkout ordering

This may appear deterministic, but can conflict with supported Medusa lifecycle
behavior and provider guarantees.

### Loosely coordinated eventual checkout steps

This risks overselling, duplicate orders, inconsistent payment state, and
incomplete snapshots.

## Consequences

- Architecture protects invariants without freezing unsupported internals.
- Implementation requires explicit verification against the selected Medusa
  version.
- A real Medusa gap is handled deliberately rather than by accidental custom
  sequencing.

## Not decided by this ADR

This decision does not define exact workflow steps, transaction boundaries,
reservation timing, capture confirmation, or API response structure.
