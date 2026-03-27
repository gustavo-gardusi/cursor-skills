---
name: gh-main
description: >-
  Internal guidance for moving to main and integrating canonical main without
  destructive reset/clean.
---

# Main Sync (internal)

This internal document mirrors the public **`@gh-main`** boundary.

## Ownership split
- `@gh-main`: switch to `main`, fetch remotes, integrate canonical `main`, resolve conflicts.
- `@gh-reset`: destructive reset/clean only when explicitly requested.
- `@gh-push`: publish only.

## Internal flow
1. Validate repo.
2. Checkout local `main` (create from `origin/main` if needed).
3. Fetch `origin` and `upstream` when available.
4. Choose canonical `main` (`upstream/main` else `origin/main`).
5. Merge canonical `main` into local `main` (prefer ff-only, resolve conflicts if required).
6. Verify branch and merge state.

No reset/clean commands are part of this internal main-sync guidance.
