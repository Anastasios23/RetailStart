# ADR-0063: Refinement of fail-fast configuration validation

- Status: Accepted refinement of ADR-0050
- Date: 2026-09-19

## Context

ADR-0050 establishes split typed configuration boundaries. Q63 defines when
those boundaries must be validated so malformed client-specific configuration
fails before it can produce undefined production behavior.

## Relationship to ADR-0050

This record refines ADR-0050. It does not change configuration ownership or
create a separate configuration authority.

## Decision

Validate configuration before serving traffic.

For V1:

- Each application validates the configuration it owns.
- Validation runs during release/build checks where practical.
- Validation also runs at application startup.
- Required missing or malformed configuration prevents the affected
  application from serving normal traffic.
- Next.js validates its safe public client-configuration projection.
- Medusa/backend validates backend-only configuration, secrets-dependent
  wiring, provider configuration, and authoritative operational settings.
- Backend validation remains authoritative for commerce-critical
  configuration.
- Client-specific structured configuration is validated against a defined
  schema.
- Incompatible configuration fails clearly during promotion or startup.

Required client-specific values are not silently defaulted. Optional values
may use explicit documented defaults where those defaults are safe and
intentional. Configuration errors must be reported without exposing secrets or
sensitive values.

## Alternatives considered

### Request-time validation only

This allows a deployment to start with invalid configuration and moves failures
into customer or operator requests.

### Manual review only

This cannot reliably detect malformed or incompatible structured configuration
across isolated client deployments.

### Silent defaults for missing values

This can hide deployment errors and produce inconsistent client behavior or
unsafe commerce configuration.

## Consequences

- Invalid client configuration fails before normal production traffic is
  served.
- Release and startup checks become part of client deployment readiness.
- Each application must expose safe, non-sensitive configuration diagnostics.
- Optional defaults must be intentional, documented, and safe.
- Configuration schemas and compatibility checks must evolve with core
  releases.

## Not decided by this ADR

This refinement does not select schema format, validation library,
build/startup integration, error-reporting mechanism, or deployment gates.

