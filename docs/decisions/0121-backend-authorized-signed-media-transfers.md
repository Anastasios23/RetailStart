# ADR-0121: Backend-authorized signed media transfers

- Status: Accepted refinement of ADR-0037 and ADR-0048
- Date: 2026-09-19

## Context

ADR-0048 selects short-lived signed direct media transfer, while ADR-0037
makes backend authorization and metadata ownership mandatory. Object-storage
acceptance of a binary does not by itself establish that the application media
operation completed.

## Decision

Use backend-authorized short-lived signed transfers.

For V1:

- Medusa/backend authorizes each media operation;
- authorization is scoped to the client, environment, operation, object/key
  scope, and intended action;
- the backend issues only short-lived upload or download authorization;
- the browser may transfer binary data directly to object storage where
  appropriate;
- long-lived object-storage credentials never reach the browser;
- Medusa/backend owns media metadata and stable references; and
- backend-owned finalization verifies the expected object and records resulting
  metadata and references.

Failed or incomplete uploads do not silently become valid or published media.
Object-storage upload success alone is not completion of the backend media
operation.

Do not expose persistent storage credentials, let the browser create
authoritative media references, proxy every ordinary binary transfer when
direct signed transfer is safe, or treat object-storage acceptance as backend
finalization.

## Alternatives considered

### Backend-mediated transfer for every binary

This centralizes transfer control, but adds application bandwidth, latency, and
transfer complexity without being required for ordinary media.

### Direct transfer with persistent credentials

This breaks client isolation and exposes unacceptable credential authority.

## Consequences

- Object storage owns binary transport while Medusa owns authorization and
  application validity.
- Abandoned or incomplete objects can be distinguished from published media.
- Media finalization becomes an explicit retryable backend operation.

## Not decided by this ADR

This decision does not define signing mechanism, expiration, size limits,
MIME/type validation, integrity checks, or malware/content validation.
