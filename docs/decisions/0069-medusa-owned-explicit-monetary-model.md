# ADR-0069: Medusa-owned explicit monetary and currency model

- Status: Accepted
- Date: 2026-09-19

## Context

ADR-0002 makes Medusa authoritative for commerce calculations and state, while
ADR-0068 requires transaction-time order snapshots. Monetary values must remain
consistent across carts, orders, payments, refunds, configuration changes, and
historical records.

## Decision

Use a Medusa-owned explicit monetary and currency model.

For V1:

- Medusa owns all authoritative monetary calculations and persisted amounts.
- Every monetary value carries explicit currency context.
- Medusa/backend supplies authoritative item prices, discounts, shipping, tax,
  cart totals, order totals, payments, refunds, and transaction-time order
  snapshot amounts.
- Next.js displays and formats values returned by Medusa but does not
  independently recalculate authoritative totals.
- Mixed-currency arithmetic is rejected unless an explicitly supported
  conversion flow exists.
- Payment and refund amounts reconcile against the same authoritative currency
  and amount model used by the order.
- Historical order amounts remain tied to their transaction-time currency
  context.

Currency must not be inferred from locale alone. Display formatting may remain
a presentation concern, but the numeric amount and currency being formatted
originate from authoritative backend data.

No exchange-rate conversion or accounting-ledger infrastructure is introduced
for V1 without a confirmed requirement.

## Alternatives considered

### Next.js or shared-package monetary calculations

This could simplify presentation but risks divergence in prices, tax, shipping,
discounts, totals, rounding, and currency handling.

### Locale-derived currency

This is convenient for presentation but cannot establish authoritative currency
for a payment, refund, or order.

### Separate accounting or financial ledger

This could support future accounting needs but would add another authority
outside the approved V1 commerce boundary.

## Consequences

- Monetary authority remains inside Medusa and can be reconciled consistently
  across commerce and payment records.
- Storefront presentation must treat backend amounts and currencies as data to
  display rather than values to recompute.
- Currency context must be preserved through order snapshots, payments, and
  refunds.
- Mixed-currency and conversion requirements become explicit future decisions.

## Not decided by this ADR

This decision does not select numeric representation, rounding rules, currency
configuration, refund precision, formatting conventions, or future conversion
policy.

