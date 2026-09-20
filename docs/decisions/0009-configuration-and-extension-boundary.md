# ADR-0009: Client configuration and extension boundary

- Status: Accepted
- Date: 2026-09-19

## Context

Retail Starter is a reusable foundation delivered through isolated client
deployments. V1 requires normal client variation in branding, content, catalog
data, shipping, tax, payment configuration, and media without turning each
client into a code fork.

At the same time, core commerce invariants must remain consistent so that
payment, order, inventory, refund, and recovery behavior cannot be changed
unpredictably per client.

## Decision

Keep all reusable behavior in one versioned Retail Starter core.

Represent normal client differences through:

- validated deployment configuration;
- Medusa-managed client data;
- branding and theming;
- content;
- media references;
- shipping, tax, and payment configuration;
- explicit extension points for genuinely custom behavior.

Core commerce invariants remain protected and non-overridable.

Do not use per-client branches or forks for ordinary client differences. Do not
introduce a general-purpose CMS or separate configuration platform in V1 unless
a real requirement later justifies it.

Client-specific code is the exception, not the default, and must plug into an
explicit extension point rather than modify the reusable core unpredictably.

## Alternatives considered

### Per-client branches or forks

This would make bespoke changes locally convenient, but would cause core
divergence and make shared fixes difficult to propagate.

### General-purpose CMS or configuration platform in V1

This could provide flexible content and settings management, but would add a
new product surface, data boundary, and operational dependency without a
confirmed V1 requirement.

### Unrestricted client-specific code changes

This would maximize short-term flexibility, but would weaken commerce
invariants, increase regression risk, and make the reusable core unpredictable.

## Consequences

- Normal client variation remains data and configuration rather than duplicated
  application behavior.
- Core fixes can be propagated from one versioned foundation.
- Client-specific behavior has to fit an explicit extension contract or become
  a separately approved scope item.
- Extension points require documentation and validation so they cannot bypass
  core payment, order, inventory, refund, or recovery invariants.
- Presentation-content persistence remains open until a concrete requirement
  justifies a decision.

## Not decided by this ADR

This decision does not select configuration file formats, secret-management
tools, content persistence, admin UI design, or the implementation details of
extension contracts.
