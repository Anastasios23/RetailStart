# ADR-0068: Medusa-owned order transaction snapshots

- Status: Accepted
- Date: 2026-09-19

## Context

ADR-0002 makes Medusa authoritative for orders and related commerce state.
Catalog, pricing, inventory, shipping, and tax configuration may change after
an order is created, but operators and customers must still be able to
understand the historical transaction and recover its state accurately.

## Decision

Medusa persists an authoritative transaction-time snapshot for every created
order.

For V1, the order preserves the facts required to understand the transaction
later, including where applicable:

- purchased items and quantities;
- product and variant references;
- transaction-time item descriptions needed for historical display;
- unit prices and currency;
- discounts;
- shipping method and amount;
- tax amounts and relevant tax representation;
- subtotal and final totals;
- customer/contact details required for the transaction;
- shipping address or pickup details;
- payment references and relevant transaction status.

Future changes to product names, descriptions, prices, inventory, shipping
configuration, tax configuration, or catalog structure do not rewrite the
historical facts of an existing order.

Subsequent lifecycle changes are represented through backend-owned records and
transitions such as payment status, fulfillment, refunds, returns, inventory
adjustments, and explicitly controlled order adjustments where supported.

Intentional duplication inside the order snapshot is acceptable because it
preserves transaction history and recovery correctness. No separate custom
order ledger is introduced outside Medusa.

## Alternatives considered

### Reconstruct historical orders from current catalog data

This risks changing historical product descriptions, prices, tax, shipping, or
availability when catalog or configuration data changes.

### Recalculate past orders using current configuration

This could produce totals that differ from the transaction and undermine
payment, refund, and reconciliation correctness.

### Separate custom order ledger

This could preserve an independent history but would create a competing order
authority outside the Medusa commerce boundary.

## Consequences

- Historical order display and recovery do not depend on current catalog or
  configuration values.
- Order records intentionally contain transaction-time descriptive and
  monetary data in addition to references.
- Later lifecycle changes remain explicit backend-owned transitions.
- Snapshot schema and adjustment semantics require compatibility management as
  the core evolves.

## Not decided by this ADR

This decision does not select exact snapshot fields, mutability rules,
pricing/tax representation, adjustment semantics, retention, or storefront and
admin display projections.

