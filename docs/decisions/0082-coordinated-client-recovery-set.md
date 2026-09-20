# ADR-0082: Coordinated client recovery set

- Status: Accepted
- Date: 2026-09-19

## Context

ADR-0016 requires verified recovery of each client's PostgreSQL commerce data,
required media, and deployment/configuration records. ADR-0074 requires
immutable application artifacts, while ADR-0055 and ADR-0075 tie application
versions to database schema compatibility.

Independent restoration of these resources does not automatically produce a
coherent client deployment. Provider-side authoritative records, including
Stripe state, may also need reconciliation after restoration.

## Decision

Represent a recoverable client deployment as a coordinated recovery set. A
recovery manifest identifies the compatible recovery components required to
restore the approved application safely, including:

- the approved/versioned application artifact;
- the PostgreSQL recovery point or backup;
- the database schema and migration version;
- the required object-storage media state;
- client configuration records required to reconstruct the deployment; and
- other deployment metadata required for safe restoration.

Recovery must first restore into an isolated target environment. Before
promotion, the recovery process must:

- verify schema and application compatibility;
- verify database-to-media references where relevant;
- validate required configuration;
- run the approved critical recovery and commerce checks; and
- confirm coherent orders, payment/refund references, inventory,
  configuration, and required media.

The recovery set does not require all external systems to participate in one
simultaneous snapshot or distributed transaction. Provider-side authoritative
records, such as Stripe state, are reconciled after restoration through the
backend-owned provider references and reconciliation mechanisms established by
earlier decisions.

The restored environment must not be promoted until verification succeeds.

## Alternatives considered

### Independent resource restores

This is simpler to describe, but a database, media state, configuration, and
application artifact restored from unrelated points may not agree. Treating
them as coherent without verification risks broken references and incorrect
operational recovery.

### Active-active or distributed disaster recovery

This could improve availability, but adds substantial coordination and
operational complexity that is not required for V1.

## Consequences

- Recovery becomes an explicit, traceable client deployment unit.
- Restore verification covers cross-resource coherence rather than only
  database availability.
- Provider reconciliation remains a deliberate post-restore activity rather
  than an assumed part of the local restore transaction.
- The recovery process can evolve without introducing distributed transactions
  or active-active infrastructure.

## Not decided by this ADR

This decision does not select the recovery-manifest format, backup providers,
schedules, retention, RPO/RTO, object-storage recovery method, restore tooling,
or promotion automation.
