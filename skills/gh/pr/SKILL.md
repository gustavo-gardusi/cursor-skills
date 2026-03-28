---
name: gh-pr
description: >-
  Create or update PR metadata after sync/publish chain. Runs gh-pull then gh-push,
  then applies PR title/body with gh CLI.
---

# Create PR

**Cursor skill:** **`@gh-pr`**

## Role

Create or update pull request metadata for current branch.

## Workflow

1. Run full **[`@gh-pull`](../pull/SKILL.md)**.
2. Run full **[`@gh-push`](../push/SKILL.md)**.
3. Resolve existing PR by current head/base.
4. Prompt user: "Is there a PR template we should follow?" and collect any required headings/format.
5. Build title/body from full `base...HEAD` delta, applying the template when provided.
6. `gh pr edit` (if exists) or `gh pr create` (if not).

## Preconditions

- Stop if current branch is `main`; create a feature branch first.

## Quality Rules

- Use full branch scope, not only latest commit.
- Keep title plain text.
- Avoid repeating compare metadata already shown by GitHub UI.

## Next Skill

- For iteration: **[`@gh-pull`](../pull/SKILL.md)** then **[`@gh-push`](../push/SKILL.md)** again

If blocked by template uncertainty, pause and ask the user to confirm the required PR format.
