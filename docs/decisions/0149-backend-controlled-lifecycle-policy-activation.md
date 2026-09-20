# ADR-0149: Backend-controlled lifecycle-policy activation

- Status: Accepted refinement of ADR-0039, ADR-0082, ADR-0085, ADR-0147, and ADR-0148
- Date: 2026-09-20

## Context

ADR-0147 requires an approved client-specific lifecycle matrix before
production promotion, and ADR-0148 requires versioned policy history and
re-approval for changes. ADR-0039 controls production promotion, while
ADR-0082 and ADR-0085 require deployment and recovery state to be coherent and
traceable before promotion.

Approval, effective date, activation, and recovery restoration are distinct
controls. A policy version must not become active merely because it exists,
was approved, was placed in configuration, or was loaded by an application.

## Decision

Only the backend, deployment, or recovery control path may activate an
approved lifecycle-policy version in production.

For V1:

- lifecycle-policy approval and activation are separate states;
- a policy version must be approved before it can become active;
- activation respects the approved effective date or explicit activation
  condition;
- the active production lifecycle-policy version is selected only through a
  controlled backend, deployment, or recovery path;
- activation is durably attributable and traceable;
- production behavior references one explicitly active approved policy version;
  and
- the active version is represented in deployment or recovery metadata where
  required for reproducibility and restoration.

An approved version that is not yet effective remains inactive. An approved
and effective version remains inactive when explicit activation is required
but has not occurred. A superseded version remains historically traceable but
does not control current production behavior.

Invalid or incompatible activation must fail closed. The system must not
silently fall back to an unintended policy or provider-default retention
behavior.

Ordinary configuration, presentation, storefront, browser-facing, and
Next.js changes have no authority to activate a lifecycle-policy version,
change its approval state or effective date, replace the active policy, or
alter retention and deletion semantics indirectly.

Activation and rollback record, where relevant:

- policy version;
- client and environment;
- activating principal or deployment identity;
- activation timestamp;
- previous active version;
- resulting active version;
- reason or deployment reference; and
- outcome or failure state.

Recovery restores or reconciles the correct lifecycle-policy version alongside
the relevant client deployment and recovery state. Recovery does not select a
policy from ordinary presentation configuration.

## Alternatives considered

### Activate when configuration is edited

This is convenient, but allows an unapproved or unintended edit to change
production retention and deletion behavior.

### Activate automatically at application startup

This reduces explicit deployment work, but makes activation implicit and can
select an unapproved, not-yet-effective, incompatible, or unintended policy.

### Select the policy from browser or storefront configuration

This could reuse presentation configuration delivery, but gives an
untrusted-facing boundary authority over backend-owned data lifecycle.

### Fall back to provider defaults after activation failure

This may keep the application running, but silently changes the client policy
and can create untraceable retention or deletion behavior.

## Consequences

- Lifecycle activation is an explicit backend-owned production operation.
- Approval, effective date, active state, rollback, and recovery state remain
  separately traceable.
- Invalid or incomplete activation blocks or isolates the affected path rather
  than silently changing policy.
- Presentation and browser-facing configuration remain unable to control data
  lifecycle authority.

## Not decided by this ADR

This decision does not define the activation API or deployment tooling,
approval identity mechanism, authorization roles, effective-date format,
policy-version format, metadata schema, or concrete fail-closed operational
response.

