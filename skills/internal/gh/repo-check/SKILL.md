---
name: gh-repo-check
description: >-
  Internal executor for repository/docs health checks and stack-aware
  format/lint/test/build command execution.
---

# Repo Check (internal)

Internal executor for the public `@gh-check` boundary.

## Responsibility

- Own runnable terminal checks for docs consistency and project health.
- Detect available toolchain and execute relevant checks.
- Report pass/fail with blockers and skipped steps.

## Command runbook

### 1) Baseline discovery

```bash
git rev-parse --is-inside-work-tree
```

Inspect repository signals before running checks.

### 2) Docs consistency checks

Validate consistency across:
- `README.md`
- `docs/*.md`
- `skills/README.md`

Use read/search tooling to detect drift in:
- public skill list,
- workflow order,
- storage/boundary rules.

### 3) Stack-aware command matrix

Run only applicable commands:

- Node (`package.json`): format/lint/test/build scripts via package manager
- Python (`pyproject.toml`, `requirements*.txt`): formatter/linter/test commands
- Rust (`Cargo.toml`): `cargo fmt`, `cargo clippy`, `cargo test`
- Go (`go.mod`): `go test ./...` and formatting/lint if configured

### 4) Report

Include:
- checks run,
- checks skipped and why,
- failing commands with actionable blockers.
