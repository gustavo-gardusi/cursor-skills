---
name: gh-branch-create
description: >-
  Internal executor for creating and checking out task branches from a synced
  base branch.
---

# Branch Create (internal)

Internal executor for the public `@gh-start` boundary.

## Responsibility

- Own runnable branch-creation terminal commands.
- Validate branch naming safety before creation.
- Do not push, open PRs, or run verification matrix.

## Command runbook

### 1) Validate repository and branch name

```bash
git rev-parse --is-inside-work-tree
```

- Ensure `BRANCH` is non-empty and valid.
- If `BRANCH` already exists, ask whether to switch or abort.

### 2) Create/switch branch

Create new branch:

```bash
git checkout -b "$BRANCH"
```

If reusing existing branch by explicit user choice:

```bash
git checkout "$BRANCH"
```

### 3) Verify

```bash
git branch --show-current
git status --short
```

Report final branch name and stop.
