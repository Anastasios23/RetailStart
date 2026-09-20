# ADR-0055: Controlled Medusa-owned database migrations

- Status: Accepted
- Date: 2026-09-19

## Context

ADR-0004 establishes one Medusa-owned PostgreSQL database per client. ADR-0026,
ADR-0039, and ADR-0052 require versioned core releases, controlled promotion,
and compatible application pairs.

Schema changes must therefore be reproducible, traceable, verified before
production, and applied before the application version that depends on them.

## Decision

Use controlled Medusa-owned database migrations.

For V1:

- Medusa owns PostgreSQL schema evolution.
- Approved custom Medusa modules own their required migrations through the
  backend migration boundary.
- Migrations are versioned with the compatible Retail Starter core release.
- Required migrations are applied as part of controlled promotion before
  deploying the application version that depends on them.
- Migration execution is reproducible and traceable.
- Migration compatibility is verified in non-production environments before
  production promotion.
- Next.js does not own or execute commerce-database schema migrations.

Automatic production schema migration during ordinary application startup and
ad hoc manual SQL changes are not the normal migration process. Client
production schemas must not drift outside the versioned core release process.

Any emergency database change must afterward be captured as a proper versioned
migration so the reusable core and other client deployments remain
reproducible.

## Alternatives considered

### Automatic migration during application startup

This could simplify deployment, but creates startup races, unexpected
production changes, and unclear failure and rollback behavior.

### Ad hoc manual SQL changes

This could be useful for an isolated emergency, but is not reproducible,
traceable, or safely propagatable as a normal process.

### Next.js-owned migrations

This would cross the storefront boundary into the commerce database and create
competing schema ownership. It is not acceptable.

## Consequences

- Database schema state is tied to a traceable Medusa/core release.
- Production promotion must account for migration ordering and verification.
- Custom backend modules must package and test their schema changes with the
  core release.
- Emergency changes require follow-up work to restore reproducibility.
- Migration safeguards and rollback/forward-fix behavior must be designed
  before implementation.

## Not decided by this ADR

This decision does not select Medusa migration tooling, migration runner
topology, locking strategy, rollback or forward-fix policy, development
workflow, or destructive-migration safeguards.

