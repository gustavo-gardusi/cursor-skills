---
name: gh-branch
description: >-
  Start a new branch from main named from a ticket (Jira, GH issue) or activity.
  Expect context: Jira key, issue number/URL, or short instruction.
---

# Start branch

**Responsibility:** Create a new branch from **main** with a name derived from the user's context: a **Jira ticket**, a **GitHub issue**, or an **activity/task description**. Does not create a PR or push other branches—only ensures main is up to date, creates the new branch, and optionally pushes it.

**Expected context (one of):**
- **Jira** — Ticket key (e.g. `TIS-503`, `PROJ-123`) or link. Branch name: lowercase with hyphen, e.g. `tis-503`, `proj-123`, or `tis-503-short-description` if a short description is given.
- **GitHub issue** — Issue number or URL (e.g. `#42`, `https://github.com/owner/repo/issues/42`). Branch name: `42` or `42-short-slug` (e.g. `42-fix-login`) from the issue title if available.
- **Activity / instruction** — Short phrase (e.g. "add user login", "refactor auth"). Branch name: **kebab-case** slug, e.g. `add-user-login`, `refactor-auth`. No spaces; keep it short.

## On invoke

Start immediately. Run commands one by one. If the user did not give a ticket, issue, or activity, ask: "What's the Jira ticket, GitHub issue, or activity for this branch?" Then derive the branch name and create the branch from main.

## Workflow

1. **Get context** — From the user message, identify:
   - **Jira:** Key like `PROJ-123` or URL. Normalize to lowercase-hyphen: `proj-123`. Optionally append a short slug from the ticket title/description (e.g. `proj-123-add-login`).
   - **GitHub issue:** Number (`#42` or `42`) or issue URL. Fetch title if possible: `gh issue view 42 --json title -q .title` (in the repo) and derive a slug (e.g. `42-fix-login`). Else use `42` or `issue-42`.
   - **Activity:** Free-form phrase. Convert to **kebab-case**, lowercase, no special chars: e.g. "Add user login" → `add-user-login`. Keep under ~4–5 words when possible.

2. **Branch name** — Set `BRANCH=<derived-name>`. Must be a valid git branch name (no spaces, no `..`, no `~^:`). If the derived name is empty or invalid, ask the user for a branch name.

3. **Ensure main is current** — `git fetch origin` and `git fetch upstream` if configured. Checkout `main`: `git checkout main`. Update the local base with the canonical source:
   - same-repo: `git merge --ff-only origin/main` (or `git pull origin main`)
   - fork: `git merge --ff-only upstream/main` when upstream is configured and has updates
   Resolve conflicts only if the user asks; otherwise stop and report.

4. **Create branch** — `git checkout -b "$BRANCH"`.

5. **Optional — push and set upstream** — `git push -u origin "$BRANCH"` so the branch exists on the remote. Omit if the user prefers to push later.

6. **Confirm** — Report: "Branch `$BRANCH` created from main. Push with: `git push -u origin $BRANCH`" (if not already pushed).

## Branch name examples

| Context        | Example input     | Branch name      |
|----------------|-------------------|------------------|
| Jira           | TIS-503           | `tis-503`        |
| Jira + desc    | TIS-503 add login | `tis-503-add-login` |
| GH issue       | #42               | `42` or `42-fix-login` (from title) |
| GH issue URL   | …/issues/17       | `17` or `17-refactor-api` |
| Activity       | add user login    | `add-user-login` |
| Activity       | Fix bug in parser | `fix-bug-in-parser` |

## Notes

- Run from the repo root. Prerequisites: `git`; for GH issue title, `gh` and repo context.
- If the working tree is dirty (uncommitted changes), either stash (`git stash`) and pop after creating the branch, or ask the user whether to stash or commit first.
- **Split:** To sync an existing branch with main/upstream, use **gh-pull**. To open a PR for this branch later, use **gh-pr**.
