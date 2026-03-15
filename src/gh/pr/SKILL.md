---
name: gh-pr
description: >-
  Create or update PR with gh CLI. Use when user wants to create a PR, open a
  PR, or update PR body. Does not modify source code.
---

# Create PR

Create or update PRs with GitHub CLI. Target base: `main`. Do not modify source code.

## Prerequisites

Git repo, `gh` CLI, `gh auth status`. Install: `brew install gh`, `gh auth login`

## Workflow

1. `BRANCH=$(git branch --show-current)`
2. `gh pr list --head $BRANCH --base main` — check existing
3. `git diff main...HEAD --stat` — gather changes
4. Create: `gh pr create --base main --head $BRANCH --title "..." --body "..."`
5. Update: `gh pr edit --body "..."`

## Title

One-line summary from changes (e.g. "Add X", "Fix Y")
