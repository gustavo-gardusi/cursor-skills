---
name: gh-start
description: >-
  Start a new task branch from canonical main. Derive branch name from ticket,
  issue, or activity. No publish or PR actions.
---

# Start New Task

**Cursor skill:** **`@gh-start`**

## Role

Create a clean task branch from canonical `main`.

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
2. Run full **[`@gh-main`](../main/SKILL.md)**.
3. Create branch: `git checkout -b "$BRANCH"`.
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

If blocked, run **[`@gh-main`](../main/SKILL.md)** first and retry.
