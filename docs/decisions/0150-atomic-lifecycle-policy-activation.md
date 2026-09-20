# ADR-0150: Atomic lifecycle-policy activation

- Status: Accepted refinement of ADR-0031, ADR-0032, ADR-0039, ADR-0045, ADR-0060, ADR-0082, ADR-0085, ADR-0148, and ADR-0149
- Date: 2026-09-20

## Context

ADR-0148 requires versioned lifecycle policies, and ADR-0149 restricts
activation to the backend, deployment, or recovery control path. ADR-0031
requires durable authoritative state, ADR-0032 defines local transactions and
external reconciliation, and ADR-0045 and ADR-0060 define durable backend-owned
operation and correlation identities. ADR-0039, ADR-0082, and ADR-0085 require
deployment and recovery state to remain coherent and traceable.

Updating the authoritative active-policy reference and the metadata needed to
identify it must therefore be one durable controlled activation operation.

## Decision

Use an atomic or equivalently coordinated backend-owned activation workflow.

For V1:

- production has one explicitly active approved lifecycle-policy version where
  the policy is required;
- activation begins from a known currently active version;
- the requested target version is already approved and eligible for activation;
- the authoritative active-policy reference is updated together with the
  deployment or recovery metadata required to identify that policy;
- the operation has one durable backend-owned operation identity; and
- the operation records the client and environment, previous active version,
  target version, initiating principal or deployment identity, activation
  timestamp, operation or correlation identity, and final outcome or recovery
  state.

Where the active-policy reference and required metadata share a safe local
transaction boundary, they are updated in that transaction. Where required
metadata cannot participate in the same database transaction, the workflow
uses explicit intermediate operation state, idempotent steps, safe retry,
reconciliation, and fail-closed behavior until the active production state is
unambiguous.

Partial activation must not leave production with conflicting policy state,
including:

- backend behavior using one policy while recovery metadata identifies
  another;
- no explicitly active policy where one is required;
- more than one policy considered active; or
- an unapproved or incompatible policy becoming authoritative.

If activation fails before the authoritative switch completes, the previously
active approved policy remains authoritative. If failure occurs after the
authoritative switch but before supporting metadata is reconciled, the
operation remains explicitly incomplete and recoverable; normal behavior must
not depend on conflicting metadata.

Activation must not use unrelated manual edits, presentation configuration,
browser code, or provider-default fallback to complete or repair the state.
Distributed transactions across external providers are not required; any
external or separate metadata boundary is coordinated through durable
workflow state and reconciliation.

## Alternatives considered

### Independent best-effort updates

This is simple, but can leave the active-policy reference and recovery metadata
describing different policies after interruption or partial failure.

### Distributed transaction across all metadata systems

This could appear to provide global atomicity, but adds complexity and is not
required when durable intermediate state, idempotent steps, reconciliation, and
fail-closed behavior provide equivalent safety.

### Switch the pointer first and repair metadata later without a workflow

This may reduce activation latency, but exposes an incomplete state without a
durable operation boundary or safe recovery semantics.

## Consequences

- Policy activation has one durable operation identity and explicit outcome.
- Local transaction boundaries are used where available, while cross-boundary
  coordination remains recoverable without distributed transactions.
- The previously active approved policy remains authoritative when a pre-switch
  failure occurs.
- Post-switch metadata failures remain visible as incomplete recovery state
  rather than being hidden by fallback behavior.
- Recovery can identify and reconcile the policy associated with the deployment.

## Not decided by this ADR

This decision does not define the exact active-policy schema, transaction
boundary, workflow engine, intermediate-state values, retry schedule,
reconciliation queries, operation-key format, or concrete fail-closed operator
interface.

