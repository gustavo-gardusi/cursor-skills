---
name: gh-push
description: >-
  Ensure existing code works (format, lint, test), documentation is up to date,
  then a summarized commit and push to the current branch.
---

# Push

**Responsibility:** Before pushing: (1) run checks so **existing code works**, (2) bring **documentation up to date** with the repo, then (3) a **summarized commit message** and **push to the current branch**. Use when finishing local work and pushing with code and docs in good shape.

## On invoke

Start immediately. Run steps in order. Stop if any check fails; do not commit or push until checks pass and docs are updated.

## Workflow

### 1. Ensure existing code works

Run the checks the project expects. Prefer project-defined commands; otherwise use language-specific format, lint, and test.

- **Prefer:** `make check`, `make test`, `npm run check`, `npm run validate`, `pnpm run check`, `cargo check`, `go test ./...`, etc. (from root).
- **Else detect project** and run the matching steps:
  - `package.json` / Node → format, lint, test
  - `Cargo.toml` → Rust
  - `pyproject.toml` / `setup.py` → Python
  - `go.mod` → Go
- **Stop** if any step fails. Report the failure; do not proceed.

### 2. Documentation up to date

Compare README (and any other main docs) to the current repo. Apply minimal edits so documentation accurately describes the project.

- **Lists** (e.g. skills, features, modules) — Match what exists on disk; add, remove, or fix rows.
- **Setup / usage** — Update if scripts, commands, or paths changed.
- **Structure** — Adjust if the doc describes dirs or key files that no longer match.
- Only change what is wrong or outdated; no style-only rewrites.

### 3. Summarized commit and push to current branch

- **Clean temp dirs** — Remove any temporary output dirs that should not be committed (e.g. temp dirs from url fetch/crawl runs). Use a random temp path for any one-off output during this run, then delete it so the working tree has no leftover temp dirs.
- **Stage** — `git add .` (or stage relevant paths if the user prefers).
- **Message** — One short line summarizing the change (e.g. from `git diff --stat` or a brief summary).
- **Commit** — `git commit -m "<summary>"`.
- **Push** — `git push` (push to the current branch’s upstream).

## Notes

- Run from the repo root.
- If the tree is clean and docs are already accurate, step 2 may be a no-op.
- **Split:** Checks + commit + push only (no doc updates) → **code-ship**. After push, to open or update a PR → **gh-pr**.
