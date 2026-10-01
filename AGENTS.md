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

## Subagent orchestration

- Use subagents only when the task benefits from bounded, independent work; do not spawn them by default.
- Keep the primary thread focused on requirements, decisions, coordination, and final synthesis.
- Prefer parallel delegation for read-heavy work such as codebase exploration, documentation research, test/log triage, and summarization.
- Avoid parallel write-heavy agents against the same working tree or files. Prefer one implementation writer at a time unless the work is explicitly isolated.
- Use `code_mapper` when the relevant ownership or execution path is unclear. It is read-only and should return concise evidence rather than implementation.
- Use `docs_researcher` when behavior depends on current framework, library, API, or provider documentation. It is read-only and should return primary-source references where available.
- Use the built-in `worker` for focused implementation or fixes after the required behavior and approach are understood.
- Spawn `architect` as a read-only reviewer:
  - before committing to a large or architecture-sensitive implementation plan;
  - when the same error or failure returns after an attempted fix;
  - before declaring substantial or long-running work complete.
- Wait for relevant delegated read-only work and synthesize its findings before starting dependent implementation.
- Subagents must respect the parent session's permissions and the repository's existing scope, architecture, and `TBD` rules.
