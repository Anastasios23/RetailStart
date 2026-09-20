# ADR-0146: Data-class-specific retention and deletion authority

- Status: Accepted refinement of ADR-0062, ADR-0042, and ADR-0122
- Date: 2026-09-19

## Context

ADR-0062 establishes backend-owned data lifecycle workflows, ADR-0042 limits
V1 data collection, and ADR-0122 requires authoritative media publication and
replacement references. Q146 clarifies how retention and deletion must be
executed across application data, media metadata, object storage, and backup or
recovery copies.

## Decision

Use backend-owned, data-class-specific retention and deletion lifecycle
workflows.

For V1, the backend owns retention and deletion policy execution for
application-controlled data. Different data classes may have different
lifecycle rules.

Media deletion must coordinate:

- authoritative Medusa metadata and reference changes;
- object-storage deletion; and
- cleanup of superseded or unpublished media.

Provider retention capabilities may support implementation but do not define
Retail Starter's policy. Backup and recovery copies are included in lifecycle
design. Deletion workflows must avoid inconsistent references and partially
deleted authoritative records.

Operational records required for reconciliation, recovery, security, or legally
required retention must not be deleted solely because customer-facing data was
removed.

Exact retention periods are not fixed by this ADR. Before production use, they
must be determined from the client jurisdiction, applicable legal and
regulatory obligations, accounting and tax requirements, contractual
requirements, legitimate operational and reconciliation needs, and the
client's approved privacy and retention policy.

V1 does not rely solely on provider-default retention periods, assume that
primary-database deletion immediately removes backup copies, independently
delete object-storage binaries without coordinating authoritative metadata, or
introduce a separate privacy platform without a demonstrated requirement.

Where a deletion request conflicts with an applicable retention obligation, the
implementation preserves only the data that must legitimately remain and
handles the rest according to the approved lifecycle.

## Alternatives considered

### Provider-default retention only

This is convenient, but it fragments policy across providers and does not
establish Retail Starter's lifecycle authority.

### One retention rule for every data class

This is simple, but cannot safely represent different commerce, accounting,
security, media, reconciliation, recovery, and notification obligations.

### Independent deletion by each provider or storage system

This risks broken references, orphaned media, incomplete deletion, lost
reconciliation context, and inconsistent authoritative records.

## Consequences

- Lifecycle policy execution has one backend-owned application boundary.
- Retention and deletion can vary by data class without making providers the
  policy authority.
- Media metadata, object binaries, superseded references, primary records, and
  backups require coordinated lifecycle handling.
- Production readiness requires approved client-specific retention and deletion
  rules where legal or operational requirements apply.

## Not decided by this ADR

This refinement does not set exact retention periods, define a particular
provider or backup mechanism, choose soft deletion versus hard deletion or
anonymization, define data-subject request procedures, or specify the concrete
workflow implementation.

