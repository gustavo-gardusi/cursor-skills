---
name: gh-pr-metadata
description: >-
  Internal executor for pull request metadata terminal commands using gh CLI.
---

# PR Metadata (internal)

Internal executor for the public `@gh-pr` boundary.

## Responsibility

- Own runnable terminal commands for PR discovery/create/update.
- Use full `base...HEAD` scope for title/body synthesis.
- Do not push commits in this executor.

## Command runbook

### 1) Preconditions

```bash
BRANCH=$(git branch --show-current)
```

- Stop if current branch is `main`.

### 2) Resolve existing PR for branch

```bash
gh pr view --json number,title,baseRefName,headRefName
```

If this fails for missing PR, prepare create path.

### 3) Build metadata

- Ask whether a PR template is required.
- Build title/body from full diff context (`base...HEAD`) and user/template rules.

### 4) Execute create/update

Update existing PR:

```bash
gh pr edit --title "<title>" --body "<body>"
```

Create new PR:

```bash
gh pr create --title "<title>" --body "<body>"
```

### 5) Report

Return PR URL/number and applied metadata summary.
