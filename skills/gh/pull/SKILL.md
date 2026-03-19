---
name: gh-pull
description: >-
  Pull changes into the current branch from origin and merge the canonical root
  branch (`origin/main` or `upstream/main`); resolve conflicts by preserving root
  code while adapting branch-specific changes.
---

# Pull (and resolve merge conflicts)

**Responsibility:** Update the current branch by pulling from its tracking remote
and then merging the canonical root branch (`origin/main` or `upstream/main`).
If any merge produces conflicts, keep root/main intent and adapt branch-specific
logic so the result compiles and is consistent. Does **not** run tests/builds.
Does **not** create or update PRs (use **gh-pr**) or address PR review (use **gh-pr**).

**Conflict principle:** Do not change code that exists in root/main. Keep received
changes from root as-is. Adapt the branch’s code only where necessary so it
integrates cleanly, rather than removing or replacing root code.

## On invoke

Start immediately. Run commands one by one. Do not summarize. Fetch remotes and
merge first; if a merge hits conflicts, resolve them (keep root behavior, adapt
branch work), then continue.

## Workflow

### 1. Branch

`BRANCH=$(git branch --show-current)`; fail if detached (no branch name).

### 2. Fetch

`git fetch origin`.  
If upstream is configured: `git fetch upstream` (optionally confirm upstream
with `git remote -v`).

### 3. Pull current branch

If the branch has a tracking ref, merge it first:  
`git merge "@{u}"` (or `git pull --no-rebase "@{u}"`).  
If there is no tracking ref, skip this step and continue.
If conflicts occur, go to **Resolve conflicts**.

### 4. Pick canonical root branch

Use one of:
- `origin/main` (default)
- `upstream/main` (for forked repos where upstream is configured and used as source-of-truth)

Set:
- `ROOT_BRANCH=origin/main`
- if upstream main exists: `ROOT_BRANCH=upstream/main`

### 5. Merge canonical root

`git merge "$ROOT_BRANCH"`  
If conflicts occur, go to **Resolve conflicts**.

If you are currently on `main`, optionally add a fast-forward sanity check:
`git merge --ff-only "$ROOT_BRANCH"`.

### Resolve conflicts

When any merge leaves unmerged paths:

1. **Confirm merge in progress** — `git status` must show “You have unmerged paths” or list conflicted files.

2. **List conflicted files** — `git diff --name-only --diff-filter=U` (or `git status`). Work through each file.

3. **Resolve each conflict:**
   - **Keep root’s side:** In each conflict block, treat the incoming root version as source of truth. Keep it intact.
   - **Adapt branch code:** Where branch-added or updated logic is still needed, keep that logic but move or adjust it so it fits with root behavior (e.g. add imports, update call sites, place new code in the right spot). Do not delete or replace root’s changes to “win” the conflict.
   - **Remove conflict markers** (`<<<<<<<`, `=======`, `>>>>>>>`) and leave a single coherent version that preserves root and integrates the branch’s intent.

4. **Stage resolved files** — `git add <file>` for each resolved file.

5. **Complete merge** — When all conflicts are resolved: `git status` to confirm no unmerged paths, then `git commit` (no extra flags; use the default merge message unless the user asks otherwise).

Then continue from the step that triggered the conflict.

## Notes

- Run from project root.
- Use merge (not rebase). To abort a merge: `git merge --abort`.
- Prerequisites: git; optional `gh` for discovering and adding upstream.
- **Ours vs theirs:** During a merge *into* the current branch, “ours” = current branch, “theirs” = root/main. Prefer “theirs” for existing/root code; change “ours” only to integrate.
- To see root’s version of a conflicted file: `git show :3:path/to/file` (merge stages: 1 = base, 2 = ours = current branch, 3 = theirs = root). Verify with `git ls-files -u`.
- If resolution is ambiguous (e.g. both sides rewrote the same logic), keep root behavior and reimplement the branch’s intent in new code only.
- **No tests/builds:** This skill only pulls, merges, and resolves conflicts; use **gh-pr** or **gh-push** for CI/test flows.
