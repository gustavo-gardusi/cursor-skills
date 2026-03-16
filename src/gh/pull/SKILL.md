---
name: gh-pull
description: >-
  Pull current branch, then merge main and/or upstream as needed. Use when
  syncing with origin, updating from main, or bringing fork up to date with
  upstream.
---

# Pull

Update current branch from origin, then merge `main` and/or `upstream/main` if applicable. Push after merges.

## On invoke

Start immediately. Run commands one by one. Do not summarize.

## Workflow

1. **Branch** — `BRANCH=$(git branch --show-current)`.

2. **Pull current branch** — `git fetch origin`, then `git merge origin/$BRANCH` (or `git pull origin $BRANCH`). Updates current branch from origin. If branch has no remote yet, skip the merge. Resolve conflicts if any.

3. **Merge main** — If `$BRANCH` is not `main`: `git merge origin/main`. Resolve conflicts. (If on main, skip.)

4. **Merge upstream** — If upstream remote exists: `git remote get-url upstream`. If missing, try `gh repo view --json parent -q '.parent.owner.login + "/" + .parent.name'` and add upstream; if no parent, skip. If upstream exists: `git fetch upstream`, `git merge upstream/main`. Resolve conflicts.

5. **Push** — If any merge was done (steps 3 or 4): `git push origin $BRANCH`.

## Notes

- Use merge (not rebase). To abort: `git merge --abort`
- Run from project root
