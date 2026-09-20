# ADR-0026: Versioned core releases and controlled client upgrades

- Status: Accepted
- Date: 2026-09-19

## Context

Retail Starter is one reusable core delivered to isolated client deployments.
Core fixes and improvements must remain easy to propagate, while each client
needs controlled compatibility, regression verification, and rollback points.

Automatically tracking the latest branch would make client production behavior
depend on untested changes. Repository forks would make shared improvements
harder to propagate.

## Decision

Publish the reusable Retail Starter core as versioned releases.

Each isolated client deployment:

- pins an approved core version;
- upgrades deliberately rather than automatically tracking the latest main
  branch;
- runs compatibility and regression checks before upgrading;
- retains a clear rollback point;
- keeps client configuration, branding, content, secrets, and approved
  extensions separate from the reusable core.

Core fixes and improvements are made once in the Retail Starter core and
propagated to client deployments through controlled version upgrades.

Do not make client deployments automatically track `main`, maintain ordinary
client customizations through repository forks, or apply untested core updates
directly to production client stores.

## Alternatives considered

### Automatically track the latest main branch

This could propagate changes quickly, but would introduce unplanned behavior
changes and unverified compatibility risk into client deployments.

### Per-client repository forks

This would allow independent customization, but would recreate divergence and
make core fixes progressively harder to propagate.

## Consequences

- Client deployments can upgrade and roll back independently.
- Release validation must account for core behavior, client configuration, and
  approved extensions together.
- Core and client-specific changes have a clear ownership boundary.
- Improvements propagate deliberately rather than being blocked by forks or
  hidden production drift.

## Not decided by this ADR

This decision does not select release tooling, versioning rules, CI/CD
automation, rollback mechanism, upgrade cadence, or artifact registry.
