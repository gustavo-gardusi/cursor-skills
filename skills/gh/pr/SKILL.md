---
name: gh-pr
description: >-
  Create or update the PR from the current branch to main or upstream. Check if
  one exists, summarize changes vs base, write a strong description, then
  create or edit. No add/commit/push, no sync, no build.
---

# PR

**Sole purpose:** Create or update the pull request from the current branch to **main** (same repo) or **upstream** (fork). Check whether a PR already exists; summarize changes vs the base branch; write a strong description (emoji, tables, nested path lists, bold, memory/CPU); then create or update the PR. Does not add, commit, or push; does not sync or build—do those separately or with **gh-pull** / **gh-pr-review**.

**Target:** Same repo → base `main`, head = current branch. Fork → base `upstream/main`, head = `FORK_OWNER:main` or `FORK_OWNER:$BRANCH`. On main with no upstream → there is no PR to create; stop.

## On invoke

Start immediately. Run commands one by one. Do not summarize. Focus only on: (1) whether a PR exists, (2) diff vs base, (3) description quality, (4) create or update the PR.

## Workflow

1. **Branch & base** — `BRANCH=$(git branch --show-current)`. If `BRANCH` is `main` and there is no upstream remote: there is no PR to create for “main → main”; stop. Otherwise set **base** = `upstream/main` if `git remote get-url upstream` exists, else **base** = `main`. For a fork, parse **UPSTREAM** (owner/repo) and **FORK_OWNER** (origin owner).

2. **Check existing PR** — **Same repo:** `gh pr list --head $BRANCH --base main`. **Fork:** `gh pr list --repo $UPSTREAM --head $FORK_OWNER:$BRANCH` (or `$FORK_OWNER:main` when on main). Determine if a PR already exists; note its number (and URL if useful).

3. **Summarize changes vs base** — Run `git diff base...HEAD --name-status`. Group output by **Added**, **Modified**, **Deleted**. Use this to build the PR description (see below).

4. **Create or update PR** — If a PR exists: `gh pr edit <number>` (same repo) or `gh pr edit <number> --repo $UPSTREAM` (fork) with `--title "..."` and `--body "..."`. If not: `gh pr create --base main --head $BRANCH` (same repo) or `gh pr create --repo $UPSTREAM --base main --head $FORK_OWNER:$BRANCH` (or `$FORK_OWNER:main` on main) with `--title "..."` and `--body "..."`. Use the description format below for the body. Title: one line, no emojis.

---

## PR description

Use the diff from step 3 (`base...HEAD`, `--name-status`). Write a **strong description**: emoji for section headers, **bullet points with nested lists** in Summary, **bold** for important points. **Omit optional sections** when they add no value (see below). Focus on **what's unique to this repo or change** — things reviewers should notice or do (breaking changes, config, migration, removals, deployment).

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

- Run from project root.
- Prerequisites: `gh` CLI, `gh auth status`.
- **Branch must be pushed** for the PR to exist or to update the correct branch. Push first (e.g. with **gh-pull** or manually) if needed.
- This skill does not add, commit, push, sync, or build. Use **gh-pull** to sync with main/upstream and get tests passing; use **gh-pr-review** to address comments and failed checks.
