# ADR-0135: Immutable order transaction snapshot

- Status: Accepted refinement of ADR-0068 and ADR-0076
- Date: 2026-09-19

## Context

ADR-0068 requires transaction-time order snapshots, and ADR-0076 allows only
controlled backend-owned post-order lifecycle changes. Historical order facts
must remain interpretable after catalog or configuration changes.

## Decision

When an order is created, Medusa persists the transaction-time facts required
to understand what was purchased under the conditions that applied then.

Where applicable, the snapshot includes purchased items and variants,
quantities, transaction-time descriptions or identifying presentation data,
unit prices, discounts, currency, shipping method and amount, tax information,
order totals, required contact and delivery details, payment references, and
other facts required to interpret the completed purchase.

Later changes to products, variants, descriptions, prices, inventory, shipping,
tax, or presentation configuration do not rewrite the original facts.

Subsequent payment events, fulfillment, refunds, returns, inventory
adjustments, and supported order adjustments are represented as explicit
backend-owned lifecycle records or supported adjustments. They may change
current operational state but do not rewrite what was originally purchased.

Do not reconstruct historical facts from the current catalog, overwrite the
transaction snapshot after configuration changes, or introduce a separate
custom order ledger.

## Alternatives considered

### Reconstruct from current catalog data

This reduces stored duplication, but produces incorrect historical facts after
catalog or configuration changes.

### Separate custom order ledger

This preserves history, but duplicates Medusa order authority and creates a
second reconciliation boundary.

## Consequences

- Historical orders remain interpretable and auditable.
- Current lifecycle state and original transaction facts are distinct.
- Medusa version behavior must be verified before implementation relies on
  specific snapshot fields.

## Not decided by this ADR

This decision does not define exact Medusa fields, snapshot mutability rules,
adjustment representation, retention, or display projections.
