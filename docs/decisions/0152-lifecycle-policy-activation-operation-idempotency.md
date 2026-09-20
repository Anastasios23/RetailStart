# ADR-0152: Lifecycle-policy activation-operation idempotency

- Status: Accepted refinement of ADR-0045, ADR-0060, ADR-0150, and ADR-0151
- Date: 2026-09-20

## Context

ADR-0045 establishes backend-owned durable idempotency identities, and
ADR-0060 establishes durable correlation and operation identities. ADR-0150
requires one durable operation for coordinated activation, while ADR-0151
protects the active-policy transition against stale or competing requests.

Transport retries, process restarts, and worker replacement must not create a
second logical lifecycle-policy activation or reinterpret an existing one.
Q153 makes the request binding explicit without creating a separate
architectural boundary.

## Decision

Use a durable backend-owned activation operation identity with strict
request-consistency semantics.

Each activation request has one durable logical operation identity. Reusing the
same identity with the same activation parameters refers to the same logical
operation. The backend returns or resumes the existing operation outcome or
state rather than creating another activation.

The identity is bound to the request parameters that materially define the
state transition, including where applicable:

- client and environment;
- expected current active policy version;
- requested target approved policy version;
- activation operation type; and
- other approved activation parameters.

### Immutable activation request binding

For each accepted activation operation, the first accepted canonical request
parameters are permanently bound to that operation identity. A deterministic
request fingerprint may be stored to enforce the binding.

Equivalent retries must canonicalize to the same logical request. Equivalent
representation differences that do not change semantic intent must not create
false conflicts. Materially different activation parameters using the same
operation identity produce an explicit idempotency conflict.

The original accepted request parameters and fingerprint are immutable. A
retry must not overwrite the stored fingerprint, mutate the original request
to match a later conflicting request, or create a second logical activation
behind the same identity.

Canonicalization is deterministic and covers the parameters that define the
logical activation operation, including where applicable:

- client and environment;
- expected current active policy version;
- requested target policy version;
- operation type; and
- any other parameter that changes the intended state transition.

For the same operation identity and an equivalent request:

- a completed activation returns its existing successful outcome;
- an in-progress activation returns or resumes its existing operation state;
- a failed activation returns its existing failure or recovery state according
  to the approved retry model; and
- no second logical activation is created.

For the same operation identity with materially different parameters, the
backend rejects the request explicitly as an idempotency conflict. It does not
reinterpret the identity, overwrite the original parameters, or create a
hidden second activation under that identity.

Idempotency state remains durable across application restart and worker
replacement. Transport and client retries resolve against the existing
operation identity. This works together with ADR-0151: idempotency prevents
duplication of the same logical activation, while compare-and-set concurrency
control prevents stale or competing distinct activations from overwriting
newer state.

The implementation may use a durable idempotency record, request
fingerprint/hash, transactional uniqueness constraint, or an equivalent
backend-owned mechanism that provides these guarantees.

## Alternatives considered

### Create a new activation operation for every retry

This might simplify request handling, but can duplicate transitions or create
competing activation records after transport uncertainty.

### Last-write-wins reuse of an operation identity

This avoids an immediate error, but silently changes the requested state
transition and makes the original operation history unreliable.

### Process-local idempotency state

This is simple, but loses operation identity across restarts, worker
replacement, parallel instances, and recovery.

## Consequences

- One logical activation has one durable identity across retries and restarts.
- Equivalent retries can safely return or resume the original operation.
- Parameter changes under an existing identity become explicit conflicts.
- Idempotency and concurrency provide separate, composable protections for
  duplicate and competing activation requests.
- Activation records require durable storage and explicit request-consistency
  handling.

## Not decided by this ADR

This decision does not define the operation-key format, canonical serialization
format, request canonicalization or fingerprint algorithm, idempotency-record
schema, failure retry schedule, conflict error contract, expiry rules, or
provider-specific idempotency keys.
