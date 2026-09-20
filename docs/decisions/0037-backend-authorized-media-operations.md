# ADR-0037: Backend-authorized media operations

- Status: Accepted
- Date: 2026-09-19

## Context

Client-managed media is stored in isolated object storage, while Medusa or the
backend owns administrative authorization and commerce-related references.
Binary files have a different persistence lifecycle from PostgreSQL data, but
media operations still require client and administrative isolation.

## Decision

Keep media upload authorization backend-owned while object storage owns the
binary files.

For V1:

- Medusa or the backend authorizes admin-managed media operations;
- Medusa records required media metadata and stable object-storage references;
- object storage owns the actual binary files;
- client isolation applies to media storage as well as application and database
  state;
- the browser never receives long-lived object-storage credentials;
- upload and download access may use backend-mediated operations or short-lived
  authorized URLs or tokens where appropriate.

The backend validates that media operations are authorized for the correct
client and administrative context.

Do not expose persistent object-storage credentials to the browser, allow
unrestricted direct uploads, store binary media in PostgreSQL, or rely on
application-local filesystem storage for durable media.

## Alternatives considered

### Persistent browser storage credentials or unrestricted direct uploads

This could simplify upload paths, but would weaken client isolation and make
authorization, validation, and orphaned-file control unsafe.

### Backend or application filesystem as the binary owner

This would couple media to application persistence and contradict the isolated
object-storage decision.

## Consequences

- Media authorization remains inside the backend security boundary.
- Object storage can evolve independently from the commerce database.
- Upload and download flows need explicit client, admin, and object-reference
  validation.
- Short-lived browser access may be introduced without exposing permanent
  credentials.

## Not decided by this ADR

This decision does not select public/private media policy, signed URL
mechanism, upload validation rules, deletion or orphan cleanup behavior, or the
Medusa file-provider integration.
