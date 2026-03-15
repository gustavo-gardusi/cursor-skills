---
name: ship
description: >-
  Run format, lint, test, then add, commit, push. Use when user wants to ship
  changes, push after checks, or deploy after validation.
---

# Ship

Run format, lint, and test (detect by project type). If all pass, add, commit, push.

## On invoke

Start immediately. Run commands one by one. Stop if any check fails.

## Workflow

1. **Format** — format-js, format-rust, format-python, or format-go
2. **Lint** — lint-js, lint-rust, lint-python, or lint-go
3. **Test** — test-js, test-rust, test-python, or test-go
4. **Commit** — `git add .`, build message from `git diff --stat`, `git commit -m "..."`, `git push`

Skip format/lint/test if not configured for project.

## Shortcut

- `make check` or `make test`
- `npm run check` or `npm run validate`

## Notes

- Run from project root
- Detect project: package.json → js, Cargo.toml → rust, pyproject.toml → python, go.mod → go
