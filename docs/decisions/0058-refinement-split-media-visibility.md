# ADR-0058: Refinement of split media visibility

- Status: Accepted refinement of ADR-0048
- Date: 2026-09-19

## Context

ADR-0048 establishes backend-authorized signed media transfer, with object
storage owning binaries and Medusa owning media authorization, metadata, and
stable references. Q58 clarifies read visibility for published storefront
media versus unpublished, administrative, temporary, or private media.

## Relationship to ADR-0048

This record refines ADR-0048. It does not replace the media ownership,
authorization, or client-isolation boundary established there.

## Decision

Use split published/private media visibility.

For V1:

- Published product images, logos, and approved storefront media may use stable
  public read references suitable for direct object-storage or CDN delivery.
- Unpublished, administrative, temporary, or private media remains protected
  and uses backend-authorized short-lived access where required.
- All media writes remain backend-authorized under ADR-0048.
- Medusa/backend owns media metadata and the decision whether an asset is
  published or private.
- Client isolation applies to public and private media namespaces and
  references.
- Public readability never implies public write access.
- Media replacement and publication changes support versioned references or
  safe cache invalidation so outdated public assets do not remain
  unintentionally active.

Publication state is not determined only from storage location when
backend-owned metadata or configuration should define it.

## Alternatives considered

### All media protected by signed downloads

This would provide uniform access control but would add unnecessary signed-URL
issuance and refresh complexity for ordinary published storefront media.

### Proxy all public reads through Medusa

This would centralize read authorization but would route public binary traffic
through the commerce backend, increasing bandwidth, latency, and operational
load.

### Storage location as the publication authority

This could simplify lookup but would weaken the backend-owned publication model
and make accidental exposure or inconsistent state more likely.

## Consequences

- Ordinary published storefront media can use efficient direct delivery.
- Private and unpublished media retains a backend authorization boundary.
- Publication and replacement state must be represented in Medusa-owned
  metadata/configuration.
- Public media changes require deliberate versioning or cache invalidation.
- Public read access remains separate from all write authorization.

## Not decided by this ADR

This refinement does not select bucket visibility, URL structure, CDN behavior,
cache headers, publication workflow, media-versioning strategy, or the exact
private-media categories.

