# ADR-0122: Immutable media publication and replacement

- Status: Accepted refinement of ADR-0048, ADR-0058, and ADR-0059
- Date: 2026-09-19

## Context

ADR-0058 separates published public-read media from protected private media.
ADR-0059 selects immutable object keys and new references for replacement.
Publication must remain backend-owned and reversible without relying on exact
global cache invalidation.

## Decision

Use split visibility with immutable replacement references.

For V1:

- published storefront media may use stable public read access suitable for
  CDN delivery;
- private, unpublished, administrative, temporary, and staging media use
  protected access appropriate to their visibility;
- each replacement creates a new immutable object key and reference;
- existing published objects are not overwritten in place;
- Medusa/backend controls the authoritative published reference;
- replacement becomes visible by updating that reference;
- old objects remain until safe retirement; and
- cleanup may run asynchronously after the new reference is authoritative.

Rollback may restore a previous valid reference while its object remains
retained. Correctness does not depend on globally purging caches at the exact
moment of replacement.

Do not overwrite public object keys, make public visibility the default for
private media, proxy every public read through Medusa, or delete the old object
before the new reference is safely established.

## Alternatives considered

### Overwrite stable public object keys

This simplifies references, but creates stale-cache, rollback, and replacement
race risks.

### Proxy every public read through Medusa

This centralizes reads, but adds unnecessary application load and does not
improve public-media ownership.

## Consequences

- Media references are cache-safe and rollback-friendly.
- Publication state remains a backend-owned metadata decision.
- Superseded and abandoned objects require asynchronous lifecycle cleanup.

## Not decided by this ADR

This decision does not define CDN policy, retention windows, cleanup schedule,
cache-control headers, or signed-read mechanisms.
