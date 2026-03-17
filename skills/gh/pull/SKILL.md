---
name: gh-pull
description: >-
  Pull changes into the current branch from origin and optionally from a parent
  branch (main or upstream/main); resolve any merge conflicts by preserving
  main's code and adapting the branch's new code. Use when syncing with remote,
  updating from main/upstream, or after a merge left conflicts.
---

# Pull (and resolve merge conflicts)

**Responsibility:** Update the current branch by pulling from origin and, when relevant, merging from a parent branch (main or upstream/main). If any merge produces conflicts, resolve them by preserving main’s version and adapting the branch’s new code so the result compiles and is consistent. Does **not** run tests/builds. Does **not** create or update PRs (use **gh-pr**) or address PR review (use **gh-pr-review**).

**Conflict principle:** Do not change code that exists in main. Keep received changes (from main) as-is. Prefer modifying the branch’s new code so it integrates with main, rather than overwriting or removing main’s code.

## On invoke

Start immediately. Run commands one by one. Do not summarize. First do fetch and merge; if a merge hits conflicts, resolve them (preserve main, adapt branch), then continue.

## Workflow

### 1. Branch

`BRANCH=$(git branch --show-current)`.

### 2. Fetch

`git fetch origin`. If upstream is configured: `git fetch upstream` (if missing, optionally add it via `gh repo view --json parent -q '.parent.owner.login + "/" + .parent.name'` and `git remote add upstream ...`).

### 3. Pull current branch

Merge from origin: `git merge origin/$BRANCH` (or `git pull origin $BRANCH`). If the branch has no remote tracking branch yet, skip. If conflicts occur, go to **Resolve conflicts** below, then continue to step 4.

### 4. Merge parent (main)

If `$BRANCH` is not `main`: `git merge origin/main`. If conflicts occur, go to **Resolve conflicts** below, then continue to step 5.

### 5. Merge parent (upstream)

If upstream exists: `git merge upstream/main`. If conflicts occur, go to **Resolve conflicts** below.

### Resolve conflicts

When any merge leaves unmerged paths:

1. **Confirm merge in progress** — `git status` must show “You have unmerged paths” or list conflicted files.

2. **List conflicted files** — `git diff --name-only --diff-filter=U` (or `git status`). Work through each file.

3. **Resolve each conflict:**
   - **Prefer main’s side:** In each conflict block, treat the incoming (main) version as the source of truth. Keep it intact.
   - **Adapt branch code:** Where the branch added or changed code, keep that logic but move or adjust it so it fits with main’s version (e.g. add imports, update call sites, place new code in the right spot). Do not delete or replace main’s changes to “win” the conflict.
   - **Remove conflict markers** (`<<<<<<<`, `=======`, `>>>>>>>`) and leave a single, coherent version that preserves main and integrates the branch’s additions.

4. **Stage resolved files** — `git add <file>` for each resolved file.

5. **Complete merge** — When all conflicts are resolved: `git status` to confirm no unmerged paths, then `git commit` (no extra flags; use the default merge message unless the user asks otherwise).

Then continue from the step that triggered the conflict (e.g. after merging main, continue to step 5; after merging upstream, you’re done).

## Notes

- Run from project root.
- Use merge (not rebase). To abort a merge: `git merge --abort`.
- Prerequisites: git; optional `gh` for discovering and adding upstream.
- **Ours vs theirs:** During a merge *into* the current branch, “ours” = current branch, “theirs” = main. Prefer “theirs” for existing/main code; change “ours” to integrate.
- To see main’s version of a conflicted file: `git show :3:path/to/file` (merge stages: 1 = base, 2 = ours = current branch, 3 = theirs = main). Verify with `git ls-files -u`.
- If resolution is ambiguous (e.g. both sides rewrote the same logic), keep main’s behavior and reimplement the branch’s intent in the new code only.
- **No tests/builds:** This skill only pulls, merges, and resolves conflicts; use **gh-pr** or **gh-pr-review** for CI/test flows.
