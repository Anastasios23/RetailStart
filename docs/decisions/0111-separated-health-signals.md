# ADR-0111: Separated liveness, readiness, and capability health

- Status: Accepted refinement of ADR-0073 and ADR-0109
- Date: 2026-09-19

## Context

ADR-0109 classifies mandatory and optional dependencies. A single health
boolean cannot distinguish a functioning process, an application ready for its
authoritative role, and an optional capability that is temporarily degraded.

## Decision

Use separate liveness, readiness, and capability-health signals.

For V1:

- liveness indicates that the process is running and able to continue at the
  process level;
- readiness indicates that mandatory dependencies are valid and the
  application can safely perform its authoritative role; and
- capability health indicates whether a specific optional, external, or
  independently recoverable capability is currently available.

A capability failure does not make the entire application unready unless that
capability is mandatory for the application's core role.

Examples include email-provider outage degrading transactional-email capability
while commerce remains ready, optional media-delivery failure affecting
media-dependent operations, PostgreSQL loss making the Medusa backend
unready, and incompatible schema or mandatory Medusa modules making the
affected application unready.

Do not collapse all health states into one boolean, derive readiness solely
from provider dashboards, or report optional-provider failure as full
application failure when unrelated authoritative operations remain safe.

## Alternatives considered

### One global health state

This is simple, but cannot distinguish process health, authoritative readiness,
and optional capability availability.

### Provider dashboards as health authority

Provider dashboards do not represent the application's dependency
classification or authoritative operational state.

## Consequences

- Traffic and operators can distinguish process, application, and capability
  conditions.
- Optional provider failures can degrade narrowly rather than causing global
  unavailability.
- Health consumers must use the appropriate signal for their decision.

## Not decided by this ADR

This decision does not define endpoint formats, probe intervals, payloads,
monitoring provider, or deployment integration.
