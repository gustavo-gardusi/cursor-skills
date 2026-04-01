---
name: gh-push
description: >-
  Publish current branch by delegating terminal checks and publish commands to
  internal executors.
---

# Publish Branch

**Cursor skill:** **`@gh-push`**

## Role

Safely publish current branch.

Terminal command execution is owned by:
- **[`internal/gh/repo-check`](../../internal/gh/repo-check/SKILL.md)**
- **[`internal/gh/publish`](../../internal/gh/publish/SKILL.md)** (status/commit/push commands)

## Workflow

1. Delegate repository checks to **[`internal/gh/repo-check`](../../internal/gh/repo-check/SKILL.md)**.
2. Stop on failure.
3. Delegate commit/push execution to **[`internal/gh/publish`](../../internal/gh/publish/SKILL.md)**.

## Preconditions

- Do not push directly from `main` unless the user explicitly requests it.

## Does Not Do

- Does not sync branches (`@gh-main`, `@gh-pull`).
- Does not create/update PR metadata (`@gh-pr`).

## Next Skill

- Create/update PR: **[`@gh-pr`](../pr/SKILL.md)**

If blocked by failed checks, fix issues and rerun **[`@gh-check`](../check/SKILL.md)**.
