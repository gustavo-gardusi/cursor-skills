---
name: sync-main
description: >-
  Sync the current branch with main using merge. Use when the user wants to
  merge main into their branch, sync with main, update from main, or resolve
  being behind main.
---

# Sync branch with main

Sync the current branch with `main` using merge. Resolve merge conflicts if any.

## Steps

1. **Save current branch** – `BRANCH=$(git branch --show-current)`
2. **Fetch latest** – `git fetch origin`
3. **Update main** – `git checkout main && git pull origin main`
4. **Return to branch** – `git checkout $BRANCH`
5. **Merge main** – `git merge main`
6. **If conflicts** – List conflicted files with `git status`, then resolve each:
   - Open each conflicted file
   - Find `<<<<<<<`, `=======`, `>>>>>>>` markers
   - Edit to keep the correct code, remove markers
   - `git add <file>` after each resolution
7. **Complete merge** – If conflicts were resolved: `git add . && git commit -m "Merge main into $BRANCH"`
8. **If merge already complete** – No further action

## Notes

- Use merge (not rebase) to keep history straightforward.
- If the user wants to abort: `git merge --abort`
- Run from the project root.
