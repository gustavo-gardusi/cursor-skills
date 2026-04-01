# Testing Notes

This repository is markdown-first and does not include script-based test tooling.

## Recommended validation checklist

For skill changes, validate manually:

1. Frontmatter is present in each `SKILL.md` (`name`, `description`).
2. Linked skill paths are valid.
3. Public workflow boundaries are consistent:
   - `@gh-check` has no git operations.
   - `@gh-main` does not own reset/clean.
   - `@gh-reset` owns reset/clean.
   - `@gh-push` owns push.
4. Context skills only reference local `.cursor/` storage (`research-context.json`, `research-plan.md`).
5. `@context-execute` explicitly requires Plan mode confirmation, then Agent mode execution.
6. Installation still works with `./install.sh`.

## Smoke-test workflow

- Install: `./install.sh`
- Verify skills appear in Cursor picker
- Run basic flow in a test repository:
  - `@gh-check`
  - `@gh-main`
  - `@gh-reset` (only when destructive behavior is explicitly intended)
  - `@context-add` -> `@context-show` -> `@context-plan` -> `@context-execute`

## CI note

Script-based CI/config was removed with the Node/script runtime footprint.
If automated checks are added back later, they should match the markdown-only architecture.
