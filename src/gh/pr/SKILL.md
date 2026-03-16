---
name: gh-pr
description: >-
  Sync build, format & test, commit & push, then create or update PR. Fork:
  on main → PR to upstream; on branch → PR to upstream. Same repo: PR to main.
---

# PR

Sync build (branch + main + upstream), run format & test, commit & push, then open or update the right PR. **Fork (upstream exists):** on main → PR from fork main to upstream main; on branch → PR from fork branch to upstream main. **Same repo:** on branch → PR to main. On main with no upstream → push only.

## On invoke

Start immediately. Run commands one by one. Do not summarize.

## Workflow

1. **Branch & upstream** — `BRANCH=$(git branch --show-current)`. Check upstream: `git remote get-url upstream`; if missing, `gh repo view --json parent -q '.parent.owner.login + "/" + .parent.name'` and add with `git remote add upstream https://github.com/<parent>.git` (if no parent, no upstream). So we know: **fork** (upstream exists) vs **same repo** (no upstream).

2. **Sync build** — Working tree includes current branch + main + upstream when applicable.
   - `git fetch origin`
   - Merge from origin: `git merge origin/$BRANCH` (skip if branch has no remote).
   - If `$BRANCH` is not `main`: `git merge origin/main`.
   - If upstream exists: `git fetch upstream`, `git merge upstream/main`.
   - Resolve conflicts. Do not push yet.

3. **Format & test** — Inspect repo for format and test (`.github/workflows`, `package.json`, `Makefile`, etc.). Run **format** then **test** if present. Fix or note failures.

4. **Add, commit, push** — `git add .` (or `git add -A`). Commit message from `git diff --stat`: one-line. `git commit -m "..."` (skip if nothing to commit). `git push origin $BRANCH`.

5. **PR** — Only skip if same repo and on main (no upstream).
   - **Same repo, on branch:** Diff `main...HEAD`. `gh pr list --head $BRANCH --base main`. If exists: edit; else create. Base main, head $BRANCH.
   - **Fork, on main:** Create/update PR from fork main to upstream main. Parse `UPSTREAM` from `git remote get-url upstream` (e.g. `owner/repo`). `FORK_OWNER` = origin owner (`gh repo view --json owner -q .owner.login` or parse origin URL). Diff: `git diff upstream/main...HEAD --name-status`. `gh pr list --repo $UPSTREAM --head $FORK_OWNER:main`. If exists: `gh pr edit <number> --repo $UPSTREAM --title "..." --body "..."`. Else: `gh pr create --repo $UPSTREAM --base main --head $FORK_OWNER:main --title "..." --body "..."`.
   - **Fork, on branch:** Same as fork on main but head is `$FORK_OWNER:$BRANCH`. Diff `upstream/main...HEAD`. `gh pr list --repo $UPSTREAM --head $FORK_OWNER:$BRANCH`. Edit or create.

If nothing to commit and nothing to push and we didn’t open/update a PR: say "Changes were already pushed."

## PR description

Use diff (`main...HEAD` or `upstream/main...HEAD`) with `--name-status`.

**Title:** One line, no emojis (plain text only).

**Body:** Bullets/tables. Short phrases; focus on **relevant changes** and **affected files**. Include **Review:** performance, memory/space, integrations when relevant. Emojis in the body are fine (e.g. ✨ Summary, 📁 Changes, 🔍 Review)—use freely where they help.

## Notes

- Run from project root. Abort merge: `git merge --abort`
- Prerequisites: `gh` CLI, `gh auth status`
