# ADR-0114: Safe public outcome projection

- Status: Accepted refinement of ADR-0042, ADR-0067, ADR-0093, and ADR-0112
- Date: 2026-09-19

## Context

ADR-0112 defines structured storefront failure outcomes, while ADR-0093 keeps
commerce-affecting extension detail in backend durable records and ADR-0067
requires redacted observability. The storefront needs useful recovery meaning
without receiving full provider or operational records.

## Decision

Use a safe public projection with richer backend-owned operational context.

Medusa/backend retains the durable detail needed for investigation, retry,
reconciliation, recovery, provider correlation, and operator decisions.

Storefront responses include only safe structured information needed to describe
the customer-visible state, identify the relevant operation safely, indicate
whether retry is allowed, and present permitted recovery actions.

Public and operator-facing representations remain linked through the same
backend-owned operation and correlation identities.

Do not expose full provider responses or backend failure objects, secrets,
credentials, internal stack traces, sensitive customer data, or operational
controls through public outcomes. Do not reduce every failure to a generic
message when safe structured recovery information is available, or rely on
logs as the only durable operator context.

## Alternatives considered

### Expose the full backend failure object

This can provide detail, but leaks provider internals, sensitive data, and
operational controls and couples the browser to implementation details.

### Generic public error plus logs-only detail

This protects the browser boundary, but prevents useful structured recovery and
makes logs too important for operator decision-making.

## Consequences

- Public outcomes remain intentionally smaller than backend operational records.
- Storefront behavior can still be precise and recoverable.
- Operator investigation and reconciliation retain richer durable context.
- Projection fields must be reviewed for privacy and information leakage.

## Not decided by this ADR

This decision does not define projection schemas, field allowlists, redaction
implementation, localization, or response envelopes.
