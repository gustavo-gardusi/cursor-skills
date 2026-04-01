---
name: gh-publish
description: >-
  Internal executor for commit-and-push terminal commands after repository
  checks pass.
---

# Publish (internal)

Internal executor for the public `@gh-push` boundary.

## Responsibility

- Own runnable terminal commands for status, commit, and push.
- Respect publish safety rules (especially `main` restrictions).
- Do not create or edit PR metadata.

## Command runbook

### 1) Validate branch safety

```bash
BRANCH=$(git branch --show-current)
```

- If `BRANCH` is `main`, require explicit user confirmation before push.

### 2) Inspect working tree

```bash
git status --short
```

- If dirty, stage and commit with an appropriate message.

### 3) Commit when needed

```bash
git add -A
git commit -m "<message>"
```

### 4) Push branch

Use tracking push when needed:

```bash
git push -u origin HEAD
```

Otherwise:

```bash
git push
```

### 5) Verify

```bash
git status --short
```

Report pushed branch and stop.
