---
name: gh-start
description: >-
  Start a new task branch from canonical main by delegating terminal execution
  to internal main-sync and branch-create executors.
---

# Start New Task

**Cursor skill:** **`@gh-start`**

## Role

Create a clean task branch from canonical `main`.

Terminal command execution is owned by internal skills:
- **[`internal/gh/main-sync`](../../internal/gh/main-sync/SKILL.md)**
- **[`internal/gh/branch-create`](../../internal/gh/branch-create/SKILL.md)** (create/switch branch commands)

## Inputs

- Jira key/URL, GitHub issue, or activity phrase.

## Outputs

- New branch checked out from synced local `main`.

## Does Not Do

- Does not push (`@gh-push`).
- Does not open/update PRs (`@gh-pr`).
- Does not run verification matrix (`@gh-check`).

## Workflow

1. Derive branch name from task context.
2. Delegate main alignment terminal steps to **[`internal/gh/main-sync`](../../internal/gh/main-sync/SKILL.md)**.
3. Delegate branch creation and checkout to **[`internal/gh/branch-create`](../../internal/gh/branch-create/SKILL.md)**.
4. Report branch and stop.

## Preconditions

- Branch name must be valid and non-empty.
- If already on a feature branch, confirm whether to continue there or create a new branch from `main`.

## Branch name examples

| Context        | Example input     | Branch name      |
|----------------|-------------------|------------------|
| Jira           | TIS-503           | `tis-503`        |
| GH issue       | #42               | `42-fix-login`   |
| Activity       | add user login    | `add-user-login` |

## Next Skill

- Publish branch: **[`@gh-push`](../push/SKILL.md)**
- Create/update PR: **[`@gh-pr`](../pr/SKILL.md)**

If blocked, rerun internal main sync first and retry branch creation.
