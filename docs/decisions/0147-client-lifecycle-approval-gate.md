# ADR-0147: Client-specific lifecycle approval gate

- Status: Accepted refinement of ADR-0016, ADR-0039, ADR-0082, ADR-0085, and ADR-0146
- Date: 2026-09-19

## Context

ADR-0016 requires verified backup and restore per client deployment.
ADR-0039 requires controlled production promotion. ADR-0082 defines a
coordinated client recovery set, and ADR-0085 adds a recovery-promotion
reconciliation gate. ADR-0146 makes retention and deletion data-class-specific
and backend-owned, but leaves exact client policy values deployment-specific.

Q147 requires those lifecycle decisions to be approved and complete before a
client deployment can be promoted to production.

## Decision

Require an approved client-specific retention and deletion matrix before a
Retail Starter client deployment may be promoted to production.

The matrix covers every relevant data class and identifies, where applicable:

- data class and purpose;
- authoritative owner and storage location;
- applicable client and jurisdiction context;
- approved retention requirement or retention rule;
- deletion or anonymization trigger;
- deletion method;
- dependencies on related records;
- object-storage and media cleanup behavior;
- backup and recovery-copy treatment;
- relevant external-provider retention constraints;
- exceptions required for accounting, tax, legal, security, fraud,
  reconciliation, or other approved obligations; and
- responsible client or operator approval.

At minimum, the production gate confirms that the following relevant classes
have been considered:

- customer, contact, and delivery data;
- orders and transaction-time snapshots;
- payment and refund references and reconciliation records;
- fulfillment and return records;
- inventory and other applicable operational records;
- notification records;
- operational attribution and recovery records;
- retained logs and diagnostic data;
- uploaded and published media;
- superseded and unpublished media; and
- backups and recovery copies.

The gate does not require one universal retention period. Different data
classes may have different approved lifecycle requirements. Relevant classes
must not remain intentionally undefined at production promotion.

The Retail Starter core may provide the matrix template, validation,
production checklist, and lifecycle mechanisms. The approved client-specific
values and policy remain deployment-specific configuration and policy.

Provider-default retention is not inherited as the client policy. Deleting a
primary database record is not treated as complete deletion across object
storage, providers, logs, or backups. The gate must account for coordinated
metadata, binary, provider, telemetry, and recovery-copy lifecycle behavior.

The core must not invent legal or regulatory retention periods. If an exact
legal or regulatory obligation is uncertain, the client and appropriate
accounting, legal, or privacy guidance must resolve it before the affected
production policy is approved.

## Alternatives considered

### Promote with lifecycle classes left for later

This shortens initial preparation, but leaves deletion, backup, provider, and
recovery obligations undefined at the point where production data is created.

### Inherit provider defaults as the client policy

This is convenient, but provider defaults do not express the client's
jurisdiction, legal obligations, accounting needs, or cross-system deletion
dependencies.

### Require one universal retention period

This simplifies validation, but is incompatible with different commerce,
accounting, security, media, reconciliation, and recovery obligations.

## Consequences

- Production promotion has an explicit client-policy lifecycle gate.
- Client-specific retention and deletion responsibility is recorded rather than
  inferred from provider configuration.
- Recovery and deletion planning covers primary records, media, providers,
  telemetry, and backups together where their dependencies require it.
- The reusable core supplies mechanisms and validation without embedding
  client-specific legal advice or retention periods.

## Not decided by this ADR

This decision does not define exact retention periods, legal conclusions,
jurisdiction-specific advice, the matrix file format, a particular provider,
backup schedule, deletion implementation, or the approval identity system.

