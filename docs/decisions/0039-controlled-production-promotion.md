# ADR-0039: Controlled production promotion

- Status: Accepted
- Date: 2026-09-19

## Context

Client deployments use isolated environments and pinned versioned Retail
Starter releases. Production commerce changes require compatibility, regression,
recovery, and configuration verification before promotion.

Direct deployment from an evolving branch or undocumented manual production
changes would create untraceable drift and weaken rollback.

## Decision

Promote client production deployments through isolated environments using a
controlled versioned release process.

For each release:

- build or identify the approved versioned Retail Starter core artifact;
- verify it in development and test environments before production;
- run applicable unit, integration, contract, end-to-end, compatibility, and
  recovery checks;
- verify client-specific configuration compatibility;
- obtain explicit production approval before promotion;
- deploy only the approved version;
- retain a known rollback point;
- keep the deployed production version traceable.

Do not deploy production stores directly from an evolving `main` branch, make
undocumented manual production code changes, bypass applicable verification
because a change appears small, or allow production deployments to drift from
the versioned core release model.

Emergency fixes remain controlled versioned changes rather than permanent
production-only drift.

## Alternatives considered

### Direct deployment from the evolving main branch

This could reduce release process overhead, but would make production behavior
unverified and rollback or cross-client compatibility difficult.

### Undocumented manual production changes

This could address urgent symptoms quickly, but would create drift, hidden
behavior, and unreliable future upgrades.

## Consequences

- Production versions and approvals are traceable.
- Client configuration compatibility is part of promotion evidence.
- Rollback remains possible without reconstructing undocumented changes.
- Emergency work must still re-enter the normal versioned release path.

## Not decided by this ADR

This decision does not select CI/CD tooling, approval workflow, deployment
automation, release cadence, artifact registry, or rollback implementation.
