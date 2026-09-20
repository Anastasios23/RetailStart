# ADR-0112: Structured storefront capability and provider failure outcomes

- Status: Accepted refinement of ADR-0030, ADR-0056, ADR-0072, and ADR-0091
- Date: 2026-09-19

## Context

ADR-0056 defines the typed backend-owned commerce outcome contract. ADR-0072
requires explicit ambiguity and reconciliation, and ADR-0091 makes backend
capability availability authoritative. The storefront needs customer-safe
responses without exposing provider internals or interpreting transport errors.

## Decision

Medusa exposes stable machine-readable outcomes that may include, where safe and
relevant:

- outcome category;
- authoritative operation reference;
- current backend status;
- correlation identity;
- whether retry is safe;
- structured issue details; and
- capability availability or failure context.

Next.js maps these outcomes to customer-facing states, permitted actions, and
recoverable UI state. It never infers success from transport completion or
definitive failure from timeout or provider uncertainty alone.

Transport status may support the response, but commerce meaning comes from the
backend-owned outcome contract. Raw provider errors, secrets, provider
internals, and sensitive diagnostic details are not exposed directly through
the storefront.

## Alternatives considered

### Generic HTTP errors only

This is simple, but loses distinctions between validation, capability failure,
provider failure, and ambiguous outcome.

### Raw provider errors

This leaks implementation details, produces unstable customer-facing behavior,
and weakens the provider adapter boundary.

## Consequences

- Storefront recovery behavior is driven by backend-owned semantics.
- Public error responses can remain safe while richer diagnostic and durable
  records remain backend-owned.
- Outcome categories and compatibility must be maintained with the Store API
  contract.

## Not decided by this ADR

This decision does not define exact outcome codes, schema fields, HTTP mappings,
localization, response envelopes, or generation tooling.
