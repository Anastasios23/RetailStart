# ADR-0073: Mandatory readiness and durable graceful shutdown

- Status: Accepted
- Date: 2026-09-19

## Context

ADR-0031 requires stateless applications with durable state, ADR-0047 requires
durable asynchronous work, and ADR-0055 requires schema compatibility before
application promotion.

Applications must not serve normal traffic when they cannot safely perform
their authoritative role, while independently recoverable provider failures
must not unnecessarily take down unrelated functionality.

## Decision

Use mandatory-dependency readiness with durable graceful-shutdown handling.

For V1, an application becomes ready only after mandatory startup requirements
are valid, including where applicable:

- required configuration validation;
- PostgreSQL connectivity;
- required schema and migration compatibility;
- other dependencies without which the application cannot safely perform its
  authoritative role.

Optional or independently recoverable external providers do not automatically
make the entire application unready. Email unavailability does not block
authoritative commerce; storage or payment-provider failures are represented
through explicit operation outcomes where the affected operation requires
those providers.

Graceful shutdown stops accepting new work where appropriate, allows in-flight
authoritative operations to complete safely when possible, avoids beginning
work that cannot be completed during drain, and preserves durable asynchronous
work for recovery after restart.

Application replacement or restart must not silently lose confirmed commerce
transitions, retryable provider operations, notification intents, webhook
processing state, or reconciliation-required work.

## Alternatives considered

### Require every provider to be healthy before serving

This creates unnecessary coupling between commerce availability and
non-critical providers such as email or independently recoverable side effects.

### No explicit readiness or drain behavior

This risks serving with invalid configuration/schema state and losing in-flight
or process-local work during replacement.

### Process-local background work during shutdown

This cannot reliably survive termination or provide durable retry and
reconciliation.

## Consequences

- Readiness distinguishes mandatory authority dependencies from optional
  provider health.
- Deployment replacement must account for in-flight operations and durable
  recovery state.
- Health and shutdown behavior becomes part of operational verification.
- External provider failures remain explicit operation outcomes rather than
  unexplained application-wide unavailability.

## Not decided by this ADR

This decision does not select health/readiness endpoints, dependency
classifications, grace periods, drain behavior, process signals, deployment
integration, or alerting.

