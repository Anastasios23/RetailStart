# ADR-0109: Mandatory readiness dependency classification

- Status: Accepted refinement of ADR-0073
- Date: 2026-09-19

## Context

ADR-0073 requires readiness to reflect whether an application can safely
perform its authoritative role. Not every external provider is mandatory for
every application function, so provider health must be classified rather than
treated as one global prerequisite.

## Decision

An application is ready only when dependencies required for its authoritative
role are valid and available.

For V1, readiness requires where applicable:

- valid required configuration;
- PostgreSQL connectivity;
- compatible schema and migration state;
- required Medusa modules;
- required core capabilities; and
- any other dependency without which the application cannot safely process its
  authoritative responsibilities.

Optional or independently recoverable external providers do not automatically
make the entire application unready. Their failures produce capability-specific
failure, degraded state, pending or ambiguous outcome, retry state, or
reconciliation state according to the affected operation.

Do not require every external provider to be healthy before serving any
traffic, serve normal authoritative traffic with mandatory dependencies
unavailable, or hide missing mandatory capabilities behind generic runtime
errors.

## Alternatives considered

### Require every provider for global readiness

This is conservative, but allows unrelated email, storage, or provider
failures to block safe application functions.

### Serve with missing mandatory dependencies

This preserves apparent availability, but risks accepting work that cannot be
processed safely or recovered authoritatively.

## Consequences

- Readiness reflects the minimum dependencies required for safe authority.
- Capability-specific failures can be surfaced without taking down unrelated
  functionality.
- Dependency classification must be maintained as capabilities and extensions
  change.

## Not decided by this ADR

This decision does not define endpoint formats, probe intervals, health payloads,
or deployment integration.
