# ADR-0097: Release tuple and operational commerce-data boundary

- Status: Accepted refinement of ADR-0027, ADR-0050, ADR-0083, and ADR-0086
- Date: 2026-09-19

## Context

ADR-0086 defines the compatible production release tuple for executable and
presentation state. ADR-0027 makes Medusa the ongoing owner of client catalog
and operational commerce data. Routine catalog and operational changes must
not require rebuilding or promoting application artifacts.

## Decision

Keep executable and presentation release state separate from Medusa-managed
operational commerce data.

The compatible production release tuple contains:

- the approved Next.js artifact;
- the approved Medusa artifact;
- the compatible PostgreSQL schema and migration version;
- the approved client presentation bundle;
- approved client extension identities and versions; and
- required non-secret deployment metadata.

Medusa-managed operational commerce data remains outside the release tuple,
including products, variants, prices, inventory, categories, shipping
configuration, tax configuration, payment-related operational configuration,
orders, refunds, fulfillment, and other live commerce records.

Routine commerce-data changes do not require rebuilding or promoting the
application release tuple. Authoritative commerce data is not stored in
repository configuration.

## Alternatives considered

### Include commerce data in every release tuple

This would make deployments more self-contained, but would make routine
catalog, inventory, shipping, tax, and operational changes unnecessarily
release-bound.

### Keep commerce data in repository configuration

This would create a competing catalog and configuration source and conflict
with Medusa's authoritative ownership.

## Consequences

- The release tuple describes executable, schema, presentation, extension, and
  deployment compatibility rather than live business data.
- Medusa Admin and backend-owned data operations can change live commerce data
  without application rebuilds.
- Recovery must restore both the compatible release tuple and the required
  Medusa data state.
- Commerce-data changes require their own operational traceability and backup
  discipline.

## Not decided by this ADR

This decision does not define the data-operation tooling, approval workflow,
environment promotion mechanics, or detailed audit schema.
