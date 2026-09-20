# ADR-0061: Backend-owned operational recovery surface

- Status: Accepted
- Date: 2026-09-19

## Context

ADR-0012 selects Medusa Admin as the V1 operational administration surface.
ADR-0033 requires controlled human reconciliation, and ADR-0060 provides the
durable correlation model needed to trace operations across local and external
boundaries.

V1 needs an authorized way to inspect durable state, retry safe work, and
perform controlled reconciliation without creating a second operations
application or bypassing backend safeguards.

## Decision

Use Medusa Admin plus backend-owned operational extensions as the V1 recovery
and reconciliation surface.

For V1:

- Medusa Admin remains the primary operational surface.
- Authorized operators may inspect durable commerce and reconciliation state
  through Medusa/backend-owned views and actions.
- Safe retries are initiated through backend-authorized operations.
- Reconciliation and compensation actions operate against authoritative backend
  state.
- Provider dashboards, logs, traces, and alerts support investigation but are
  not recovery authority.
- Medusa Admin is extended only when a demonstrated operational gap cannot be
  handled through the standard admin surface.

Potential backend-owned operational actions include inspecting ambiguous
payment or refund state, failed webhook or notification processing, safe
operation retries, provider reconciliation, controlled valid compensation, and
correlation/provider-reference inspection.

Every custom recovery action must be explicit, auditable, authorized, and safe
to repeat without accidentally creating duplicate business effects.

## Alternatives considered

### Separate custom operations application

This could provide a richer recovery UX but would add another application,
authentication surface, authorization model, deployment boundary, and source
of operational truth.

### Provider dashboards or logs as recovery authority

These are useful evidence sources but do not unify local commerce state,
idempotency, concurrency, compensation, and reconciliation context.

### Direct operator actions outside backend workflows

This could be expedient but would bypass validation, idempotency, concurrency,
and audit controls. It is not acceptable.

## Consequences

- Recovery remains within the Medusa authentication and authorization boundary.
- Operators use one primary operational surface for commerce and reconciliation.
- New recovery capabilities require explicit backend workflows and auditability.
- Standard Medusa Admin may need targeted extensions as operational gaps are
  demonstrated.
- Provider and observability systems remain supporting evidence rather than
  business authority.

## Not decided by this ADR

This decision does not select specific Admin extensions, recovery actions,
reconciliation screens, approval controls, operator permissions, or alert
integrations.

