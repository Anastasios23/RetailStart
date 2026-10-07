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

- Phases 1-7 are implemented under `apps/backend` and `apps/storefront`: Medusa/PostgreSQL baseline, catalog (products, variants, categories), persistent cart, guest checkout, Stripe test-mode payment, and authoritative order confirmation/reconciliation. V1 is not complete; Phases 8-17 remain planned/incomplete (see `docs/implementation-plan.md`).
- The workspace uses pnpm `10.11.1` and Node.js `22.23.2`; package versions and commands are recorded in the manifests and implementation plan.
- Email, object-storage, deployment, and other provider configuration for Phases 8-17 remain deferred until the relevant phase is approved.

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
- Keep the project `code_mapper` on `gpt-6-luna` with high reasoning. Use it for targeted, narrow repository exploration when ownership or the execution path is unclear. It is read-only and should return concise evidence rather than implementation. Use `gsd-codebase-mapper` only when broad repository mapping is actually needed.
- Keep the project `docs_researcher` on `gpt-6-luna` with high reasoning. Use it for narrow, current official-documentation checks of framework, library, API, or provider behavior. It is read-only and should return primary-source references where available. Use broader GSD research workflows only when phase-level or project-wide research is genuinely required.
- Use the built-in `worker` for focused implementation or fixes after the required behavior and approach are understood.
- Use the existing GSD agents for routine specialist checkpoints, with assignments bounded to the current task:
  - Before an important or architecture-sensitive implementation plan, use `gsd-plan-checker`.
  - When the same error or failure returns after an attempted fix, use `gsd-debugger`.
  - Before declaring substantial or long-running work complete, use `gsd-verifier`.
  - For an adversarial code-quality or security-oriented implementation review when useful, use `gsd-code-reviewer`.
- Keep the project `architect` on `gpt-6-astra` with low reasoning as a read-only, escalation-only reviewer. Do not spawn it automatically at the routine plan/debug/done checkpoints. Use it only when at least one of these conditions is true:
  - A high-impact architecture decision has material uncertainty.
  - The decision affects payments, security boundaries, data ownership, or another difficult-to-reverse system boundary.
  - Sol/GSD reviewers materially disagree.
  - Repeated investigation still leaves a serious unresolved architectural question.
- Wait for relevant delegated read-only work and synthesize its findings before starting dependent implementation.
- Subagents must respect the parent session's permissions and the repository's existing scope, architecture, and `TBD` rules.
- These orchestration rules apply only to this repository. Do not modify global Codex or GSD configuration to implement them.
