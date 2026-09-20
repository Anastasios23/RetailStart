# ADR-0093: Client extension operational traceability

- Status: Accepted refinement of ADR-0015, ADR-0043, ADR-0060, ADR-0067, and
  ADR-0089
- Date: 2026-09-19

## Context

ADR-0092 requires extension verification across application, contract,
capability, recovery, and release boundaries. Commerce-affecting extensions
may change or participate in durable operations and therefore need traceability
without creating a second audit or correlation authority.

## Decision

Use the existing backend durable-record and observability boundaries for client
extension traceability.

For commerce-affecting extensions:

- authoritative extension-related state remains in Medusa/PostgreSQL;
- operations use existing backend-owned correlation and operation identities;
- extension identity and version are associated with durable operations where
  relevant to investigation, reconciliation, upgrade, or recovery;
- capability context is recorded where necessary to identify the approved
  behavior that was active;
- retries, failures, ambiguous outcomes, reconciliation, compensation, and
  final outcomes remain backend-owned; and
- provider references remain linked through the existing operational-record
  model.

For presentation-only extensions that create no durable business state,
structured, redacted logs, metrics, and traces are sufficient for diagnostics.
All telemetry follows ADR-0067's privacy, minimization, and redaction
requirements.

Extension traceability integrates with the compatible release tuple and
coordinated recovery model so operators can determine which approved extension
version participated in a relevant operation when necessary.

Do not introduce a separate extension audit database or platform, make logs the
sole record of commerce-affecting extension behavior, create a separate
extension correlation model, or duplicate authoritative commerce records only
for extension traceability.

## Alternatives considered

### Separate extension audit platform

This could centralize extension history, but adds another data authority,
retention policy, and recovery boundary.

### Logs-only traceability

This is simple, but logs are not durable business truth and may be insufficient
for recovery, reconciliation, or upgrade investigation.

## Consequences

- Extension behavior can be traced through existing business and operational
  records.
- Commerce recovery and reconciliation do not depend on a separate extension
  system.
- Presentation diagnostics remain lightweight and privacy-constrained.
- Extension metadata must be propagated selectively and safely.

## Not decided by this ADR

This decision does not define extension metadata fields, persistence locations,
indexes, log fields, retention, or operator presentation.
