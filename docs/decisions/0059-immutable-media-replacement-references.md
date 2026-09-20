# ADR-0059: Immutable media replacement references

- Status: Accepted
- Date: 2026-09-19

## Context

ADR-0048 establishes backend-authorized media transfer and ADR-0058 establishes
split published/private visibility. Public media must be replaceable without
depending on browser or CDN cache expiration to discover changed content.

## Decision

Use immutable media object keys with new references for every replacement.

For V1:

- Every newly uploaded or replacement asset receives a new immutable object
  key or version.
- Existing published objects are not overwritten in place.
- Medusa/backend updates the authoritative media reference or publication
  pointer to the new object.
- Previously referenced objects remain unchanged until explicitly retired.
- Superseded, orphaned, or abandoned objects may be cleaned up asynchronously
  through backend-owned lifecycle handling.
- Public media references are cache-safe and do not depend on forced global CDN
  invalidation for correctness.
- Publication changes remain explicit and reversible where operationally useful.

Retired objects are not deleted immediately if deletion could break an
in-progress publication change, rollback, or valid reference still in use.

## Alternatives considered

### Overwrite an existing public object key

This is simple but risks stale browser or CDN content, races, and unexpected
content changes for an existing reference.

### Stable backend-proxied media URL

This could hide object replacement behind one URL, but would proxy public media
through Medusa and add unnecessary bandwidth and latency.

### Immediate deletion of the previous object

This reduces storage quickly but could break rollback, in-progress publication,
or a still-valid reference.

## Consequences

- A media reference identifies a stable object version.
- Publication changes can be rolled forward or back by changing the backend-owned
  reference or pointer.
- Cache correctness does not depend on global invalidation timing.
- Retired and abandoned media require asynchronous lifecycle cleanup.
- Storage usage may temporarily include multiple versions of an asset.

## Not decided by this ADR

This decision does not select object-key format, version/reference structure,
retention period, cleanup schedule, orphan detection, or CDN invalidation
behavior.

