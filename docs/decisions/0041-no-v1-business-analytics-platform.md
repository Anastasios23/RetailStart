# ADR-0041: No dedicated V1 business analytics platform

- Status: Accepted
- Date: 2026-09-19

## Context

V1 requires operational visibility for products, inventory, orders, payments,
refunds, notifications, and critical failures. It explicitly excludes business
analytics, KPI reporting, BI, marketing automation, and advanced exports.

Operational monitoring and reconciliation serve reliability and support; they
are not a business analytics system.

## Decision

Do not add dedicated business analytics or reporting infrastructure in V1.

For V1:

- Medusa Admin provides approved operational visibility for products, inventory,
  orders, payments, refunds, and related commerce operations;
- technical monitoring, alerting, tracing, and reconciliation remain operational
  reliability concerns;
- no separate analytics database or reporting store is required;
- no data warehouse or BI platform is required;
- no marketing-tracking pipeline is required;
- no custom KPI dashboards, scheduled business reports, or advanced reporting
  exports are required.

Do not query operational logs as a substitute for a business analytics system,
add reporting workloads to PostgreSQL without a confirmed requirement, collect
additional customer or behavioral data merely because it may be useful later,
or introduce analytics infrastructure before a concrete client or business
requirement justifies it.

Future analytics or reporting is a separate requirement with its own privacy,
data-model, retention, integration, and infrastructure decisions.

## Alternatives considered

### Add analytics infrastructure in V1

This could provide earlier dashboards, but would add collection, privacy,
storage, synchronization, and maintenance scope explicitly excluded from V1.

### Build reports from operational logs or commerce tables

This would couple business reporting to operational persistence and risk
performance, privacy, and data-model problems without a confirmed need.

## Consequences

- V1 stores only operational data justified by commerce and reliability needs.
- PostgreSQL and operational logs are protected from unplanned reporting loads.
- Future analytics work starts with an explicit privacy and data-model review.

## Not decided by this ADR

This decision does not select technical monitoring tools, operational alerting,
retention periods, or future analytics architecture.
