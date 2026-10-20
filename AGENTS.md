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

- All 17 phases of `docs/implementation-plan.md` are implemented and merged on `main`: Medusa/PostgreSQL baseline, catalog (products, variants, categories), basic keyword search, persistent cart, guest checkout, Stripe test-mode payment, authoritative order confirmation/reconciliation, transactional notifications, post-purchase operations (fulfillments, refunds, restock), media workflow, bulk onboarding, observability, zero-downtime deployment lifecycle, backup/recovery, client presentation configuration, privacy lifecycle CAS, and production-readiness verification.
- The workspace uses pnpm `10.11.1` and Node.js `22.23.2`; package versions and commands are recorded in the manifests and implementation plan.
- The platform satisfies all release gates indexed in `docs/release-readiness-v1.md`.

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
- Use the project `code_mapper`. Use it for targeted, narrow repository exploration when ownership or the execution path is unclear. It is read-only and should return concise evidence rather than implementation. For broad repository mapping use `gsd-codebase-mapper` if it is available, otherwise the built-in `explorer`; only when broad mapping is actually needed.
- Use the project `docs_researcher`. Use it for narrow, current official-documentation checks of framework, library, API, or provider behavior. It is read-only and should return primary-source references where available. Use broader research workflows (for example GSD, if available) only when phase-level or project-wide research is genuinely required.
- Use the built-in `worker` for focused implementation or fixes after the required behavior and approach are understood.
- External GSD agents are optional: use them for routine specialist checkpoints only when they are available in the session, with assignments bounded to the current task. This repository does not define them, so each checkpoint has a repository-local fallback:
  - Before an important or architecture-sensitive implementation plan: `gsd-plan-checker` if available; otherwise the project `architect` only when its escalation conditions apply, else a primary-agent review of the plan.
  - When the same error or failure returns after an attempted fix: `gsd-debugger` if available; otherwise `code_mapper` for evidence and the built-in `worker` for the fix.
  - Before declaring substantial or long-running work complete: `gsd-verifier` if available; otherwise the primary agent runs the required gates and reviews the diff.
  - For an adversarial code-quality or security-oriented implementation review when useful: `gsd-code-reviewer` if available; otherwise the built-in `default` agent, or the project `architect` only when its escalation conditions apply.
- Use the project `architect` only as a read-only, escalation-only reviewer. Do not spawn it automatically at the routine plan/debug/done checkpoints. Use it only when at least one of these conditions is true:
  - A high-impact architecture decision has material uncertainty.
  - The decision affects payments, security boundaries, data ownership, or another difficult-to-reverse system boundary.
  - Reviewers (the primary agent or optional GSD agents) materially disagree.
  - Repeated investigation still leaves a serious unresolved architectural question.
- Wait for relevant delegated read-only work and synthesize its findings before starting dependent implementation.
- Project agents do not pin a model or reasoning level; they inherit the active parent session's model and reasoning unless the user or runtime gives an explicit override. Their role is defined by their instructions and read-only permissions.
- Subagents must respect the parent session's permissions and the repository's existing scope, architecture, and `TBD` rules.
- These orchestration rules apply only to this repository. Do not modify global Codex or GSD configuration to implement them.
