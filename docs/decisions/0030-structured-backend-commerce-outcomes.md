# ADR-0030: Structured backend commerce outcomes

- Status: Accepted
- Date: 2026-09-19

## Context

V1 requires the storefront to distinguish recoverable validation, price,
inventory, payment, refund, provider, and ambiguous-outcome failures. The
storefront must not infer business success from a timeout, network failure, or
partial response.

Medusa owns authoritative commerce state, idempotency, compensation, and
recovery decisions.

## Decision

Medusa exposes structured commerce outcomes that allow Next.js to present safe
and recoverable customer states.

V1 outcomes distinguish cases such as:

- validation failure;
- price changed since the previous cart state;
- inventory no longer available;
- payment failed;
- payment cancelled;
- payment outcome ambiguous or still unresolved;
- provider timeout;
- refund failed;
- refund outcome ambiguous where applicable.

Next.js maps these outcomes to clear customer-facing states and actions,
preserves the cart and entered checkout state where safe and appropriate, and
allows retry only when the backend indicates that retry is safe.

Next.js never infers a successful order, payment, refund, or other commerce
transition from a timeout, network failure, or partial response.

Do not reduce all commerce failures to generic errors, let Next.js guess whether
a commerce operation succeeded, or duplicate backend recovery or compensation
rules in the storefront.

## Alternatives considered

### Generic error responses

This could reduce API design work, but would hide important distinctions needed
for safe retry, cart preservation, reconciliation, and customer guidance.

### Storefront-owned recovery decisions

This could make UI flows appear self-contained, but would duplicate business
rules and could create duplicate or conflicting side effects.

## Consequences

- Cross-boundary failures have explicit business meaning.
- The storefront can provide clear recovery actions without owning recovery
  authority.
- Backend status resolution and idempotency remain testable independently.
- Error and outcome contracts become part of the API integration boundary.

## Not decided by this ADR

This decision does not select the exact error schema, HTTP status mapping, UI
wording, retry timing, or transport-specific serialization.
