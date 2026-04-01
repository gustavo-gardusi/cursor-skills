---
name: gh-main
description: >-
  Align local main with canonical remote main by delegating terminal steps to
  internal reset/sync executors.
---

# Sync Main

**Cursor skill:** **`@gh-main`**

## Role

Orchestrate safe `main` alignment flow.

Terminal command execution is owned by internal skills:
- **[`internal/gh/branch-reset`](../../internal/gh/branch-reset/SKILL.md)** for destructive reset/clean
- **[`internal/gh/main-sync`](../../internal/gh/main-sync/SKILL.md)** for main sync/merge commands

## Workflow

1. Validate repository.
2. Delegate sync/merge terminal steps to **[`internal/gh/main-sync`](../../internal/gh/main-sync/SKILL.md)** to ensure execution is on local `main`.
3. If destructive reset/clean is required, run **[`internal/gh/branch-reset`](../../internal/gh/branch-reset/SKILL.md)** while on `main`.
4. After reset, rerun **[`internal/gh/main-sync`](../../internal/gh/main-sync/SKILL.md)** to confirm `main` is aligned.
5. Verify `main` is clean and up to date.

## Does Not Do

- Does not create task branches (`@gh-start`).
- Does not publish (`@gh-push`).
- Does not create PRs (`@gh-pr`).

## Next Skill

- Start task branch: **[`@gh-start`](../start/SKILL.md)**
- Publish branch: **[`@gh-push`](../push/SKILL.md)**

If blocked, rerun **[`internal/gh/branch-reset`](../../internal/gh/branch-reset/SKILL.md)** and retry.
