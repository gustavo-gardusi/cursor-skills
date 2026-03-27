# Skills Quick Reference

## Public context skills

| Skill | Purpose |
|---|---|
| `@context-add` | Add/update project notes in `.cursor/research-context.md`. |
| `@context-show` | Show concise summary of local context + plan status. |
| `@context-plan` | Generate/update `.cursor/research-plan.md` from context. |
| `@context-clear` | Clear local context files for current repo. |

Flow: `@context-add` -> `@context-show` -> `@context-plan` -> `@context-clear`

## Public GitHub skills

| Skill | Unique role |
|---|---|
| `@gh-check` | Verify only (discover, pre-check deps, prepare, format/lint/test). No git operations. |
| `@gh-main` | Maestro flow: checkout `main`, then delegate reset/clean to `@gh-reset` and integration to `@gh-pull`. |
| `@gh-reset` | Single owner of reset/clean operations, with confirmations. |
| `@gh-pull` | Merge canonical `main` into current branch. |
| `@gh-push` | Commit and publish after successful `@gh-check`. |
| `@gh-pr` | Create/update PR metadata. |
| `@gh-start` | Bootstrap a branch from task context, then optionally publish. |

Flow: `@gh-start` -> work -> `@gh-push` -> `@gh-pr`

## Key boundaries

- `@gh-check` never runs git commands.
- `@gh-main` is orchestration-only.
- `@gh-reset` is the only skill that defines or executes reset/clean behavior.
- `@gh-push` is the only push skill.
