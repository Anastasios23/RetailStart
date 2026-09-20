# ADR-0056: Refinement of the typed commerce-outcome contract

- Status: Accepted refinement of ADR-0030
- Date: 2026-09-19

## Context

ADR-0030 established that Medusa must expose structured commerce outcomes and
that Next.js must present safe, recoverable customer states without guessing
whether a commerce transition succeeded.

Q56 defines the typed, machine-readable contract for those already-approved
outcomes. It does not create a second error authority or replace ADR-0030.

## Relationship to ADR-0030

This record refines ADR-0030. Medusa remains the sole semantic commerce-outcome
authority.

## Decision

Medusa owns a stable machine-readable commerce-outcome contract.

For V1, the backend exposes outcome categories for cases such as:

- validation failure;
- price changed;
- inventory unavailable or conflicting;
- payment failed;
- payment cancelled;
- payment outcome ambiguous;
- provider timeout or unavailable provider;
- refund failed;
- refund outcome ambiguous where applicable.

An outcome may include, where safe and useful:

- structured issue details;
- whether retry is safe;
- correlation or reference identifiers;
- authoritative operation references;
- current authoritative status.

Next.js maps backend outcome categories to customer-facing states and wording,
presents only recovery actions allowed by the backend outcome, preserves
recoverable checkout state where appropriate, and never reinterprets a timeout
or ambiguous response as success or failure on its own.

Free-form error text is not the machine contract. HTTP status alone does not
carry all commerce semantics. Shared or generated types may represent the
backend-owned outcome contract consistently with ADR-0036, but do not own its
semantics.

## Consequences

- Recovery behavior is driven by stable backend-owned categories rather than
  message text or HTTP status alone.
- Next.js can present clear customer states without duplicating compensation or
  reconciliation rules.
- Generated contract artifacts and compatibility tests must stay aligned with
  Medusa's actual behavior.
- Unknown or future outcome categories require a safe storefront fallback that
  does not infer commerce success or failure.

## Not decided by this ADR

This refinement does not select the exact schema, outcome codes, HTTP mappings,
field names, localization or message wording, or generation tooling.

