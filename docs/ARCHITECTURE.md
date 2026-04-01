# Architecture

## Principles

- Markdown-first skill repository.
- No Node runtime/toolchain required for installation or usage of this repo.
- One installer entrypoint: `install.sh`.
- Strong skill ownership boundaries to avoid overlap.

## Repository shape

- `skills/` contains all public/internal skill definitions.
- `docs/` contains supporting documentation.
- `install.sh` copies skills into Cursor's local skill directory.

## Skill boundary model

### GitHub workflow boundaries

- `@gh-check`: verification only (discover, dependency pre-check, docs consistency, prepare, format/lint/test). No git commands.
- `@gh-main`: orchestrate `main` sync flow.
- `@gh-reset`: destructive reset/clean only, with explicit confirmations.
- `@gh-pull`: merge tracking and canonical `main` into current branch.
- `@gh-push`: commit/push only after successful `@gh-check`.
- `@gh-pr`: PR metadata create/edit flow only.
- `@gh-start`: create a task branch from canonical `main`.

### Context boundaries

- `@context-add`: create/update local context data.
- `@context-show`: read-only local summary.
- `@context-plan`: read local context and produce plan markdown.
- `@context-execute`: execute plan after mode handoff (Plan -> Agent).
- `@context-clear`: clear local context files.

No browser orchestration, global profile cache, or script runtime is part of the active architecture.

## Local context storage

Per repository (`<repo>/.cursor/`):

- `research-context.json`: context source of truth.
- `research-context.txt`: optional readable export.
- `research-plan.md`: planning output.

This keeps context scoped to the current project.
