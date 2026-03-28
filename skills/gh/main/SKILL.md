---
name: gh-main
description: >-
  Align local main with canonical remote main. Checkout main, reset/clean via
  gh-reset, then integrate upstream via gh-pull.
---

# Sync Main

**Cursor skill:** **`@gh-main`**

## Role

Orchestrate safe `main` alignment flow.

## Workflow

1. Validate repository.
2. Checkout `main`.
3. Run full **[`@gh-reset`](../reset/SKILL.md)**.
4. Run full **[`@gh-pull`](../pull/SKILL.md)**.
5. Verify `main` is clean and up to date.

## Does Not Do

- Does not create task branches (`@gh-start`).
- Does not publish (`@gh-push`).
- Does not create PRs (`@gh-pr`).

## Next Skill

- Start task branch: **[`@gh-start`](../start/SKILL.md)**
- Publish branch: **[`@gh-push`](../push/SKILL.md)**

If blocked, run **[`@gh-reset`](../reset/SKILL.md)** and retry.
