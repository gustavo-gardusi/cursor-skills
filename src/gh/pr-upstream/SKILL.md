---
name: gh-pr-upstream
description: >-
  Create PR from fork to original repo. Merges upstream main first, resolves
  conflicts, pushes, then opens PR. Use when contributing to upstream or
  submitting changes from a fork.
---

# PR to upstream

Create PR from fork to original repo. Merge upstream main, resolve conflicts, push, create PR.

## On invoke

Start immediately. Run commands one by one. Do not summarize.

## Workflow

1. **Upstream** — `gh repo view --json parent -q .parent`. If null, stop. Add upstream if missing.
2. **Merge** — `BRANCH=$(git branch --show-current)`, `git fetch upstream`, `git merge upstream/main`, resolve conflicts
3. **Push** — `git push origin $BRANCH`
4. **PR** — `UPSTREAM` = upstream remote (e.g. parse `git remote get-url upstream` → `owner/repo`). `FORK_OWNER` = origin owner (`gh repo view --json owner -q .owner.login`). `gh pr list --repo $UPSTREAM --head $FORK_OWNER:$BRANCH`. If none, create with body from PR description rules below. Base: `upstream/main`. Diff: `git diff upstream/main...HEAD`

## PR description

Build a meaningful body from the diff. Use `git diff upstream/main...HEAD --name-status` to categorize:

**Structure:**

1. **Summary** — One short paragraph: total files changed, counts of added/deleted/modified. Call out notable additions or removals.
2. **New files** — List paths. Brief note per file or per group (e.g. "Add format/lint/setup skills for Go, JS, Python, Rust").
3. **Deleted files** — List paths. Add a note: "Review removals before merging."
4. **Modified** — List paths. One-line summary per file or per logical group (e.g. "README: add usage instructions, install section").

**Title:** One-line summary from changes (e.g. "Refactor to src/ layout, add install script").

## Notes

- To abort merge: `git merge --abort`
- Run from project root
- For PR within same repo (branch → main), use `gh-pr` instead (same PR body rules, diff base is `main`)
