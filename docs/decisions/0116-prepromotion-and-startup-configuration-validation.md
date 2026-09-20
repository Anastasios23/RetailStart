# ADR-0116: Pre-promotion and startup configuration validation

- Status: Accepted refinement of ADR-0050 and ADR-0063
- Date: 2026-09-19

## Context

ADR-0063 requires fail-fast validation of owned configuration during release
and startup. ADR-0115 assigns each configuration class a single authority.
Production readiness requires malformed or incompatible configuration to fail
before it creates undefined runtime behavior.

## Decision

Validate configuration both before promotion and at application startup.

For V1:

- release/build validation detects malformed or incompatible configuration
  before production promotion;
- startup validation protects runtime correctness;
- each application validates the configuration boundary it owns;
- required invalid or missing configuration prevents normal service;
- optional configuration uses only explicit, documented, safe defaults;
- backend validation remains authoritative for commerce-critical configuration;
  and
- the Next.js public configuration projection is derived from already validated
  client configuration.

Validation failures are reported clearly without exposing secrets or sensitive
values.

Do not defer required validation to customer requests, rely only on manual
review, silently continue with partial or malformed required configuration, or
allow browser-side configuration to become an independent source of truth.

## Alternatives considered

### Request-time-only validation

This delays failure until customer traffic reaches invalid configuration and
makes promotion and recovery less predictable.

### Manual review only

This cannot reliably detect malformed structured configuration or cross-boundary
compatibility errors.

## Consequences

- Invalid releases can be rejected before production promotion.
- Runtime instances fail safely when required configuration is unavailable.
- Configuration ownership and validation must be maintained together as the
  system evolves.

## Not decided by this ADR

This decision does not define schema format, validation library, error-reporting
mechanism, build/startup integration, or deployment gates.
