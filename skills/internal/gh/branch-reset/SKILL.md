---
name: gh-reset
description: >-
  Internal branch reset guidance: destructive reset/clean only, explicit
  confirmations, and no branch switching.
---

# Reset (internal)

Internal executor for the public `@gh-reset` boundary.

## Responsibility

- Stay on current branch.
- Never stash in this skill.
- Reset/clean only after explicit confirmation.
- Do not merge/push from this skill.
- Own all runnable terminal commands for reset flow.

## Core flow

1. Validate repository and resolve branch.
2. Fetch remotes and resolve target reference.
3. Inspect impact (dirty state, ahead commits, clean dry-run).
4. If any impact exists, require explicit proceed confirmation.
5. Confirm hard reset and execute.
6. Confirm clean and execute.
7. Optionally run non-git cleanup (each with separate confirmation).
8. Verify terminal state and report.

## Command runbook

### 1) Validate location and branch

```bash
git rev-parse --is-inside-work-tree
BRANCH=$(git branch --show-current)
```

- If detached HEAD (`$BRANCH` empty), stop and ask user to check out a branch.

### 2) Fetch and resolve target

```bash
git fetch --all --prune
```

Resolve `TARGET` in this order:
1. `origin/main` exists -> use `origin/main`
2. else `origin/$BRANCH` exists -> use `origin/$BRANCH`
3. else tracking ref exists -> use `@{u}`
4. else stop and ask user for explicit target ref

Suggested checks:

```bash
git show-ref --verify --quiet refs/remotes/origin/main
git show-ref --verify --quiet "refs/remotes/origin/$BRANCH"
git rev-parse --abbrev-ref "@{u}"
```

### 3) Inspect impact before destruction

Dirty check:

```bash
git status --short
```

Ahead-of-main check (when `origin/main` exists):

```bash
git rev-list --count origin/main..HEAD
```

Clean dry-run preview:

```bash
git clean -fdxn
```

### 4) Mandatory proceed prompt on non-empty impact

If **any** of the following is non-empty/non-zero:
- dirty tracked/untracked state,
- ahead commits vs `origin/main`,
- files listed by clean dry-run,

then explicitly prompt whether to proceed before destructive execution.

If user does not explicitly confirm, stop.

### 5) Confirm and execute hard reset

Require explicit confirmation, then run:

```bash
git reset --hard "$TARGET"
```

### 6) Confirm and execute clean

Require explicit confirmation of clean mode, then run one:

```bash
git clean -fdx
```

or

```bash
git clean -fd
```

### 7) Optional non-git cleanup (separate confirmations)

Each optional command requires its own explicit confirmation.
Examples:
- `docker builder prune -f`
- `docker system prune` (strong confirmation)
- `podman builder prune`
- `podman system prune`
- `npm cache clean --force`

### 8) Final verification

```bash
git branch --show-current
git status --short
git log -1 --oneline
```

Report: current branch, target used, whether ahead commits were dropped, and clean status.

## Notes

- Keep this skill independent from `@gh-main`.
- No browser/script-specific cleanup steps are part of this skill.
