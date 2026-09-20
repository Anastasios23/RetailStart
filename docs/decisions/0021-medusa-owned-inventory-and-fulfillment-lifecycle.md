# ADR-0021: Medusa-owned inventory and fulfillment lifecycle

- Status: Accepted
- Date: 2026-09-19

## Context

V1 requires availability checks, reservations, fulfillment stock reduction,
safe release after failed or cancelled flows, manual inventory updates, and
separate handling of refunds and returned inventory. Overselling must be
prevented without creating a second inventory authority.

## Decision

Medusa owns the complete V1 inventory and fulfillment lifecycle.

For V1:

- Medusa is authoritative for inventory availability;
- availability is re-checked before purchase completion;
- inventory reservations are created through the normal Medusa order and cart
  completion lifecycle;
- reserved stock is excluded from available stock for other purchases;
- fulfillment converts reserved stock into permanently consumed stock;
- cancelled or otherwise released orders remove the relevant reservations;
- returned inventory becomes available again only through the appropriate
  backend return or receive flow and only when the returned item is considered
  sellable;
- admin inventory updates operate through Medusa.

Do not introduce a separate inventory ledger, storefront-owned reservations, or
duplicate stock calculations outside Medusa.

If an approved V1 requirement is not satisfied by Medusa's standard inventory
workflows, evaluate the smallest backend-owned Medusa extension under
ADR-0003.

## Alternatives considered

### Separate inventory ledger

This could provide specialized reservation control, but would duplicate stock
authority and create synchronization and recovery risks.

### Storefront-owned reservations or stock calculations

This could make UI availability appear convenient, but cannot safely serialize
competing purchases or fulfillment transitions.

## Consequences

- Inventory availability, reservation, fulfillment, and return decisions have
  one authoritative owner.
- Failed, cancelled, and returned flows must use backend transitions rather than
  local stock adjustments.
- Refund status remains independent from inventory restocking.
- Any Medusa capability gap is handled as a documented backend extension rather
  than a parallel inventory system.

## Not decided by this ADR

This decision does not select warehouse topology, stock-location strategy,
reservation expiry policy, fulfillment provider, or exact Medusa workflow
configuration.

## Reference

- [Medusa Inventory Module](https://docs.medusajs.com/resources/commerce-modules/inventory)
