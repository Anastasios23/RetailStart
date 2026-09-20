# ADR-0048: Backend-authorized signed media transfer

- Status: Accepted
- Date: 2026-09-19

## Context

V1 requires durable client-isolated media for product images, logos, and other
client-managed files. Object storage owns the binary files, while Medusa owns
authorization, media metadata, and stable object references.

The browser must not receive long-lived object-storage credentials or bypass
the backend's client and administrative authorization boundary.

## Decision

Use backend-authorized short-lived signed URLs for media transfer where
appropriate.

For V1:

- Medusa/backend authorizes the media operation.
- The backend issues a short-lived, scoped upload or download authorization.
- The browser transfers the binary directly to object storage.
- Object storage remains the durable owner of the binary file.
- Medusa records the required media metadata and stable object reference.
- Signed access is limited by operation, object scope, and expiration.
- Long-lived object-storage credentials are never exposed to the browser.

Issuing an upload URL does not make the upload valid application media. A
backend-owned finalization step is required where needed so Medusa can verify
and record the completed object before it becomes an authoritative media
reference.

The implementation must account for allowed file type/content type, size
limits, client ownership, incomplete and abandoned uploads, orphaned objects,
deletion and replacement, and retry-safe finalization.

If signed direct transfer proves unsuitable for a particular provider or
security requirement, backend-mediated transfer may be used as a targeted
fallback without changing the ownership and authorization model.

## Alternatives considered

### Backend-mediated transfer as the default

This would centralize binary validation and authorization in Medusa, but would
route all media traffic through the application, increasing backend bandwidth,
latency, and operational load.

### Unrestricted direct storage access or persistent browser credentials

This could simplify the upload path but would weaken client isolation,
authorization, and credential security. It is not acceptable.

## Consequences

- Object storage remains independent of application instances and deployments.
- The browser can transfer media without receiving persistent storage
  credentials.
- The backend must implement or use a safe finalization and validation path.
- Abandoned and orphaned objects require explicit lifecycle handling.
- A provider-specific transfer fallback remains possible without changing the
  authority boundary.

## Not decided by this ADR

This decision does not select the object-storage provider, bucket visibility,
signed-URL mechanism, validation limits, finalization protocol, orphan-cleanup
policy, or CDN behavior.

