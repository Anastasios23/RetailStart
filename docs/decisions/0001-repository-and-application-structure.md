# ADR-0001: Repository and application structure

- Status: Accepted
- Date: 2026-09-19

## Context

Retail Starter V1 is a reusable foundation for isolated client deployments. The
reusable storefront and commerce behavior must remain easy to improve and
propagate across future client projects, while each client keeps separate
runtime data, credentials, configuration, content, branding, and external
service accounts.

The approved product baseline does not require a multi-tenant SaaS runtime or
client-specific business workflows in the reusable core.

## Decision

Use one repository containing two independently deployable applications:

- a Next.js and TypeScript storefront;
- a Medusa commerce backend.

Keep shared packages minimal. Create them only for genuinely stable reusable
contracts, types, utilities, or domain primitives. Do not create shared
packages merely to anticipate future reuse.

Each client deployment is isolated, including its database, credentials,
configuration, content, branding, and external-service accounts. Client
differences should primarily be expressed through configuration, data, theming,
and explicit extension points.

Do not create per-client repository forks as the normal delivery model.

## Alternatives considered

### Separate repositories for the storefront and backend

This would allow each application to have an independent lifecycle, but would
increase coordination and version-drift risk for a small reusable foundation.

### Per-client repositories or forks

This would make client-specific changes locally convenient, but would duplicate
the core and make fixes and improvements progressively harder to propagate.

### A single deployable application

This could reduce initial repository and local-orchestration overhead, but would
couple storefront concerns to commerce operations and weaken the intended
boundary between the storefront and Medusa backend.

## Consequences

- Core fixes and improvements can be propagated from one repository.
- Client data and operational state remain isolated without introducing
  multi-tenant runtime behavior.
- Storefront and commerce-backend responsibilities can evolve independently at
  their deployment boundaries.
- Local development and release coordination must account for two applications.
- Shared packages require discipline: unstable or client-specific behavior stays
  within the owning application or an explicit extension point.

## Not decided by this ADR

This decision does not select a package manager, exact versions, hosting
provider, deployment topology, database topology, or client configuration
storage mechanism.
