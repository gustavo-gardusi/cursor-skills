---
name: code-ship
description: >-
  Run format, lint, test, then add, commit, push. Use when user wants to ship
  changes, push after checks, or deploy after validation.
---

# Ship

Run format, lint, and test (detect by project type). If all pass, add, commit, push.

## On invoke

Start immediately. Run commands one by one. Stop if any check fails.

## Workflow

1. **Format** — code-format-js, code-format-rust, code-format-python, or code-format-go
2. **Lint** — code-lint-js, code-lint-rust, code-lint-python, or code-lint-go
3. **Test** — code-test-js, code-test-rust, code-test-python, or code-test-go
4. **Commit** — `git add .`, build message from `git diff --stat`, `git commit -m "..."`, `git push`

Skip format/lint/test if not configured for project.

## Shortcut

- `make check` or `make test`
- `npm run check` or `npm run validate`

## Notes

- Run from project root
- Detect project: package.json → js, Cargo.toml → rust, pyproject.toml → python, go.mod → go
