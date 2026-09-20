# ADR-0015: Backend-owned operational traceability

- Status: Accepted
- Date: 2026-09-19

## Context

V1 requires operational visibility into order, payment, refund, inventory,
fulfillment, and notification outcomes, including failures, retries, and
ambiguous external-provider results. Troubleshooting must remain possible
without exposing secrets, raw payment data, or unnecessary sensitive customer
data.

Application logs and external monitoring are useful supporting tools, but they
are not reliable substitutes for durable business state.

## Decision

The Medusa backend owns durable operational traceability for critical commerce
events.

For orders, payments, refunds, inventory, fulfillment, and notifications, retain
the relevant:

- statuses;
- timestamps;
- provider references;
- correlation identifiers;
- idempotency identities where applicable;
- retry attempts;
- failure states;
- ambiguous or reconciliation-required outcomes.

Structured application logs and external monitoring support troubleshooting, but
they are not the authoritative source of business truth.

Logs must be redacted and must not expose secrets, raw payment data, or
unnecessary sensitive customer data.

Do not introduce a separate event-sourcing or audit platform in V1 unless a
later requirement justifies it.

## Alternatives considered

### Logs and provider dashboards as the primary record

This would reduce backend data-model work, but would fragment operational
history and make business reconciliation dependent on external tools.

### Separate event-sourcing or audit platform

This could provide extensive historical detail, but would add another
persistence and operational boundary without a confirmed V1 requirement.

## Consequences

- Critical business outcomes remain queryable within the backend-owned commerce
  boundary.
- Reconciliation can use stable references and explicit ambiguous states.
- Logs and monitoring can be replaced or expanded without losing business
  history.
- Retained operational data requires deliberate redaction, access control, and
  retention handling.

## Not decided by this ADR

This decision does not select the logging stack, monitoring provider, alert
thresholds, retention periods, event schema, or admin presentation of every
operational record.
