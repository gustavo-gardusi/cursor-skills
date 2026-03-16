---
name: gh-pr
description: >-
  Single PR skill. Sync build (current branch + main + upstream), run format &
  test, commit & push, then create or update PR. On main: push or say already
  pushed.
---

# PR

One workflow: ensure build is up to date, run format & test, commit & push, then open or update the PR. Same repo → branch to main. Fork → branch to upstream main. On main → push or report already pushed.

## On invoke

Start immediately. Run commands one by one. Do not summarize.

## Workflow

1. **Branch** — `BRANCH=$(git branch --show-current)`. If `BRANCH` is `main`: if uncommitted or unpushed changes, do steps 2–4 (sync, format/test, add/commit/push), then say "Pushed to main." If nothing to do: say "Changes were already pushed." Stop. Otherwise continue.

2. **Sync build** — Ensure working tree has everything from current branch and, where applicable, main and upstream.
   - `git fetch origin`
   - Merge current branch from origin: `git merge origin/$BRANCH` (skip if branch has no remote).
   - If `$BRANCH` is not `main`: `git merge origin/main`.
   - If upstream exists: `git remote get-url upstream`; if missing, try `gh repo view --json parent -q '.parent.owner.login + "/" + .parent.name'` and `git remote add upstream ...`; if upstream exists: `git fetch upstream`, `git merge upstream/main`.
   - Resolve conflicts. Do not push yet.

3. **Format & test** — Inspect repo for format and test (e.g. `.github/workflows/*.yml`, `package.json`, `Makefile`, `Cargo.toml`, `pyproject.toml`, `go.mod`). Run **format** (or lint/format) then **test** if present. Fix or note failures before proceeding.

4. **Add, commit, push** — `git add .` (or `git add -A`). Commit message from `git diff --stat`: one-line ("Add X", "Fix Y", "Refactor Z"). `git commit -m "..."` (skip if nothing to commit). `git push origin $BRANCH`.

5. **PR** — **Same repo (no upstream):** Diff: `git diff main...HEAD --name-status`. `gh pr list --head $BRANCH --base main`. If exists: `gh pr edit <number> --title "..." --body "..."`. Else: `gh pr create --base main --head $BRANCH --title "..." --body "..."`. **Fork (upstream exists):** Parse `UPSTREAM` (owner/repo), `FORK_OWNER` (origin owner). Diff: `git diff upstream/main...HEAD --name-status`. `gh pr list --repo $UPSTREAM --head $FORK_OWNER:$BRANCH`. If exists: edit; else create. Done.

## PR description

Use diff (`main...HEAD` or `upstream/main...HEAD`) with `--name-status`. Use **emoji** for sections. Prefer **bullets** and **tables**. Short phrases; focus on **relevant changes** and **affected files**. Include a **Review** section.

**Structure:**

1. **Summary** — One short paragraph. What and why. No file counts.
2. **Changes** — Tables or bullets by type (Added, Modified, Removed). One line per file or scope. End removals with ⚠️ *Review removals before merging.*
3. **Review** — When relevant: **Performance / time** · **Memory / space** · **Integrations** (new services, APIs, deps).

**Format:** Emoji headers (✨ Summary, 📁 Changes, 🔍 Review). Tables for path vs note. One line per change where possible.

**Title:** One line, emoji optional (e.g. "✨ Refactor parser, add tests").

## Notes

- Run from project root. Abort merge: `git merge --abort`
- Prerequisites: `gh` CLI, `gh auth status`
