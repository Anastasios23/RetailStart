# ADR-0098: Controlled Medusa commerce-data operations

- Status: Accepted refinement of ADR-0027, ADR-0038, ADR-0055, and ADR-0097
- Date: 2026-09-19

## Context

ADR-0027 makes Medusa the authoritative owner of client catalog and
operational commerce data. ADR-0038 isolates client environments, ADR-0055
requires controlled schema migrations, and ADR-0097 keeps live commerce data
outside the executable release tuple.

## Decision

Use controlled backend-owned data operations for commerce data across
environments.

For V1:

- Medusa Admin is used for normal operational commerce-data changes;
- controlled backend-owned import, setup, or migration workflows are used for
  bulk onboarding and approved migrations;
- commerce data remains environment-specific;
- ordinary development or test database snapshots are not promoted into
  production commerce state;
- bulk and migration operations are verified before production application;
- operations preserve auditability, backup/recovery, and Medusa authority; and
- application artifacts are not rebuilt for routine catalog, inventory,
  shipping, tax, or operational-data changes.

Repository data is not the ongoing source of truth. Undocumented ad-hoc
production database mutations are not permitted.

## Alternatives considered

### Promote database snapshots between environments

This may preserve data together, but risks moving test or customer data across
boundaries and couples routine operations to environment promotion.

### Direct ad-hoc production database mutation

This is flexible, but bypasses Medusa validation, weakens traceability, and
creates recovery and schema-drift risk.

## Consequences

- Live commerce data remains under Medusa's domain authority.
- Environment isolation is preserved while bulk onboarding remains possible.
- Data changes and executable releases have separate, explicit promotion
  paths.
- Controlled import and migration workflows require their own verification and
  operational records.

## Not decided by this ADR

This decision does not define import formats, tooling, approval gates, dry-run
behavior, rollback strategy, or detailed operation audit fields.
