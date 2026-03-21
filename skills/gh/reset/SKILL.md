---
name: gh-reset
description: >-
  Leaf skill: stash local changes (including untracked), hard-reset to a
  canonical ref, clean; optional prune of older stashes. Does not call other gh skills.
---

# Reset (stash → hard reset → clean)

**Cursor skill:** **`@gh-reset`** — Invoked with **`@gh-reset`** in Cursor. **Leaf:** this skill **does not** hand off to **`@gh-pull`**, **`@gh-push`**, or any other **`gh-*`** skill—it only runs git commands. Orchestrators such as **`@gh-main`** **invoke** **`@gh-reset`**; that does not make **`@gh-reset`** a “root” in the dependency tree.

**Responsibility:** (1) **Preserve** uncommitted work by **stashing** when the tree is dirty (including untracked with **`git stash push -u`**). (2) **Hard-reset** to a resolved remote/tracked ref and **`git clean`**. (3) **Optionally** drop **older** stash entries when the user asks for housekeeping.

**Not for:** merging **`main`** or publishing—use **`@gh-pull`**, **`@gh-main`**, **`@gh-push`**.

## On invoke

*`@gh-reset`* — Run steps in order. Always say that after a stash, work lives in **`git stash`** until popped or dropped.

## Workflow

### 1. Validate location

*`@gh-reset`*

`git rev-parse --is-inside-work-tree`.

### 2. Capture current branch

*`@gh-reset`*

`BRANCH=$(git branch --show-current)`.

If detached, stop and ask the user to check out a branch first.

### 3. Fetch all remotes

*`@gh-reset`*

`git fetch --all --prune`.

### 4. Resolve target reference

*`@gh-reset`*

In priority order:

1. If branch has upstream tracking: `@{u}`.
2. If on `main` and upstream exists: `upstream/main` when it exists.
3. Otherwise: `origin/$BRANCH`.
4. Fallback root: `origin/main` (or `upstream/main` if the former is unavailable).

`TARGET=<resolved_ref>`

### 5. Stash local changes (when the tree is not clean)

*`@gh-reset`* — **Default:** save work before reset.

If `git status --short` is non-empty:

- **`git stash push -u -m "gh-reset: $BRANCH before reset to $TARGET"`** (or a similar one-line message).
- If the user **explicitly** asks to **discard** without stashing, require a **clear confirmation** (“discard uncommitted work with no stash”), then skip stash and go to §6.

If already clean, skip to §6.

### 6. Confirm hard reset and clean

*`@gh-reset`*

Briefly confirm: will **`git reset --hard "$TARGET"`** and **`git clean`**. Mention the stash ref from §5 if a stash was created.

### 7. Reset and clean

*`@gh-reset`*

- `git reset --hard "$TARGET"`
- `git clean -fdx` (or **`git clean -fd`** if the user or project policy must keep ignored files)

### 8. Optional — prune older stashes

*`@gh-reset`* — Only when the **user asks** to clean up stash history (e.g. “drop old stashes”, “keep only the last N”).

- Show **`git stash list`**.
- **Safe default:** drop **one** named entry with **`git stash drop stash@{n}`** when the user names it, or drop **all but the last N** stashes only after **explicit confirmation** (list which `stash@{…}` entries will be removed).
- **`git stash clear`** — only with **explicit** user confirmation (removes every stash).

Do **not** prune stashes silently.

### 9. Final verification

*`@gh-reset`*

`git status --short` is clean.  
`git log -1 --oneline` matches **`$TARGET`**.

## Notes

*`@gh-reset`*
- Recover work: **`git stash list`**, **`git stash pop`** or **`git stash apply`**.
- Do not use if a merge/rebase is in progress unless resolved first.
- For **checkout `main` + reset + merge** (local only), use **`@gh-main`** — it runs **`@gh-reset`** → **`@gh-pull`**. To **publish** **`main`**, run **`@gh-push`** after **`@gh-main`**. A **solo** **`@gh-reset`** only aligns the **current** branch to **`$TARGET`** (leaf operation).
