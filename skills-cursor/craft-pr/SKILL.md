---
name: craft-pr
description: >-
  Create or update pull requests with gh CLI. Does not modify source code.
---

# Craft PR

Create or update PRs with the GitHub CLI. Do not modify source code—only PR title and body. Embed the description in the gh command; do not create `PR_DESCRIPTION.md`.

## Prerequisites

| Check | Command | Install if missing |
|-------|---------|--------------------|
| Git repo | `git rev-parse --git-dir 2>/dev/null` | Must be in a git repo |
| gh CLI | `gh --version` | `brew install gh` |
| gh auth | `gh auth status` | `gh auth login` |

## Workflow

1. Run prerequisites. Stop if any fail.
2. Get context from user message or branch name.
3. Use current branch: `$(git branch --show-current)`. Target base: `main`.
4. Check existing PR: `gh pr list --head $BRANCH --base main`
5. Gather changes: `git diff main...HEAD --stat`
6. Build title and body. Pass directly to gh:
   - Create: `gh pr create --base main --head $BRANCH --title "..." --body "..."`
   - Update: `gh pr edit --body "..."`

## Title format

`[TICKET] Summary` or `Summary of changes`—use ticket prefix if user provides one.
