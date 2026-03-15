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

1. **Upstream** — `gh repo view --json parent -q .parent`. If null, stop. Add upstream if missing.
2. **Merge** — `BRANCH=$(git branch --show-current)`, `git fetch upstream`, `git merge upstream/main`, resolve conflicts
3. **Push** — `git push origin $BRANCH`
4. **PR** — `UPSTREAM` = upstream remote (parse `git remote get-url upstream` → `owner/repo`). `FORK_OWNER` = origin owner (`gh repo view --json owner -q .owner.login`). Check: `gh pr list --repo $UPSTREAM --head $FORK_OWNER:$BRANCH`. If PR exists: `gh pr edit <number> --repo $UPSTREAM --title "..." --body "..."`. If none: `gh pr create --repo $UPSTREAM --base main --head $FORK_OWNER:$BRANCH --title "..." --body "..."`. Diff: `git diff upstream/main...HEAD`

## PR description

Use `git diff upstream/main...HEAD --name-status` to categorize. Count A=added, D=deleted, M=modified.

**Structure:**

1. **Summary** — One short paragraph describing the overall changes of the entire PR. What was done and why. No file counts.
2. **New files (N)** — One line per file: `path` — brief description of what it adds.
3. **Deleted files (N)** — One line per file: `path` — brief description. End section with: "Review removals before merging."
4. **Modified (N)** — One line per file: `path` — brief description of changes.

Keep all descriptions brief and direct. Use `path` — `description` format.

**Title:** One-line summary from changes (e.g. "Refactor to src/ layout, add install script").

**Emoji (optional):** Add emoji where it helps readability. Examples: section headers (✨ New, 🗑️ Deleted, 📝 Modified), title prefix (✨ Refactor..., 🐛 Fix..., 📋 Add...), important notes (⚠️ Review removals before merging). Use sparingly; skip if it feels forced.

## Notes

- To abort merge: `git merge --abort`
- Run from project root
- For PR within same repo (branch → main), use `gh-pr` instead (same PR body rules, diff base is `main`)
