---
name: gh-pull-main
description: >-
  Merge main into current branch. Use when user wants to pull main, sync with
  main, update from main, merge main, or resolve being behind main.
---

# Pull main

Merge `main` into the current branch. Fetch, update main, merge, resolve conflicts if any.

## Steps

1. `BRANCH=$(git branch --show-current)`
2. `git fetch origin`
3. `git checkout main && git pull origin main`
4. `git checkout $BRANCH`
5. `git merge main`
6. **If conflicts** – Resolve each, then `git add . && git commit -m "Merge main into $BRANCH"`
7. **If no conflicts** – Done

## Notes

- Use merge (not rebase). To abort: `git merge --abort`
- Run from project root
