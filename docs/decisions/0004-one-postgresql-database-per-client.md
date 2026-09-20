# ADR-0004: One PostgreSQL commerce database per client

- Status: Accepted
- Date: 2026-09-19

## Context

Each client receives an isolated deployment. Architecture Q2 establishes
Medusa as the authoritative commerce system, and the V1 requirements depend on
consistent state across products, inventory, checkout, orders, payments,
refunds, fulfillment, shipping, and tax.

Adding another commerce database or duplicating commerce records would create
additional synchronization, migration, backup, and recovery responsibilities
without a V1 requirement.

## Decision

Each isolated client deployment uses one dedicated PostgreSQL database owned by
Medusa for authoritative commerce data.

The database contains Medusa-managed state for products, variants, pricing,
inventory, carts, checkout state, orders, payments, refunds, fulfillment,
shipping and tax configuration, and related commerce records.

Next.js must not access the commerce database directly. It interacts with
commerce state through the Medusa backend interfaces.

Do not introduce a separate storefront commerce database, duplicated commerce
state, or a shared multi-client database for V1.

Storefront-specific presentation content that does not belong in Medusa may be
handled separately later if a real requirement appears, but V1 does not add
another database without that requirement.

## Alternatives considered

### Separate storefront and commerce databases

This could isolate presentation content, but would add database operations and
would risk duplicating or synchronizing commerce state without a demonstrated
V1 need.

### Shared multi-client database

This could reduce infrastructure count, but conflicts with the approved
isolated-client deployment model and introduces unnecessary tenant-isolation
risks.

## Consequences

- Authoritative V1 commerce data has one database owner and one persistence
  boundary per client.
- Backup and restore of core commerce data have a clear primary target.
- Next.js remains decoupled from schema and database implementation details.
- Presentation-only persistence, if later required, must be justified as a
  separate decision rather than added by default.
- Database schema, migration process, hosting, backup tooling, and capacity
  remain implementation decisions.

## Not decided by this ADR

This decision does not select a PostgreSQL version, hosting provider,
connection-pooling approach, schema customization strategy, migration tool, or
backup and recovery implementation.
