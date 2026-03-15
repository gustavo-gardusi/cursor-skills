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
4. **PR** — `FORK_OWNER` and `UPSTREAM` from gh, `gh pr list --repo $UPSTREAM --head $FORK_OWNER:$BRANCH`. If none: `gh pr create --repo $UPSTREAM --base main --head $FORK_OWNER:$BRANCH --title "..." --body "..."`

Build title/body from `git diff upstream/main...HEAD --stat`.

## Notes

- To abort merge: `git merge --abort`
- Run from project root
