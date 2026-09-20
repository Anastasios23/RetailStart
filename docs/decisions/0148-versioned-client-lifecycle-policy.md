# ADR-0148: Versioned client lifecycle policy

- Status: Accepted refinement of ADR-0039, ADR-0082, ADR-0085, ADR-0083, ADR-0146, and ADR-0147
- Date: 2026-09-20

## Context

ADR-0147 requires an approved client-specific lifecycle matrix before
production promotion. ADR-0146 establishes backend-owned, data-class-specific
lifecycle execution. ADR-0039 controls production promotion, while ADR-0082
and ADR-0085 make deployment and recovery state traceable and safe to promote.
ADR-0083 versions client presentation inputs but does not give presentation
configuration authority over commerce or data lifecycle policy.

Q148 requires lifecycle policy changes to remain historically traceable and
inactive until they are explicitly approved.

## Decision

Version every approved client lifecycle matrix and require re-approval before a
changed version becomes active in production.

Each approved lifecycle matrix has a distinct version identity. A change
creates a new version rather than silently modifying the currently approved
policy. Each version records, where relevant:

- client and environment;
- version identifier;
- approval status;
- approver or responsible authority;
- approval timestamp;
- intended activation or effective date;
- change summary;
- affected data classes; and
- previous-version reference.

Production uses only an explicitly approved active version. Unapproved drafts
must not alter production retention or deletion behavior. The active lifecycle
policy version should be identifiable from the client deployment or recovery
metadata where appropriate.

Rollback or correction is explicit and must not be achieved by silently
editing historical policy records. Historical versions and approvals remain
available for traceability so operators can determine which policy applied
during a given period.

Changes that may require re-approval include:

- retention periods;
- deletion or anonymization triggers;
- backup treatment;
- media-cleanup rules;
- provider-retention handling;
- legal or accounting exceptions;
- affected data classes; and
- lifecycle ownership or operational responsibilities.

Presentation or storefront configuration must not change retention or deletion
authority. Provider-default changes are not approved client-policy changes.
Urgent production corrections still create a new controlled policy version
with explicit authorization and traceability.

## Alternatives considered

### Edit the active policy in place

This is simple, but destroys the historical record needed to explain which
policy applied to past data and operations.

### Activate configuration edits automatically

This reduces approval friction, but allows unreviewed changes to alter
retention or deletion behavior in production.

### Keep lifecycle policy in presentation configuration

This might simplify client configuration delivery, but gives a presentation
release authority over backend-owned data lifecycle and weakens promotion and
recovery boundaries.

## Consequences

- Lifecycle policy has an explicit version and approval history.
- Production and recovery metadata can identify the policy relevant to a
  deployment where required.
- Draft, rollback, correction, and effective-date behavior remains controlled
  rather than silently mutable.
- Presentation releases and provider defaults remain separate from lifecycle
  authority.

## Not decided by this ADR

This decision does not define the version format, matrix storage model,
approval identity system, signing mechanism, activation tooling, exact policy
retention for historical versions, or the concrete rollback implementation.
