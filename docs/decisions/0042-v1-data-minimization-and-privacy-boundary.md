# ADR-0042: V1 data minimization and privacy boundary

- Status: Accepted
- Date: 2026-09-19

## Context

V1 processes guest contact and delivery information, orders, payment and
refund references, inventory, fulfillment, transactional notifications, client
configuration, and operational data needed for reliability and support.

Collecting additional customer, provider, behavioral, or payment data without a
confirmed requirement would increase privacy, security, backup, retention, and
deletion obligations.

## Decision

Apply data minimization by default across V1.

Store and process only data required for approved commerce and operational
workflows, including where necessary:

- guest contact and delivery or pickup information;
- order data;
- payment and refund references and statuses;
- inventory and fulfillment data;
- transactional notification state;
- client configuration;
- operational and reconciliation information required for reliability and
  support.

Sensitive data remains backend-owned and is exposed only where required.

For V1:

- do not store raw payment-card data;
- redact secrets and unnecessary sensitive data from logs;
- expose only safe public data to the browser;
- avoid unnecessary behavioral tracking;
- avoid collecting additional customer or provider data merely for possible
  future use;
- apply the same minimization principle to backups and operational records.

Do not introduce a separate privacy or data platform in V1 without a confirmed
requirement.

Retention periods, deletion workflows, privacy policy, consent requirements,
data-subject request handling, and future analytics processing remain separate
explicit decisions and are defined before production where legally or
operationally required.

## Alternatives considered

### Broad data collection for future use

This could preserve more options, but would create unnecessary security,
privacy, retention, backup, and deletion responsibilities.

### Separate privacy or data platform in V1

This could centralize future compliance workflows, but would add another
service and data boundary before a confirmed need exists.

## Consequences

- V1 data stores and backups have a deliberately limited purpose.
- Logging, monitoring, and browser data exposure require explicit redaction and
  classification.
- Future data uses must justify additional collection and storage through a
  separate decision.
- Legal and operational requirements may require follow-up decisions before a
  specific production launch.

## Not decided by this ADR

This decision does not select retention periods, deletion workflows, privacy
policy, consent tooling, data-subject request handling, or future analytics
processing.
