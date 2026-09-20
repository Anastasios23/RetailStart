# ADR-0074: Immutable release artifacts and controlled promotion

- Status: Accepted
- Date: 2026-09-19

## Context

ADR-0026 requires pinned versioned core releases, ADR-0039 requires controlled
production promotion, ADR-0052 requires compatible application pairs, and
ADR-0050 keeps client configuration and secrets outside the reusable core.

Production must run the same verified application artifact that passed the
applicable release checks, rather than an environment-specific rebuild.

## Decision

Build immutable Retail Starter application artifacts once and promote the same
approved artifact through isolated environments.

For V1:

- Build a versioned Retail Starter application artifact once.
- Verify that exact artifact in isolated development and test environments.
- Promote the same approved artifact to production.
- Keep client-specific configuration, secrets, and deployment wiring external
  to the application artifact.
- Record enough release identity to determine exactly which artifact runs in
  each client environment.
- Retain previous approved artifacts or equivalent rollback points for
  controlled recovery.

Database migrations remain coordinated separately through ADR-0055 and execute
in the required sequence for the promoted application version.

Environment-specific behavior comes from validated external configuration and
deployment wiring, not rebuilding application source differently per
environment.

## Alternatives considered

### Rebuild separately for each environment

This can introduce environment-specific code or dependency drift and weakens
confidence that production runs the tested artifact.

### Deploy from mutable source branches or working trees

This weakens release identity, rollback, reproducibility, and auditability.

### Modify an artifact after verification

This invalidates the test evidence and makes the deployed result different
from the approved release.

## Consequences

- Build and promotion evidence can identify the exact application artifact per
  client environment.
- Secrets and client configuration remain independently managed.
- Rollback can return to a known approved artifact when database compatibility
  permits it.
- Artifact retention and promotion automation become operational concerns.

## Not decided by this ADR

This decision does not select artifact format, registry, build provenance,
signing or verification, promotion tooling, configuration injection, retention
policy, or rollback mechanics.

