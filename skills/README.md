# Skills Reference

This folder is the source of all Cursor skills in this repo.

Install them with:

```bash
./install.sh
```

Skills are copied to `~/.cursor/skills-cursor` by default.

## Typical flow

```text
@gh-start -> work -> @gh-push -> @gh-pr
```

Context flow is local and optional:

```text
@context-add -> @context-show -> @context-plan -> @context-execute
```

## Context skills

All context data is local to the active repository under `.cursor/`.

| Skill | Purpose |
| --- | --- |
| [**`/context-add`**](context/add/SKILL.md) | Create/update context entries in `.cursor/research-context.json`. |
| [**`/context-show`**](context/show/SKILL.md) | Read-only summary of current local context and plan status. |
| [**`/context-plan`**](context/plan/SKILL.md) | Read context and write/update `.cursor/research-plan.md`. |
| [**`/context-execute`**](context/execute/SKILL.md) | Execute `.cursor/research-plan.md` (Plan mode confirm, then Agent mode apply). |
| [**`/context-clear`**](context/clear/SKILL.md) | Confirm and clear local context artifacts. |

## GitHub skills

| Skill | Unique role |
| --- | --- |
| [**`/gh-check`**](gh/check/SKILL.md) | Verify repository state (discover -> pre-check deps -> docs consistency -> prepare -> format/lint/test). No git operations. |
| [**`/gh-main`**](gh/main/SKILL.md) | Sync local `main` through `@gh-reset` + `@gh-pull` orchestration. |
| [**`/gh-reset`**](gh/reset/SKILL.md) | Destructive branch reset/clean only (explicit confirmations). |
| [**`/gh-pull`**](gh/pull/SKILL.md) | Merge canonical `main` into the current branch and resolve conflicts. |
| [**`/gh-push`**](gh/push/SKILL.md) | Commit/publish flow, always after full `@gh-check`. |
| [**`/gh-pr`**](gh/pr/SKILL.md) | PR metadata and create/edit flow after publish. |
| [**`/gh-start`**](gh/start/SKILL.md) | Branch bootstrap flow from task context. |

## Boundary rules

- `@gh-check` never executes git commands.
- `@gh-main` is orchestration-only for main sync flow.
- `@gh-reset` is the only skill that defines or executes reset/clean behavior.
- `@gh-push` is the only skill that pushes.
