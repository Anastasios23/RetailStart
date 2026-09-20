# ADR-0067: Refinement of structured redacted observability

- Status: Accepted refinement of ADR-0015, ADR-0043, and ADR-0060
- Date: 2026-09-19

## Context

ADR-0015 establishes durable operational traceability, ADR-0043 keeps
operational and reconciliation business records in PostgreSQL, and ADR-0060
establishes backend-owned correlation identities.

Q67 clarifies the relationship between diagnostic telemetry and authoritative
business records, including the data-minimization boundary for logs, traces,
metrics, and alerts.

## Relationship to ADR-0015, ADR-0043, and ADR-0060

This record refines those decisions. It does not make observability systems a
second commerce or reconciliation authority.

## Decision

Use structured, redacted observability linked to backend-owned durable records.

For V1:

- Medusa/backend emits structured logs, metrics, traces, and alerts for
  operational diagnostics.
- Observability records carry safe backend-owned correlation and operation
  references where useful.
- Durable commerce, idempotency, retry, and reconciliation truth remains in
  the Medusa-owned PostgreSQL boundary.
- Observability systems help locate and diagnose an operation but do not
  determine authoritative commerce state.

Observability excludes or redacts secrets and credentials, raw card or payment
instrument data, authentication tokens and session secrets, unnecessary
customer personal data, sensitive provider payload contents, and other values
not required for diagnosis.

Where provider requests or responses need diagnostic visibility, record only
the minimum safe metadata, references, status, timing, and sanitized error
information required for troubleshooting.

Correlation must allow an authorized operator to move safely between durable
backend records and related diagnostic telemetry without making telemetry
authoritative.

## Alternatives considered

### Logs or traces as the only operational history

This risks losing payment, refund, webhook, retry, notification, or
reconciliation context when telemetry is sampled, rotated, unavailable, or
retained for a shorter period.

### Complete raw provider payload logging

This could maximize diagnostic detail but creates unnecessary secret, privacy,
security, and retention exposure.

### Provider dashboards as operational authority

Provider dashboards provide useful evidence but do not contain the complete
local commerce and reconciliation context.

## Consequences

- Operators can correlate safe telemetry with authoritative backend records.
- Diagnostic detail is deliberately minimized and redacted.
- Business recovery does not depend on observability-system availability or
  retention.
- Provider troubleshooting may require sanitized metadata and references
  rather than raw payload replay.

## Not decided by this ADR

This refinement does not select log schema, fields, sampling, redaction rules,
retention periods, monitoring provider, alert thresholds, or trace propagation.

