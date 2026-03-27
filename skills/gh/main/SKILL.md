---
name: gh-main
description: >-
  Maestro flow for main: checkout main, then delegate reset/clean to gh-reset
  and merge/conflict integration to gh-pull.
---

# Main (maestro flow)

**Cursor skill:** **`@gh-main`**

Purpose: orchestrate the safe sequence for updating `main` without duplicating lower-level logic.

## Unique ownership

- `@gh-main` owns: orchestration only (`checkout -> @gh-reset -> @gh-pull`).
- `@gh-reset` owns: all reset/clean behavior.
- `@gh-pull` owns: fetch/pull and merge conflict flow on the current branch.
- `@gh-push` owns: commit/publish.

## On invoke

Run from workspace root. This skill delegates lower-level operations to other gh skills; do not inline reset/clean logic here.

## Workflow

### 1) Validate repository

Run `git rev-parse --is-inside-work-tree`.

### 2) Switch to local main first

Run `git checkout main`.

If `main` does not exist locally but `origin/main` exists, create it from remote:
- `git checkout -b main origin/main`

If checkout fails because of local changes/conflicts:
- stop and ask user to resolve or delegate to **[`@gh-reset`](../reset/SKILL.md)**.

### 3) Delegate reset/clean to `@gh-reset`

Run full **[`@gh-reset`](../reset/SKILL.md)**.

### 4) Delegate integration to `@gh-pull`

Run full **[`@gh-pull`](../pull/SKILL.md)**.

### 5) Verify

Confirm:
- current branch is `main`
- no unresolved conflicts remain
- main sync sequence (`@gh-reset` then `@gh-pull`) completed

## Notes

- `@gh-main` is a coordinator, not the owner of reset/clean or merge implementation details.
- Reset/clean ownership is centralized in **[`@gh-reset`](../reset/SKILL.md)**.
- For publishing after sync, use **[`@gh-push`](../push/SKILL.md)**.
