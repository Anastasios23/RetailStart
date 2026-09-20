# ADR-0103: Durable operational attribution

- Status: Accepted refinement of ADR-0015, ADR-0043, ADR-0060, ADR-0101, and
  ADR-0102
- Date: 2026-09-19

## Context

ADR-0101 requires authenticated Medusa-native authorization for operational
mutations, and ADR-0102 requires Admin and automation to use shared Medusa
domain pathways. Operators also need to determine who or what initiated a
mutation without relying solely on logs.

## Decision

Attribute operational mutations to an authenticated principal and a durable
backend operation identity.

Where relevant, durable records retain:

- authenticated human or service principal;
- source interface or operation type;
- durable backend operation identity;
- correlation identity;
- target client and environment;
- timestamps;
- current and final outcome;
- failure and recovery state;
- related domain records; and
- related provider references.

This applies to Medusa Admin actions, automation, imports, onboarding,
approved migrations, recovery, and reconciliation actions.

Logs, traces, and provider dashboards support diagnosis but are not the sole
durable attribution source. Service-initiated automation has an identifiable
backend principal or equivalent durable initiator identity and is never an
anonymous system mutation.

Do not create a separate audit database or platform for V1, rely only on logs,
or allow unauthenticated or unattributed operational mutation paths.

## Alternatives considered

### Logs-only attribution

This is simple, but logs are not authoritative, may be redacted or retained
differently, and are insufficient for reliable recovery or reconciliation.

### Separate audit platform

This could centralize attribution, but adds another persistence, retention, and
recovery authority that V1 does not require.

## Consequences

- Operators can connect operational actions to durable business and provider
  records.
- Human and automated actions remain attributable through the same backend
  identity model.
- Attribution data must follow the established minimization and redaction
  rules.

## Not decided by this ADR

This decision does not define principal formats, attribution fields for every
record type, indexing, retention, or Admin presentation.
