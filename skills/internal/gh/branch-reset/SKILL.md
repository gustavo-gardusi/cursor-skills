---
name: gh-reset
description: >-
  Internal branch reset guidance: destructive reset/clean only, explicit
  confirmations, and no branch switching.
---

# Reset (internal)

Internal mirror for the public `@gh-reset` boundary.

## Responsibility

- Stay on current branch.
- Never stash in this skill.
- Reset/clean only after explicit confirmation.
- Do not merge/push from this skill.

## Core flow

1. Validate repository and current branch.
2. Fetch remotes and resolve target reference.
3. If dirty tree, force binary choice: keep/abort or trash/align.
4. Run `git clean -fdxn` dry-run and show impact.
5. Confirm hard reset, then execute `git reset --hard "$TARGET"`.
6. Confirm clean, then execute `git clean -fdx` (or `-fd` if keeping ignored files).
7. Verify branch and clean status.

## Notes

- Keep this skill independent from `@gh-main`.
- No browser/script-specific cleanup steps are part of this skill.
