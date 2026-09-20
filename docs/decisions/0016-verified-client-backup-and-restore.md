# ADR-0016: Verified backup and restore per client deployment

- Status: Accepted
- Date: 2026-09-19

## Context

Each client deployment has a dedicated PostgreSQL commerce database and
isolated object-storage media. V1 requires protection against data loss and a
real restore demonstration before production readiness. Provider-managed
backup claims alone do not prove that the complete service can be recovered.

## Decision

Each client deployment has a verified backup and restore strategy covering:

- the dedicated PostgreSQL commerce database;
- required object-storage media;
- necessary deployment and configuration records required to restore the
  service.

Backups are stored separately from the primary runtime and protected from
unauthorized access and accidental loss.

Before a client deployment is considered production-ready:

- a documented restore procedure exists;
- at least one real restore test is completed;
- the restored environment verifies critical orders, payments and refunds,
  inventory, configuration, and required media.

Do not rely only on provider-managed backup claims without verifying restore.
Do not introduce active-active or advanced disaster-recovery architecture in V1
unless later business requirements justify it.

## Alternatives considered

### Provider-managed backups without a restore test

This can reduce operational work, but does not demonstrate that all required
business data, media, configuration, and service dependencies can be recovered.

### Active-active or advanced disaster recovery in V1

This could improve availability, but adds significant infrastructure and
operational complexity before numeric RPO/RTO targets or business requirements
justify it.

## Consequences

- Production readiness includes demonstrated recovery rather than backup
  configuration alone.
- PostgreSQL, media, and restoration records must be treated as one recovery
  scope even though they have different storage boundaries.
- Restore tests must verify business semantics, not only file or database
  availability.
- Recovery procedures and evidence become part of the reusable operational
  foundation for client deployments.

## Not decided by this ADR

This decision does not select backup providers, retention periods, RPO, RTO,
encryption tooling, restore tooling, backup schedules, or disaster-recovery
topology.
