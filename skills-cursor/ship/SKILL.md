---
name: ship
description: >-
  Run linter/checker, then add, commit, and push. Use when the user wants to
  ship changes, push after checks, commit and push, or deploy current changes
  after validation.
---

# Ship changes

Run format, lint, and tests. If all pass, add all changes, commit with a message, and push. Stop if any check fails.

## On invoke

**Start immediately.** Run the first check right away. Use the Shell tool. Run one command, observe the result, then run the next. Do not summarize—execute.

## Workflow

Run each step in sequence. Stop if any step fails.

**Shortcut:** If the project has a single check command, run it first:
- `make check` or `make lint` or `make test`
- `npm run check` or `npm run validate` (check package.json scripts)
- `./scripts/check.sh` or `./scripts/lint.sh`

If that succeeds, skip to step 4. If it fails, stop.

### 1. Format

Detect and run the project formatter (see format-code skill). Common commands:
- Prettier: `npx prettier --write .` or `pnpm exec prettier --write .`
- Rust: `cargo fmt`
- Python: `black .` or `ruff format .`
- Go: `go fmt ./...`

If no formatter is configured, skip.

### 2. Lint

Detect and run the project linter:
- Node: `npm run lint` or `yarn lint` or `pnpm lint` (check package.json scripts)
- ESLint: `npx eslint .` if eslint in package.json
- Rust: `cargo clippy`
- Python: `ruff check .` or `flake8 .`
- Go: `go vet ./...`
- Make: `make lint` or `make check`

If no linter is configured, skip.

### 3. Test

Run the project test suite (see run-tests skill):
- Node: `npm test` or `pnpm test`
- Rust: `cargo test`
- Python: `pytest` or `python -m pytest`
- Go: `go test ./...`
- Make: `make test`

If no test runner is configured, skip.

### 4. Add, commit, push

If all checks passed:

1. `git status` — see what changed
2. `git add .` (or `git add -A`)
3. **Commit message** — Use user-provided message if given. Else build from changes:
   - `git diff --cached --stat` or `git diff --stat` before add
   - One-line summary: e.g. "Format and lint", "Fix X", "Add Y"
   - Use `[TICKET] Summary` if user provides a ticket
4. `git commit -m "message"`
5. `git push`

## Notes

- Run from project root
- If format modifies files, those changes are included in the commit
- To skip checks and just commit/push, use craft-pr or manual git
- Prefer project scripts (npm run lint) over raw tools when available
