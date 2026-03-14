---
name: sync-upstream
description: >-
  Sync the current branch with upstream main. Fetches upstream, merges into
  current branch, resolves conflicts, then pushes. Use when the user wants to
  sync with upstream, pull from upstream, update from the original repo, or
  bring a fork up to date.
---

# Sync with upstream

Sync the current branch with upstream `main`. Fetch upstream, merge into current branch, resolve conflicts, then push to origin. Reverse of craft-pr-upstream (no PR creation).

## On invoke

**Start immediately.** When this skill is applied, run the first command right away. Use the Shell tool to run each command one by one until done or you must stop. Run one command, observe the result, then run the next.

## Prerequisites

| Check | Command |
|-------|---------|
| Git repo | `git rev-parse --git-dir 2>/dev/null` |
| Upstream remote | `git remote get-url upstream` (or add from fork parent) |

**First command to run:** `git remote get-url upstream`

If that fails, try adding upstream from fork parent:

```bash
PARENT=$(gh repo view --json parent -q '.parent.owner.login + "/" + .parent.name' 2>/dev/null)
[ -n "$PARENT" ] && git remote add upstream "https://github.com/$PARENT.git" 2>/dev/null || true
```

If upstream still missing (not a fork or gh unavailable), stop.

## Workflow

Run each step in sequence. After each command, run the next.

### 1. Ensure upstream remote

Run `git remote get-url upstream`. If it fails, run the add command above. Verify with `git remote -v`.

### 2. Merge upstream main and resolve conflicts

Run in order:
1. `BRANCH=$(git branch --show-current)`
2. `git fetch upstream`
3. `git merge upstream/main`
4. **If conflicts** – Resolve each:
   - Run `git status` to list conflicted files
   - Edit each file to resolve conflicts (remove `<<<<<<<`, `=======`, `>>>>>>>`)
   - Run `git add <file>` then `git commit -m "Merge upstream/main into $BRANCH"`
5. **If no conflicts** – Merge completes automatically (or already up to date)

### 3. Push to origin

Run: `git push origin $BRANCH`

## Notes

- Uses merge (not rebase) to keep history clear.
- To abort merge: `git merge --abort`
- Run from project root.
