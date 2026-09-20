# Agent Instructions

## Before changes

- Read `README.md`, `CONTEXT.md`, and the relevant files under `docs/` before making changes.
- Treat every `TBD` as undecided; do not infer or silently introduce requirements.

## Decision discipline

- Do not change architecture decisions silently.
- Record important approved architecture decisions under `docs/decisions/`.
- Ask for approval before widening scope or changing the deployment model.

## Implementation guidance

- Prefer simple, secure, and maintainable solutions.
- Keep changes small and testable.
- Verify current external documentation before relying on changing platform or API behavior.
- Never commit secrets or credentials.

## Current project state

- Phase 1 application scaffolding is present under `apps/backend` and `apps/storefront`.
- The workspace uses pnpm `10.11.1` and Node.js `22.23.2`; package versions and commands are recorded in the manifests and implementation plan.
- PostgreSQL, payment, email, object-storage, deployment, and other provider configuration remain deferred until the relevant phase is approved.

## Package Manager

`pnpm@10.11.1` from the repository root.

## File-Scoped Commands

Use the root workspace scripts and package-local scripts documented in the
manifests; Phase 1 validation uses `pnpm install`, `pnpm typecheck`, and
`pnpm build`.

## Commit Attribution

`TBD` — no project-specific commit attribution convention has been decided.
