---
name: gh-pull
description: >-
  Merge latest remote + canonical main into the current branch; resolve conflicts
  by accepting upstream and adapting branch work toward the branch goal. Does not push.
---

# Pull (merge + resolve conflicts)

**Cursor skill:** **`@gh-pull`** — Invoked with **`@gh-pull`** in Cursor. Merge and conflict resolution are **`@gh-pull`** only. **Does not** run **`@gh-push`**, **`@gh-check`**, or `git push`—publish and verify with **`@gh-push`** (or **`@gh-check`** alone) in a **separate** invocation when ready.

**Where it runs:** The **current workspace’s** git checkout—any project, not a specific upstream product name.

**Responsibility:** Update the **current branch** by merging its **tracking branch** (if any) and the **canonical root** (`origin/main` or `upstream/main`). **Resolve conflicts** with minimal churn: **prefer incoming (main/root)** and **adapt branch-specific work** so the **branch’s goal** still holds. When merges are committed, **stop**—do not publish here.

**Integration flow:** §**2** updates **`origin`** (and **`upstream`** when configured). §§**3–5** merge the tracking branch (if any) and canonical **`main`**. Any skill that needs an up-to-date branch relative to **`main`** runs **`@gh-pull`** in full, then continues with its own steps.

Does **not** create or update PRs (use **`@gh-pr`**).

**Conflict principle (short):**
- **Never blindly checkout sides** — Read conflict markers manually (e.g. `<<<<<<<`), especially in manifests like `package.json`, `Cargo.toml`, or `.gitignore`, where both sides' additions often need to be preserved together. Avoid scripts like `git checkout --theirs` which silently wipe out branch additions.
- **Accept what main brought** — Take the incoming side for shared files and upstream behavior unless a small, local tweak is required for the branch to compile or meet its goal.
- **Avoid large rewrites of “main” code** — Do not replace big upstream blocks with older branch versions to “win” the merge. Reconcile by keeping upstream structure and adjusting **branch additions** (new code, feature modules, tests) to fit.
- **Branch goal** — After merging, the feature or fix this branch exists for should still be achievable; adapt call sites, imports, and branch-only logic—not revert upstream refactors wholesale.

## On invoke

*`@gh-pull`* — Start immediately. Run commands one by one. Fetch and merge; on conflicts, resolve using the principle above; when merges are complete, finish at **§6**.

## Workflow

### 1. Branch

*`@gh-pull`*

`BRANCH=$(git branch --show-current)`; fail if detached (no branch name).

### 2. Fetch (required before merges)

*`@gh-pull`*

Run **before** §3–5 so **`origin/main`**, **`upstream/main`**, and tracking refs match the remotes.

- **`git fetch origin`**
- If **`upstream`** is configured: **`git fetch upstream`** (full fetch preferred; minimum **`git fetch upstream main`** if bandwidth-constrained).

Optionally confirm remotes with **`git remote -v`** when debugging.

### 3. Pull current branch

*`@gh-pull`*

If the branch has a tracking ref, merge it first:  
`git merge "@{u}"` (or `git pull --no-rebase "@{u}"`).  
If there is no tracking ref, skip this step and continue.  
If conflicts occur, go to **Resolve conflicts**.

### 4. Pick canonical root branch

*`@gh-pull`*

Use one of:
- `origin/main` (default)
- `upstream/main` (forks where upstream is source of truth)

Set `ROOT_BRANCH` accordingly (prefer `upstream/main` when upstream exists and is the canonical main).

### 5. Merge canonical root

*`@gh-pull`*

`git merge "$ROOT_BRANCH"`  
If conflicts occur, go to **Resolve conflicts**.

If you are currently on `main`, prefer fast-forward when possible:  
`git merge --ff-only "$ROOT_BRANCH"` if it applies; if not, merge and resolve.

### Resolve conflicts

*`@gh-pull`* — Conflict resolution is part of **`@gh-pull`** (not **`@gh-push`**).

When any merge leaves unmerged paths:

1. **Confirm merge in progress** — `git status` shows unmerged paths.

2. **List conflicted files** — `git diff --name-only --diff-filter=U` (or `git status`).

3. **Resolve each conflict** (merge *into* current branch: **ours** = current branch, **theirs** = the ref being merged, e.g. root/main):
   - **Read the files first** to see the conflict markers (`<<<<<<<`, `=======`, `>>>>>>>`). **Never** blindly run `git checkout --theirs` or `git checkout --ours` across all files, especially for manifests (`package.json`, `.gitignore`, `Cargo.toml`), as you will silently overwrite your branch's new dependencies or configuration additions.
   - **Default to incoming (theirs)** for overlapping regions in files that **main/root** owns (shared modules, config patterns, APIs updated upstream). Prefer their version, then fix **branch-only** breakages (imports, types, tests) in the smallest follow-up edits.
   - **Adapt branch code** — For files that are mostly **branch work**, keep branch intent but align with new upstream APIs and file layout (move code, update signatures) rather than restoring pre-merge branch snapshots of upstream files.
   - **Remove conflict markers** and leave one coherent result. **Do not** mass-reformat or restyle upstream code to match the branch; keep upstream formatting when you kept their side.

4. **Stage** — `git add <file>` for each resolved file.

5. **Complete merge** — `git status` has no unmerged paths; `git commit` (default merge message unless the user specifies otherwise).

Then continue from the step that triggered the conflict.

### 6. Done (no **`@gh-push`**)

*`@gh-pull`* — Merges are complete and committed.

- Report branch name and that the tree reflects merged **`main`** (or root).
- **Do not** run **`@gh-push`**, **`@gh-check`**, or `git push` in this skill.
- **Next steps (outside `@gh-pull`):** **`@gh-check`** — verify install / lint / test / build. **`@gh-push`** — align docs, commit if needed, publish (**`@gh-check`** is §1 inside **`@gh-push`**). **`@gh-pr`** — **`@gh-pull`**, then **`@gh-push`**, then PR title/body.

## Notes

*`@gh-pull`*
- Run from project root. Use **merge** (not rebase). Abort: `git merge --abort`.
- **Stages:** For conflict inspection, `git ls-files -u`. Incoming from merged branch is often **stage 3** (`git show :3:path`) when merging `ROOT_BRANCH` into HEAD—verify per conflict.
- To reset **local `main`** to the **canonical remote tip** (**`upstream/main`** if **`upstream`** exists, else **`origin/main`**), use **`@gh-main`** (single fetch, **`reset --hard`**, **`git clean`**) instead of **`@gh-pull`** alone. To **publish** **`main`**, run **`@gh-push`** after **`@gh-main`**.
