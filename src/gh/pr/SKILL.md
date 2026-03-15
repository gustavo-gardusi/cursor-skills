---
name: gh-pr
description: >-
  Create or update PR with gh CLI. Use when user wants to create a PR, open a
  PR, or update PR body. Does not modify source code.
---

# Create PR

Create or update PRs with GitHub CLI. Target base: `main` (same repo). Does not modify source code.

## Prerequisites

Git repo, `gh` CLI, `gh auth status`. Install: `brew install gh`, `gh auth login`

## Workflow

1. `BRANCH=$(git branch --show-current)`
2. `gh pr list --head $BRANCH --base main` — check existing
3. Diff: `git diff main...HEAD --name-status`
4. If PR exists: `gh pr edit <number> --title "..." --body "..."`
5. If none: `gh pr create --base main --head $BRANCH --title "..." --body "..."`

## PR description

Use `git diff main...HEAD --name-status` to categorize. Count A=added, D=deleted, M=modified.

**Structure:**

1. **Summary** — One short paragraph describing the overall changes of the entire PR. What was done and why. No file counts.
2. **New files (N)** — One line per file: `path` — brief description of what it adds.
3. **Deleted files (N)** — One line per file: `path` — brief description. End section with: "Review removals before merging."
4. **Modified (N)** — One line per file: `path` — brief description of changes.

Keep all descriptions brief and direct. Use `path` — `description` format.

**Title:** One-line summary from changes (e.g. "Add X", "Fix Y", "Refactor Z").

**Emoji (optional):** Add emoji where it helps readability. Examples: section headers (✨ New, 🗑️ Deleted, 📝 Modified), title prefix (✨ Refactor..., 🐛 Fix..., 📋 Add...), important notes (⚠️ Review removals before merging). Use sparingly; skip if it feels forced.

## Notes

- Run from project root
- For PR from fork to original repo, use `gh-pr-upstream` instead (same PR body rules, diff base is `upstream/main`)
