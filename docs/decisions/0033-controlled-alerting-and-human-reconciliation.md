# ADR-0033: Controlled alerting and human reconciliation

- Status: Accepted
- Date: 2026-09-19

## Context

V1 includes critical payment, refund, inventory, order, fulfillment, and
notification operations that can fail or produce ambiguous external outcomes.
Logs and provider dashboards alone do not provide sufficient detection,
correlation, or recovery context.

Some operations can be retried or compensated safely, while others require an
authorized operator to determine the authoritative state before acting.

## Decision

Combine backend operational records, external monitoring, and controlled human
reconciliation for critical failures.

Medusa records:

- critical failures;
- retry attempts;
- ambiguous outcomes;
- provider references;
- reconciliation-required states;
- final resolved status where applicable.

External monitoring detects actionable operational failures and alerts the
responsible operator without exposing secrets or sensitive customer or payment
data.

Medusa Admin or the backend operational surface provides enough status and
context for an authorized operator to investigate failures, determine the
authoritative current state, retry an operation safely where supported, and
perform controlled reconciliation or compensation where required.

Automatic remediation is used only when the operation is proven safe,
deterministic, and idempotent.

## Alternatives considered

### Logs or provider dashboards only

This would reduce integration work, but risks missed failures, fragmented
context, and delayed or inconsistent recovery.

### Automatic remediation for every failure

This could reduce operator workload, but is unsafe when payment, refund,
inventory, or provider state is ambiguous.

## Consequences

- Critical failures have both durable business context and actionable alerts.
- Human reconciliation is an explicit supported path rather than an ad hoc
  database intervention.
- Automatic retries and compensation require evidence of deterministic,
  idempotent safety.
- Monitoring and admin recovery surfaces must redact sensitive data.

## Not decided by this ADR

This decision does not select a monitoring provider, alert thresholds,
escalation channels, on-call process, or exact admin recovery UI.
