# ADR-0087: Versioned client extension boundary

- Status: Accepted refinement of ADR-0009, ADR-0034, and ADR-0086
- Date: 2026-09-19

## Context

ADR-0009 prefers configuration, data, branding, theming, and explicit
extension points over client forks. ADR-0034 requires custom commerce behavior
to remain inside supported Medusa extension mechanisms. ADR-0086 makes the
production compatibility tuple and recovery identity explicit.

Some future clients may have requirements that cannot be expressed through
configuration, data, theming, or standard Medusa capabilities.

## Decision

Deliver exceptional client-specific code through explicit, versioned extension
points inside the existing Next.js or Medusa applications.

Before introducing code, prefer configuration, client data, branding, theming,
and standard Medusa capabilities. Any client-specific extension must have a
documented requirement and must:

- belong to an approved Next.js extension point when it is presentation-owned;
- use supported Medusa extension mechanisms under ADR-0034 when it is
  commerce-owned;
- remain isolated from reusable core logic where practical;
- be tested with the compatible Retail Starter release;
- have compatibility verified during client upgrades; and
- have its active identity and version included in the production compatibility
  tuple and coordinated recovery manifest where required.

Extensions must not override core commerce invariants, bypass Medusa authority,
access the commerce database from Next.js, create parallel payment/inventory/
order/refund/fulfillment authorities, patch Medusa core, or require a permanent
client repository fork.

If an extension becomes broadly useful across clients, evaluate promoting it
into the reusable Retail Starter core rather than maintaining duplicate client
implementations.

## Alternatives considered

### Per-client repository forks

Forks can make local customization straightforward, but cause fixes, security
updates, and architectural improvements to diverge and become expensive to
propagate.

### Separate client-specific services

Separate services preserve the core repository, but add deployment and
operational boundaries and risk duplicating commerce authority.

## Consequences

- Client-specific behavior remains traceable and upgradeable without standard
  client forks.
- Presentation and commerce extensions stay inside their owning application
  boundary.
- Core invariants and backend authority remain protected.
- A broadly reusable extension can be consolidated into the core later.

## Not decided by this ADR

This decision does not define the extension registry, package or folder
structure, compatibility metadata, feature-enablement mechanism, testing
requirements, or promotion process.
