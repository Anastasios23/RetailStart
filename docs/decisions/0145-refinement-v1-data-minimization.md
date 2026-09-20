# ADR-0145: V1 data-minimization refinement

- Status: Accepted refinement of ADR-0042, ADR-0043, ADR-0067, and ADR-0093
- Date: 2026-09-19

## Context

ADR-0042 establishes data minimization and a privacy boundary for V1. ADR-0043
keeps durable operational and reconciliation records inside the
Medusa/PostgreSQL boundary. ADR-0067 constrains observability through
structured redaction, and ADR-0093 applies those boundaries to client
extensions.

Q145 makes the collection and storage boundary explicit for the approved V1
guest-checkout and operational workflows.

## Decision

Use data minimization by default.

For V1, store only data required for:

- approved commerce functionality;
- fulfillment and operational workflows;
- payment and refund reconciliation;
- reliability and recovery;
- security and abuse prevention; and
- required operational attribution and diagnostics.

Sensitive commerce and customer data remains backend-owned. The system collects
only the minimum customer, contact, and delivery information required for the
approved guest-checkout flow. Raw payment-card data remains outside Retail
Starter application storage and processing.

V1 must avoid unnecessary behavioral tracking, profiling, analytics, or
marketing data collection and must not collect data merely because it may be
useful for unspecified future functionality. Observability data follows the
existing redaction and minimization rules and must not become a shadow
customer-data store.

V1 does not introduce broad future-oriented customer profiling, unnecessary
marketing tracking, duplicate customer data stores, provider-specific data
collection without an approved operational purpose, or a separate privacy or
data-governance platform.

If a future feature requires additional personal data, that collection must be
evaluated explicitly against its business purpose, security impact, retention
requirements, and applicable privacy obligations before it is added.

## Alternatives considered

### Collect broadly for future functionality

This could reduce later collection changes, but would create unnecessary
privacy, security, retention, deletion, backup, and recovery obligations.

### Keep customer data in duplicate application and provider stores

This could simplify individual integrations, but would duplicate authority and
increase consistency, access, retention, and deletion risk.

### Add a separate privacy or data-governance platform in V1

This could centralize future governance workflows, but adds another data
authority and operational boundary without a demonstrated V1 requirement.

## Consequences

- V1 data collection remains limited to approved commerce and operational
  purposes.
- Backend-owned records remain the authority for sensitive commerce and
  customer data.
- Observability and extension traceability must remain privacy-constrained and
  linked to existing authoritative records.
- Future personal-data collection requires a separate explicit review.

## Not decided by this ADR

This refinement does not select exact retention periods, deletion workflow
implementation, consent tooling, data-subject request handling, provider
settings, or future analytics processing.

