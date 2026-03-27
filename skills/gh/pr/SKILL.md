---
name: gh-pr
description: >-
  Publish branch through gh-push, then create or update PR metadata from branch
  diff against base.
---

# PR

**Cursor skill:** **`@gh-pr`**

## Unique ownership

- `@gh-pr` owns PR create/update metadata.
- `@gh-push` owns verify/commit/push before PR operations.
- `@gh-check` stays verify-only and is not duplicated here.
- Reset/clean behavior is owned only by `@gh-reset`.

## Workflow

1. **Publish branch first**: Run full **[`@gh-push`](../push/SKILL.md)**.
2. **Resolve existing open PR**: Check whether a PR already exists for current head branch.
3. **Choose base and diff**: Resolve base (`main` or canonical repo base), inspect `base...HEAD`.
4. **Write PR content**: Generate title/body from real branch delta.
5. **Create or edit PR**:
   - existing PR: `gh pr edit`
   - no existing PR: `gh pr create`

## PR Description Format

### Structure
1. **Summary** — concise bullets focused on behavior and reviewer impact.
2. **Impact** — optional, when behavior/runtime implications exist.
3. **Test plan** — how reviewer can validate.

### Rules
- Keep title plain text.
- Keep body focused on intent and externally visible changes.
