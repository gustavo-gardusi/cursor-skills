---
name: gh-pr
description: >-
  Create or update the PR from the current branch to main or upstream. Check if
  one exists, summarize changes vs base, write a strong description, then
  create or edit. No add/commit/push, no sync, no build.
---

# PR

**Cursor skill:** **`@gh-pr`** — Invoked with **`@gh-pr`** in Cursor. This skill only creates/edits the **PR metadata** via `gh`; it does **not** run **`@gh-pull`**, **`@gh-push`**, or merge. If the branch is not published yet, **Hand off** to **`@gh-push`** (or **`@gh-pull`** first) in a **separate** user invocation.

**Sole purpose:** Create or update the pull request from the current branch to **main** (same repo) or **upstream** (fork). Check whether a PR already exists; summarize changes vs the base branch; write a strong description (emoji, tables, nested path lists, bold, memory/CPU); then create or update the PR. Does not add, commit, merge, or publish—use **`@gh-pull`** / **`@gh-push`** in other invocations when the branch needs sync or remote updates.

**Target:** Same repo → base `main`, head = current branch. Fork → base `upstream/main`, head = `FORK_OWNER:$BRANCH` where `FORK_OWNER` is the owner from `origin`. On main with no upstream → there is no PR to create; stop.

## On invoke

*`@gh-pr`* — Start immediately. Run commands one by one. Do not summarize. **First** determine fork vs same-repo and that upstream exists when it’s a fork; then (2) whether a PR exists, (3) diff vs base, (4) description quality, (5) create or update the PR.

## Workflow

1. **Fork vs same-repo (do this first)** — *`@gh-pr`* — Run `git remote get-url upstream` (exit code 0 → upstream exists). If **upstream exists**: this repo is a **fork**; the PR targets the upstream repo. Set **base** = `upstream/main`, **UPSTREAM** = owner/repo from upstream URL (e.g. `https://github.com/gardusig/cursor-skills.git` → `gardusig/cursor-skills`), **FORK_OWNER** = owner from `git remote get-url origin` (e.g. `gustavo-gardusi`). If **upstream does not exist**: same-repo mode; **base** = `main`; no UPSTREAM or FORK_OWNER. **When the repo is a fork, upstream must be configured** — if the user intends to open a PR to the original repo but `upstream` is missing, stop and tell them to add it: `git remote add upstream https://github.com/ORIGINAL_OWNER/REPO.git`.

2. **Branch & base** — *`@gh-pr`* — `BRANCH=$(git branch --show-current)`. If `BRANCH` is `main` and same-repo (no upstream): there is no PR to create for “main → main”; stop. If fork: **head** = `$FORK_OWNER:$BRANCH` (or `$FORK_OWNER:main` when on main). If same-repo: **head** = `$BRANCH`.

3. **Check existing PR** — *`@gh-pr`* — **Same repo:** `gh pr list --head $BRANCH --base main`. **Fork:** `gh pr list --repo $UPSTREAM --base main --head $FORK_OWNER:$BRANCH` (or `$FORK_OWNER:main` when on main). Determine if a PR already exists; note its number (and URL if useful).

4. **Summarize changes vs base** — *`@gh-pr`* — Run `git diff base...HEAD --name-status`. Group output by **Added**, **Modified**, **Deleted**. Use this to build the PR description (see below).

5. **Create or update PR** — *`@gh-pr`* — If a PR exists: `gh pr edit <number>` (same repo) or `gh pr edit <number> --repo $UPSTREAM` (fork) with `--title "..."` and `--body "..."`. If not: `gh pr create` with `--base main --head "$BRANCH"` (same repo) or `--repo $UPSTREAM --base main --head "$FORK_OWNER:$BRANCH"` (or `$FORK_OWNER:main` on main). Use the description format below for the body. Title: one line, no emojis.

---

## PR description

*`@gh-pr`* — Body/title for the PR only.

Use the diff from workflow step 4 (`base...HEAD`, `--name-status`). Write a **strong description**: emoji for section headers, **bullet points with nested lists** in Summary, **bold** for important points. **Omit optional sections** when they add no value (see below). Focus on **what's unique to this repo or change** — things reviewers should notice or do (breaking changes, config, migration, removals, deployment).

### Structure (order)

1. **✨ Summary** — **Bullet points with nested lists** (not a single paragraph). Top-level bullets for main points; nest sub-points or details underneath. **Bold** the main goal or outcome. Call out anything **repo-specific** that matters (e.g. "Skills now live under \`skills/\`; sync command changed," "New env var \`X\` required").
   - **Main outcome** — one line
     - Detail or scope
     - Another detail
   - What else changed
     - Sub-point

2. **📊 Impact** — *Optional.* Short table for major metrics (**Memory**, **CPU**, **Latency**). Columns e.g. Area | Change | Note. **Omit this section entirely** when there is no meaningful runtime or performance impact (e.g. docs-only, tooling-only, config-only PRs).

3. **🔍 Review** — *Optional.* **Affirmations about memory and CPU**: **improved**, **worse**, or **unchanged** in short bullets (e.g. **Memory: Lower** — fewer allocations; **CPU: Worse** — new validation on hot path). **Omit this section entirely** when there is no significant memory/CPU change; do not add a filler line like "No significant change."

4. **📁 Changes** — Keep **quite low**: brief nested path list by directory (Added / Modified / Deleted). One level of nesting is enough; avoid long file lists. End Deleted with: ⚠️ *Review removals before merging.*

5. **Title** — One line, no emojis (plain text).

### Format notes

- **Summary:** Prefer bullets + nested lists; highlight **unique or important** aspects for this repo (breaking changes, migration, config, deployment).
- **Changes:** Short and last; don't let the file list dominate.
- **Bold:** Important terms (**Breaking change**, **Performance**, **Memory**, **CPU**, config names, etc.).
- **Emoji:** Section headers (✨ 📊 🔍 📁); keep title plain.
- **Impact / Review:** Include only when they add real information. Omit both for docs, tooling, or non-runtime changes.

---

## Notes

*`@gh-pr`*
- Run from project root.
- Prerequisites: `gh` CLI, `gh auth status`.
- **Fork detection first:** If this repo is a fork, it **must** have an `upstream` remote pointing at the original repo. Without it, the skill cannot target the right repo. Add with: `git remote add upstream https://github.com/ORIGINAL_OWNER/REPO.git`.
- **Branch must be published** for the PR to exist or to update the correct branch. Run **`@gh-pull`** after merging main, or **`@gh-push`** for feature commits and publish—do not use bare `git push` outside **`@gh-push`**.

### Hand off (not part of `@gh-pr`)

> **`@gh-pr`** does not merge or push. To sync with **`main`** and publish, run **[`@gh-pull`](../pull/SKILL.md)** or **[`@gh-push`](../push/SKILL.md)** in separate invocations. For PR **content** only, stay in **`@gh-pr`**.
