---
name: gh-reset
description: >-
  Reset the working tree safely, hard-reset to a canonical ref, and clean the
  repository so local state matches the target branch/root.
---

# Reset (hard + clean)

**Responsibility:** Reconcile the local repo with a remote/tracked reference by
hard-resetting and removing untracked/ignored artifacts. Useful when the local
working tree drifted and you want a clean, reproducible baseline before continuing.

## On invoke

Run commands one by one, and always state that uncommitted changes and untracked
files will be removed. If the repo state is already clean, proceed immediately.

## Workflow

### 1. Validate location

`git rev-parse --is-inside-work-tree`.

### 2. Capture current branch

`BRANCH=$(git branch --show-current)`.

If detached, stop and ask the user to check out a branch first.

If `git status --short` shows changes, ask for explicit confirmation before continuing because reset and clean are destructive.

### 3. Fetch all remotes

`git fetch --all --prune`.

### 4. Resolve target reference

In priority order:

1. If branch has upstream tracking: `@{u}`.
2. If on `main` and upstream exists: `upstream/main` when it exists.
3. Otherwise: `origin/$BRANCH`.
4. Fallback root: `origin/main` (or `upstream/main` if the former is unavailable).

Example target variable:

`TARGET=<resolved_ref>`

### 5. Confirm destructive reset

Warn: this will remove local changes and untracked files.

- `git status --short`
- `git reset --hard "$TARGET"`
- `git clean -fdx`

If `git clean` should keep ignored files, use `git clean -fd`.

### 6. Final verification

`git status --short` should be clean.  
`git log -1 --oneline` should show the local branch tip aligned with `$TARGET`.

## Notes

- Keep your work: if you need parts of local changes later, `git stash push -u`
  before reset and recover via `git stash list`/`git stash apply`.
- This is intentionally strong cleanup and should be used for recovery or known-stable branch refreshes.
- Do not use if a merge/rebase is in progress unless resolved first.
- This skill changes only git state; it does not touch project files beyond what Git tracks.
