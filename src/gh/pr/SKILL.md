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
3. Diff: `git diff main...HEAD`
4. Create: `gh pr create --base main --head $BRANCH --title "..." --body "..."`
5. Update: `gh pr edit --body "..."`

## PR description

Build a meaningful body from the diff. Use `git diff main...HEAD --name-status` to categorize:

**Structure:**

1. **Summary** — One short paragraph: total files changed, counts of added/deleted/modified. Call out notable additions or removals.
2. **New files** — List paths. Brief note per file or per group.
3. **Deleted files** — List paths. Add a note: "Review removals before merging."
4. **Modified** — List paths. One-line summary per file or per logical group.

**Title:** One-line summary from changes (e.g. "Add X", "Fix Y", "Refactor Z").

## Notes

- Run from project root
- For PR from fork to original repo, use `gh-pr-upstream` instead (same PR body rules, diff base is `upstream/main`)
