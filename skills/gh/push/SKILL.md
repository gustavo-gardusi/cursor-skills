---
name: gh-push
description: >-
  Publish current branch after full gh-check. Handles commit and push only.
---

# Publish Branch

**Cursor skill:** **`@gh-push`**

## Role

Safely publish current branch.

## Workflow

1. Run full **[`@gh-check`](../check/SKILL.md)**.
2. Stop on failure.
3. Commit if working tree is dirty.
4. Push current branch (`git push` or `git push -u`).

## Preconditions

- Do not push directly from `main` unless the user explicitly requests it.

## Does Not Do

- Does not sync branches (`@gh-main`, `@gh-pull`).
- Does not create/update PR metadata (`@gh-pr`).

## Next Skill

- Create/update PR: **[`@gh-pr`](../pr/SKILL.md)**

If blocked by failed checks, fix issues and rerun **[`@gh-check`](../check/SKILL.md)**.
