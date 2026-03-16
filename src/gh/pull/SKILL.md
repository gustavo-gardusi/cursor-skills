---
name: gh-pull
description: >-
  Sync branch with main and/or upstream: merge, resolve conflicts, then get
  tests passing again. Use when pulling, syncing with main, or updating from
  upstream.
---

# Pull

**Responsibility:** Merge current branch with main and/or upstream; focus on resolving conflicts; then keep going until tests pass again. Does **not** create or update PRs (use **gh-pr**) or address PR review comments (use **gh-pr-review**).

Update current branch from origin, then merge `main` and/or `upstream/main` as applicable. Resolve all conflicts. After push, run the project’s test (and format/lint if quick); if anything fails, fix and re-run until tests pass or report what remains.

## On invoke

Start immediately. Run commands one by one. Do not summarize. Focus on merge, conflict resolution, and getting to a passing state.

## Workflow

1. **Branch** — `BRANCH=$(git branch --show-current)`.

2. **Pull current branch** — `git fetch origin`, then `git merge origin/$BRANCH` (or `git pull origin $BRANCH`). If branch has no remote yet, skip the merge. **Resolve conflicts**; complete the merge before continuing.

3. **Merge main** — If `$BRANCH` is not `main`: `git merge origin/main`. **Resolve conflicts.** (If on main, skip.)

4. **Merge upstream** — If upstream exists: `git remote get-url upstream`; if missing, try `gh repo view --json parent -q '.parent.owner.login + "/" + .parent.name'` and add upstream. If upstream exists: `git fetch upstream`, `git merge upstream/main`. **Resolve conflicts.**

5. **Push** — If any merge was done (steps 3 or 4): `git push origin $BRANCH`.

6. **Tests (and format/lint) pass** — From project root, run the project’s format (if fast), lint (if fast), and test (e.g. `cargo test`, `go test ./...`, `npm test`, `pytest`). If any fail: fix in the changed/conflicted files, commit, push, then re-run. **Repeat until tests pass** or report what still fails and what was tried.

## Notes

- Run from project root.
- Use merge (not rebase). To abort: `git merge --abort`.
- Prerequisites: git; optional `gh` for adding upstream from parent when missing.
- **Split:** For creating/updating a PR after the branch is ready, use **gh-pr**. For fixing review comments and CI on an existing PR, use **gh-pr-review**.
