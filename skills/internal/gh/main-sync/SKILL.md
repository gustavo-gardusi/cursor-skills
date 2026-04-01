---
name: gh-main
description: >-
  Internal guidance for moving to main and integrating canonical main without
  destructive reset/clean.
---

# Main Sync (internal)

This internal document mirrors the public **`@gh-main`** boundary.

## Ownership split
- `@gh-main`: switch to `main`, fetch remotes, integrate canonical `main`, resolve conflicts.
- `@gh-reset`: destructive reset/clean only when explicitly requested.
- `@gh-push`: publish only.

## Internal flow
1. Validate repo.
2. Checkout local `main` (create from `origin/main` if needed).
3. Fetch `origin` and `upstream` when available.
4. Choose canonical `main` (`upstream/main` else `origin/main`).
5. Merge canonical `main` into local `main` (prefer ff-only, resolve conflicts if required).
6. Verify branch and merge state.

## Command runbook

### 1) Validate repository and switch to `main`

```bash
git rev-parse --is-inside-work-tree
git checkout main
```

If local `main` does not exist:

```bash
git checkout -b main origin/main
```

### 2) Fetch remotes

```bash
git fetch origin
```

If upstream exists:

```bash
git fetch upstream
```

### 3) Resolve canonical root branch

- Prefer `upstream/main` when upstream is source of truth.
- Otherwise use `origin/main`.

### 4) Merge canonical root into local `main`

Prefer fast-forward:

```bash
git merge --ff-only "$ROOT_BRANCH"
```

If fast-forward is not possible, run a normal merge and resolve conflicts:

```bash
git merge "$ROOT_BRANCH"
```

### 5) Final verification

```bash
git branch --show-current
git status --short
git log -1 --oneline
```

No reset/clean commands are part of this internal main-sync executor.
