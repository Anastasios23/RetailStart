# ADR-0118: Separate CORS and CSRF controls

- Status: Accepted refinement of ADR-0065
- Date: 2026-09-19

## Context

ADR-0117 restricts browser Store API origins. Origin authorization and
protection against state-changing requests made with ambient browser
credentials address different threats and must not be conflated.

## Decision

Treat CORS and CSRF as separate security controls.

For V1:

- CORS controls which browser origins may make permitted cross-origin requests;
- CORS is not the sole CSRF defense;
- state-changing requests using automatically attached browser credentials
  require an appropriate CSRF defense based on the actual session mechanism;
- the CSRF threat model is evaluated per endpoint; and
- public reads without ambient authorization do not receive unnecessary CSRF
  requirements.

Opaque guest-cart or continuation references remain narrowly scoped and do not
create administrative authority. An approved storefront origin alone does not
authorize privileged state-changing operations.

## Alternatives considered

### Treat CORS as CSRF protection

This is unsafe for cookie-backed or otherwise ambiently authenticated
state-changing requests.

### Universal CSRF protection for every request

This can add unnecessary complexity to requests without ambient credentials and
does not replace endpoint-specific threat analysis.

## Consequences

- Browser origin policy and state-change protection can be reasoned about
  independently.
- Endpoint security depends on the actual authentication/session behavior.
- The implementation must document why each state-changing flow does or does
  not require CSRF protection.

## Not decided by this ADR

This decision does not select cookie attributes, token mechanisms, headers,
session implementation, or exact Medusa/Next.js integration details.
