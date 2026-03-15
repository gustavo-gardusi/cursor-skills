---
name: gh-pull-upstream
description: >-
  Pull from upstream, merge into current branch, push. Use when user wants to
  sync with upstream, pull upstream, update from original repo, or bring fork
  up to date.
---

# Pull upstream

Fetch upstream, merge `upstream/main` into current branch, resolve conflicts, push to origin.

## On invoke

Start immediately. Run commands one by one with Shell tool.

## Workflow

1. `git remote get-url upstream` — if fails, add from fork: `PARENT=$(gh repo view --json parent -q '.parent.owner.login + "/" + .parent.name') && git remote add upstream "https://github.com/$PARENT.git"`
2. `BRANCH=$(git branch --show-current)`
3. `git fetch upstream`
4. `git merge upstream/main` — resolve conflicts if any
5. `git push origin $BRANCH`

## Notes

- To abort merge: `git merge --abort`
- Run from project root
