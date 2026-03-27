---
name: gh-check
description: >-
  Repository health check only: discover stack, pre-check dependencies, install
  deps/build as needed, then run format/lint/test.
---

# Check (discover -> pre-check -> prepare -> evaluate)

**Cursor skill:** **`@gh-check`**

This skill is for repository health checks only:
- discover what the repo expects
- pre-check required tools are installed
- prepare dependencies/build
- evaluate with format/lint/test

## Invariant (strict)

`@gh-check` does not run git operations.
- No branch or remote commands
- No staging or commit commands
- No pull/merge/reset/clean commands
- No push commands

If the user asks for publish actions, hand off to **`@gh-push`**.

## On invoke

Run from repo root (or a user-scoped subproject root in a monorepo).

## Workflow

### 1) Discover

Read docs first, then config:
- `README.md`, `README.rst`, `CONTRIBUTING.md`, `docs/` entries
- per-package READMEs when the repo points to nested projects

Infer stacks and check tooling from configuration:
- Node/TS: `package.json`, lockfiles, eslint/prettier/vitest/jest config
- Python: `pyproject.toml`, `requirements*.txt`, `poetry.lock`, ruff/flake8 config
- Rust: `Cargo.toml`, `Cargo.lock`, `rust-toolchain.toml`
- Go: `go.mod`, `go.sum`
- others: relevant build/test/lint config files

Use this precedence when selecting commands:
1. README explicit commands
2. CI workflow commands
3. task runner / package script commands
4. conservative defaults

### 2) Pre-check required dependencies

Before install or tests, verify required executables exist for the detected stack.

Examples:
- package managers: `npm`, `pnpm`, `yarn`, `pip`, `uv`, `poetry`, `cargo`, `go`
- linters/formatters/test tools expected by the repo

If tools are missing:
- stop early
- report exactly what is missing
- provide the shortest clear remediation for the user environment

### 3) Prepare (install/build)

Install dependencies in README order. If not documented, use minimal lockfile-first setup.

Examples:
- Node: `npm ci` / `pnpm install --frozen-lockfile` / `yarn install --frozen-lockfile`
- Python: `uv sync` / `poetry install` / `pip install -r requirements.txt`
- Rust: `cargo fetch` or `cargo build` when required for lint/test
- Go: `go mod download`

Avoid destructive cleanup. If a cleanup step appears necessary, stop and ask first.

### 4) Evaluate

#### 4a) Umbrella command first (if repo defines one)
If README/CI defines a single check entrypoint (for example `make check`), run it first.

If that passes and clearly covers format/lint/test, do not duplicate lower-level checks unless README/CI requires parity steps.

#### 4b) Format
Run stack-appropriate format checks when configured.

#### 4c) Lint
Run stack-appropriate lint checks when configured.

#### 4d) Test
Run the primary test commands for detected stacks.

### 5) Report

Summarize:
- what was inferred (stacks and key files)
- what was prepared (installs/builds)
- what was evaluated (format/lint/test), with pass/fail
- what blocked execution, if any

## Verification checklist

- [ ] Discovery covered docs + config (and CI when present)
- [ ] Pre-check validated required executables before install/evaluate
- [ ] Prepare completed using repo-declared commands where available
- [ ] Evaluate ran relevant format/lint/test checks for detected stacks
- [ ] No git command was executed as part of `@gh-check`
