---
name: gh-start
description: >-
  Sync main, create a new branch from a ticket or activity,
  and optionally push to remote.
---

# Start (New Branch)

**Cursor skill:** **`@gh-start`** — Invoked with **`@gh-start`** in Cursor. 

**Depends on:**
- **`@gh-main-sync`** (internal utility to clean and sync main)

**Responsibility:** Derive a branch name from a Jira ticket, GitHub issue, or activity; sync `main`; create the new branch.

## Workflow

1. **Get Context**: Identify ticket, issue, or activity from user.
   - Jira: `TIS-503` → `tis-503`
   - GH Issue: `#42` → `42-fix-login`
   - Activity: "add login" → `add-login`

2. **Sync Main**: Run internal utility **`@gh-main-sync`** to ensure local main is up-to-date and clean.

3. **Create Branch**: `git checkout -b "$BRANCH"`

4. **Publish**: Unless user asked not to, run `git push -u origin HEAD` to publish the new branch immediately.

## Branch name examples

| Context        | Example input     | Branch name      |
|----------------|-------------------|------------------|
| Jira           | TIS-503           | `tis-503`        |
| GH issue       | #42               | `42-fix-login`   |
| Activity       | add user login    | `add-user-login` |
