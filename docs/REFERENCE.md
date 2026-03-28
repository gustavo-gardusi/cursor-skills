# Skills Quick Reference

## Public context skills

| Skill | Purpose |
|---|---|
| `@context-add` | Add/update project context in `.cursor/research-context.json`. |
| `@context-show` | Show concise summary of local context + plan status. |
| `@context-plan` | Generate/update `.cursor/research-plan.md` from context. |
| `@context-execute` | Execute `.cursor/research-plan.md` (Plan mode confirm, then Agent mode apply). |
| `@context-clear` | Clear local context files for current repo. |

Flow: `@context-add` -> `@context-show` -> `@context-plan` -> `@context-execute`

## Public GitHub skills

| Skill | Unique role |
|---|---|
| `@gh-check` | Verify only (discover, pre-check deps, docs consistency, prepare, format/lint/test). No git operations. |
| `@gh-main` | Orchestrate `main` sync via `@gh-reset` + `@gh-pull`. |
| `@gh-reset` | Single owner of reset/clean operations, with confirmations. |
| `@gh-pull` | Merge tracking/canonical `main` into current branch. |
| `@gh-push` | Commit and publish after successful `@gh-check`. |
| `@gh-pr` | Create/update PR metadata. |
| `@gh-start` | Start task branch from canonical `main`. |

Flow: `@gh-start` -> work -> `@gh-push` -> `@gh-pr`

## Key boundaries

- `@gh-check` never runs git commands.
- `@gh-main` is orchestration-only.
- `@gh-reset` is the only skill that defines or executes reset/clean behavior.
- `@gh-push` is the only push skill.
