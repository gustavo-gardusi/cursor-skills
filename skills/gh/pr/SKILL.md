---
name: gh-pr
description: >-
  Run gh-push first (check, docs, commit, push), then resolve open PR by head,
  diff vs base, write title/body from diff, edit or create. No merge.
---

# PR

**Cursor skill:** **`@gh-pr`** — Invoked with **`@gh-pr`** in Cursor. **Depends on [`@gh-push`](../push/SKILL.md):** always run the **full** **`@gh-push`** skill **first** so the branch is verified, documented, committed if needed, and **published**—then do PR metadata via `gh`. **`@gh-pr`** does **not** merge or run **`@gh-pull`**; for syncing **`main`** into the branch before push, use **`@gh-pull`** in a **separate** invocation **before** **`@gh-pr`** ( **`@gh-push`** still runs at the start of **`@gh-pr`** after you return to the branch).

**Sole purpose:** (1) **`@gh-push`** end-to-end. (2) **Resolve** an open PR for this head/base if one exists (**list + API fallback**). (3) **Fetch** the real base ref, **diff** `base...HEAD`, write **title and body** from that evidence. (4) **`gh pr edit`** or **`gh pr create`**—never create to “discover” duplicates. Strong body (emoji sections, nested bullets, optional Impact/Review).

**Target:** Same repo → base `main`, head = current branch. Fork → base `upstream/main`, head = `FORK_OWNER:$BRANCH` where `FORK_OWNER` is the owner from `origin`. On `main` with no upstream → there is no PR to create for “main → main”; still run **`@gh-push`** first, then **stop** (no PR step).

## On invoke

*`@gh-pr`* — Start with **`@gh-push`**. Then run the rest one by one. **Never** open a PR by running `gh pr create` first and relying on an error if one already exists. **Always** resolve **open** PR number (if any) **before** writing title/body, then **either** `gh pr edit` **or** `gh pr create`—never both.

**Order:** (0) **`@gh-push`** (full). (1) fork vs same-repo + remotes, (2) branch + head ref, (3) **existing PR lookup** (with API fallback if list is empty), (4) **fetch** base ref, (5) **diff + commits** vs base → title/body, (6) **edit** or **create** PR—or **stop** after push if same-repo `main` (no PR).

## Workflow

### 0. Hand off to **`@gh-push`** (required before PR steps)

> **Run the full Cursor skill [`@gh-push`](../push/SKILL.md)** — not a shortcut.  
> Execute **every** step: **`@gh-check`** → docs → commit if needed → publish. This is how **`@gh-pr`** ensures **no uncommitted work** is left out of the PR and the **remote head** matches local for `gh pr create` / `gh pr edit`.  
> If **`@gh-push`** fails (checks, push denied), **stop** **`@gh-pr`**; do not create or edit a PR until push succeeds or the user fixes the issue.

1. **Fork vs same-repo** — *`@gh-pr`* — Run `git remote get-url upstream` (exit code 0 → upstream exists). If **upstream exists**: **fork**; set **UPSTREAM** = `owner/repo` from upstream URL, **FORK_OWNER** from `origin`. **Git base ref** for diffs = `upstream/main`. If **no upstream**: same-repo; **git base ref** = `main` (or `origin/main` after fetch if local `main` is stale). If fork intent but `upstream` missing, stop: `git remote add upstream https://github.com/ORIGINAL_OWNER/REPO.git`.

2. **Branch & head ref** — *`@gh-pr`* — `BRANCH=$(git branch --show-current)`. If `BRANCH` is `main` and same-repo (no upstream): **stop** after step 0—no PR for “main → main”. If **fork**: PR **head** = `$FORK_OWNER:$BRANCH`. If **same-repo** (feature branch): PR **head** = `$BRANCH`.

3. **Resolve existing open PR (before any create)** — *`@gh-pr`* — Set `PR_NUM` empty, then:

   - **Same repo:** `gh pr list --head "$BRANCH" --base main --state open --json number --jq '.[0].number // empty'`
   - **Fork:** `gh pr list --repo "$UPSTREAM" --head "$FORK_OWNER:$BRANCH" --base main --state open --json number --jq '.[0].number // empty'`

   **Fallback** if list is empty: **GET** `repos/.../pulls?head=...&state=open&per_page=5` — **fork:** `gh api "repos/$UPSTREAM/pulls?head=$FORK_OWNER:$BRANCH&state=open&per_page=5" --jq '.[0].number // empty'`; **same-repo:** `gh repo view --json nameWithOwner -q .nameWithOwner` → `gh api "repos/OWNER/REPO/pulls?head=OWNER:$BRANCH&state=open&per_page=5" --jq '.[0].number // empty'`.

   If the result is a number, set **`PR_NUM`**. If still empty, no open PR for this head/base.

4. **Fetch base and diff** — *`@gh-pr`* — **Fork** → `git fetch upstream main`. **Same-repo** → `git fetch origin main` if needed. **`BASE_GIT`** = e.g. `upstream/main` or `main`. Run:

   - `git diff "$BASE_GIT"...HEAD --name-status`
   - `git log "$BASE_GIT"..HEAD --oneline` (themes only; not the title alone)

   Group `--name-status` by **Added** / **Modified** / **Deleted**. Source of truth for title/body.

5. **Write title and body** — *`@gh-pr`* — Follow **[PR description](#pr-description)**. **Title** = plain line from the **diff** (no “Align fork” fluff—see below).

6. **Apply: edit or create (exactly one)** — *`@gh-pr`* —

   - **If `PR_NUM` is set:** `gh pr edit "$PR_NUM"` with `--title` and `--body` / `--body-file` (**fork:** `--repo "$UPSTREAM"`).

   - **If `PR_NUM` is empty:** `gh pr create` with same title/body, `--base main`, **`--head`** per step 2 (**fork:** `--repo "$UPSTREAM"` + `"$FORK_OWNER:$BRANCH"`).

   Do not run `create` when `PR_NUM` is set.

---

## PR description

*`@gh-pr`* — **`--title`** and **`--body`** for `gh pr edit` / `gh pr create` only.

Use the diff and short log from **workflow step 4** (`$BASE_GIT...HEAD`, `--name-status`). Write a **strong body**: emoji for section headers, **bullet points with nested lists** in Summary, **bold** for important points. **Omit optional sections** when they add no value (see below). Focus on **behavior and tree changes** reviewers must see—not fork meta-narrative in the title.

### Title (plain text; must reflect the diff)

- **Good:** concrete outcomes from paths/commits—e.g. “Add gh-check skill; decouple gh-main from gh-push”, “Replace src/code skills with skills/context and skills/gh”.
- **Bad:** “Align fork main”, “Sync fork”, “Update fork”, “Bring main in line with upstream” unless the **only** change is a literal merge with nothing else to say.

### Structure (order)

1. **✨ Summary** — **Bullet points with nested lists**. **Bold** main outcomes. Repo-specific callouts (breaking changes, config, removals).
2. **📊 Impact** — *Optional.* Omit when no meaningful runtime impact.
3. **🔍 Review** — *Optional.* Memory/CPU only when significant; omit filler.
4. **📁 Changes** — Brief Added / Modified / Deleted by directory. End Deleted with: ⚠️ *Review removals before merging.*

**Title** is only the **`--title`** argument, not the markdown body.

### Format notes

- Prefer **“what changed in the code”** over **“this PR syncs my fork.”**
- **Emoji** in **body** only; **`--title`** plain.
- **Impact / Review:** only when they add real information.

---

## Notes

*`@gh-pr`*
- Run from project root. Prerequisites: `gh` CLI, `gh auth status`.
- **Fork:** `upstream` remote required for correct base repo.
- **`@gh-push`** (step 0) is **mandatory** for this skill—do not skip to PR metadata. For **sync with `main`** before pushing, run **`@gh-pull`** (or merge) **before** **`@gh-pr`** so step 0 pushes the merged result.
- **Bare `git push` / `git commit`:** only inside **`@gh-push`**, not in PR-only shortcuts.

### Hand off (outside **`@gh-pr`**)

> To **merge `main` into your branch** before **`@gh-pr`**, run **[`@gh-pull`](../pull/SKILL.md)** in a separate invocation, then **`@gh-pr`** (which runs **`@gh-push`** again). **`@gh-pr`** does not replace **`@gh-pull`**.
