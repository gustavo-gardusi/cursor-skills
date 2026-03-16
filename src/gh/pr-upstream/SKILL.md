---
name: gh-pr-upstream
description: >-
  Create PR from fork to original repo. Merges upstream main first, resolves
  conflicts, pushes, then opens PR. Use when contributing to upstream or
  submitting changes from a fork.
---

# PR to upstream

Create PR from fork to original repo. Merge upstream main, resolve conflicts, push, create PR.

## On invoke

Start immediately. Run commands one by one. Do not summarize.

## Workflow

1. **Upstream** — Use configured `upstream` remote. Check: `git remote get-url upstream`. If missing: try `gh repo view --json parent -q .parent` to get upstream URL and add it (`git remote add upstream <url>`). If no upstream and parent is null, stop and ask user for upstream repo.
2. **Add, commit, push** — `BRANCH=$(git branch --show-current)`. `git add .` (or `git add -A`). Build commit message from `git diff --cached --stat` or `git diff --stat` (one-line summary: "Add X", "Fix Y", "Refactor Z"). `git commit -m "..."` (skip if nothing to commit). `git push origin $BRANCH`. Ensures any uncommitted changes are committed and pushed before opening the PR.
3. **Merge** — `git fetch upstream`, `git merge upstream/main`, resolve conflicts
4. **Push** — `git push origin $BRANCH`
5. **PR** — Parse `UPSTREAM` from `git remote get-url upstream` (e.g. `https://github.com/gardusig/cursor-skills.git` → `gardusig/cursor-skills`). `FORK_OWNER` = origin owner (`gh repo view --json owner -q .owner.login` or parse from `git remote get-url origin`). Check: `gh pr list --repo $UPSTREAM --head $FORK_OWNER:$BRANCH`. If PR exists: `gh pr edit <number> --repo $UPSTREAM --title "..." --body "..."`. If none: `gh pr create --repo $UPSTREAM --base main --head $FORK_OWNER:$BRANCH --title "..." --body "..."`. Diff: `git diff upstream/main...HEAD`

## PR description

Use `git diff upstream/main...HEAD --name-status` to categorize. Count A=added, D=deleted, M=modified.

**Structure:**

1. **Summary** — One short paragraph describing the overall changes of the entire PR. What was done and why. No file counts.
2. **New files (N)** — File-tree style with **nested lists** (markdown `-` and indented `-`). Group by directory: one top-level `- dir/` per folder, then under it nested `- path` — brief description. If a folder has many files, add sub-groups (e.g. `frontend/src/components/` with nested items). Root-level files stay as top-level `- path` — description.
3. **Deleted files (N)** — Same nested list style by directory. End section with: "Review removals before merging."
4. **Modified (N)** — Same nested list style by directory: group by top-level (or common) path, nested `- path` — brief description.

**Format:** Use `path` — `description` for each file. Keep descriptions brief. Example:

```markdown
## New files
- backend/
  - README.md — Backend quick reference
  - src/main/java/.../DeckRules.java — Deck validation rules
- frontend/
  - src/components/CardDetailModal.jsx — Card detail modal
  - src/constants/cardImages.js — Card UI constants
- docs/
  - SETUP_AND_TESTS.md — Setup and run app
  - screenshots/cards-page.png — UI screenshot
- data/cards.csv — Sample card data
```

**Title:** One-line summary from changes (e.g. "Refactor to src/ layout, add install script").

**Emoji (optional):** Add emoji where it helps readability. Examples: section headers (✨ New, 🗑️ Deleted, 📝 Modified), title prefix (✨ Refactor..., 🐛 Fix..., 📋 Add...), important notes (⚠️ Review removals before merging). Use sparingly; skip if it feels forced.

## Notes

- To abort merge: `git merge --abort`
- Run from project root
- For PR within same repo (branch → main), use `gh-pr` instead (same PR body rules, diff base is `main`)
