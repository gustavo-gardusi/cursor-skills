---
name: gh-pull
description: >-
  Sync current branch by merging tracking branch and canonical main with conflict
  resolution. No push or PR metadata actions.
---

# Sync Branch

**Cursor skill:** **`@gh-pull`**

## Role

Merge latest remote updates into the current branch.

## Workflow

1. Detect current branch and fetch remotes.
2. Merge tracking branch when configured.
3. Merge canonical `main` (`upstream/main` preferred, else `origin/main`).
4. Resolve conflicts carefully and commit merge.
5. Report sync result.

## Preconditions

- Must be on a branch (not detached HEAD).

## Does Not Do

- Does not publish (`@gh-push`).
- Does not run full verification (`@gh-check`).
- Does not create/update PR metadata (`@gh-pr`).

## Next Skill

- Test overall: **[`@gh-check`](../check/SKILL.md)**
- Publish branch: **[`@gh-push`](../push/SKILL.md)**

If blocked by conflicts, resolve manually and rerun **[`@gh-pull`](../pull/SKILL.md)**.
