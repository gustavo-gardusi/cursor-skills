---
name: gh-start
description: >-
  Move to main and integrate it, create a new branch from task context, then
  optionally publish via gh-push.
---

# Start (New Branch)

**Cursor skill:** **`@gh-start`**

## Unique ownership

- `@gh-start` owns branch creation flow.
- `@gh-main` owns moving to/integrating `main`.
- `@gh-push` owns publish operations.
- `@gh-reset` is the only reset/clean owner (invoked via `@gh-main` when needed).

## Workflow

1. **Get Context**: Identify ticket, issue, or activity from user.
   - Jira: `TIS-503` → `tis-503`
   - GH Issue: `#42` → `42-fix-login`
   - Activity: "add login" → `add-login`

2. **Sync Main**: Run full **[`@gh-main`](../main/SKILL.md)** to switch to `main`, fetch remotes, and integrate canonical `main`.

3. **Create Branch**: `git checkout -b "$BRANCH"`

4. **Publish (optional)**:
   - If user asked to publish now, run full **[`@gh-push`](../push/SKILL.md)**.
   - If user did not ask to publish, stop after local branch creation.

## Branch name examples

| Context        | Example input     | Branch name      |
|----------------|-------------------|------------------|
| Jira           | TIS-503           | `tis-503`        |
| GH issue       | #42               | `42-fix-login`   |
| Activity       | add user login    | `add-user-login` |
