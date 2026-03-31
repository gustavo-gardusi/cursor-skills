---
name: gh-pr
description: >-
  Create or update PR metadata by delegating sync/publish/pr terminal steps to
  internal executors.
---

# Create PR

**Cursor skill:** **`@gh-pr`**

## Role

Create or update pull request metadata for current branch.

Terminal command execution is owned by:
- **[`internal/gh/pull-merge`](../../internal/gh/pull-merge/SKILL.md)**
- **[`internal/gh/repo-check`](../../internal/gh/repo-check/SKILL.md)**
- **[`internal/gh/publish`](../../internal/gh/publish/SKILL.md)**
- **[`internal/gh/pr-metadata`](../../internal/gh/pr-metadata/SKILL.md)**

## Workflow

1. Delegate sync/merge terminal steps to **[`internal/gh/pull-merge`](../../internal/gh/pull-merge/SKILL.md)**.
2. Delegate check + publish terminal steps to **[`internal/gh/repo-check`](../../internal/gh/repo-check/SKILL.md)** and **[`internal/gh/publish`](../../internal/gh/publish/SKILL.md)**.
3. Resolve existing PR by current head/base.
4. Prompt user: "Is there a PR template we should follow?" and collect any required headings/format.
5. Build title/body from full `base...HEAD` delta, applying the template when provided.
6. Delegate PR create/update command execution to **[`internal/gh/pr-metadata`](../../internal/gh/pr-metadata/SKILL.md)**.

## Preconditions

- Stop if current branch is `main`; create a feature branch first.

## Quality Rules

- Use full branch scope, not only latest commit.
- Keep title plain text.
- Avoid repeating compare metadata already shown by GitHub UI.

## Next Skill

- For iteration: **[`@gh-pull`](../pull/SKILL.md)** then **[`@gh-push`](../push/SKILL.md)** again

If blocked by template uncertainty, pause and ask the user to confirm the required PR format.
