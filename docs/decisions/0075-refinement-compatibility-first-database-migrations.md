# ADR-0075: Refinement of compatibility-first database migrations

- Status: Accepted refinement of ADR-0055
- Date: 2026-09-19

## Context

ADR-0055 establishes controlled Medusa-owned migrations. ADR-0016 requires
verified backup and restore, ADR-0039 requires controlled production
promotion, and ADR-0074 requires immutable application artifacts.

Q75 defines the compatibility and recovery posture for schema changes during
promotion and rollback.

## Relationship to ADR-0055

This record refines ADR-0055 and works with ADR-0016, ADR-0039, and ADR-0074.
It does not change Medusa's schema ownership.

## Decision

Use compatibility-first database migrations with controlled forward fixes.

For V1:

- Prefer additive and backward-compatible schema changes where practical.
- Use expand-then-transition patterns when a change cannot safely happen in one
  step.
- Keep the currently running and next approved application versions
  schema-compatible during promotion where practical.
- Require explicit review and controlled execution for destructive or
  irreversible migrations.
- Allow application rollback only when the current schema remains compatible
  with the rollback application version.
- Do not assume application rollback automatically reverses database
  migrations.
- When schema rollback risks data loss or corruption, prefer a verified forward
  fix.
- Use the verified backup/restore process from ADR-0016 when recovery requires
  restoring database state.

Release verification identifies whether each migration is backward compatible,
transitionally compatible, destructive or irreversible, safe for application
rollback, or dependent on a forward fix or restore recovery path.

## Alternatives considered

### Automatic down-migrations during application rollback

This can delete or transform data created by the newer application and make a
rollback unsafe after partial production use.

### Ad hoc compatibility judgment during production promotion

This creates inconsistent client behavior and relies on emergency reasoning for
schema/application safety.

### Assume all migrations are reversible

This ignores destructive data transformations and can create false recovery
confidence.

## Consequences

- Database and application release compatibility becomes explicit before
  promotion.
- Some changes require staged releases rather than one-step deployment.
- Forward fixes and restore procedures are first-class recovery paths.
- Migration review must account for data loss, rollback compatibility, and
  in-progress client operations.

## Not decided by this ADR

This refinement does not select expand/contract patterns, migration
classifications, compatibility checks, destructive-change approvals,
forward-fix workflow, or restore triggers.

